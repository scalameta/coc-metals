import { detechLauncConfigurationChanges } from "./activationUtils"
import { Commands } from './commands'
import {getJavaHome, getJavaOptions} from "./javaUtils"
import {ExecuteClientCommand} from "./protocol"
import {
  dottyIdeArtifact,
  migrateStringSettingToArray,
  trackDownloadProgress,
  checkServerVersion
} from "./utils"
import { exec } from "child_process"
import {
  commands,
  ExtensionContext,
  LanguageClient,
  LanguageClientOptions,
  RevealOutputChannelOn,
  ServerOptions,
  workspace
} from "coc.nvim"
import {spawn} from "promisify-child-process"
import {
  ExitNotification,
  ExecuteCommandRequest,
  Location,
  Range,
  ShutdownRequest,
  ExecuteCommandParams
} from "vscode-languageserver-protocol"

import * as fs from "fs"
import * as path from "path"

// let client: any

export async function activate(context: ExtensionContext) {
  detechLauncConfigurationChanges()
  checkServerVersion()

  getJavaHome()
    .then(javaHome => fetchAndLaunchMetals(context, javaHome))
    .catch(err => {
      const message =
        `${err.stack}\n` +
        "Unable to find a Java 8 or Java 11 installation on this computer. " +
        "To fix this problem, update the 'Java Home' setting to point to a Java 8 or Java 11 home directory"
      const openSettings = "Open Settings"
      const ignore = "Ignore for now"
      workspace.showQuickpick([openSettings, ignore], message)
        .then(choice => {
          if (choice === 0) {
            workspace.nvim.command(Commands.OPEN_COC_CONFIG, true)
            // TODO if we are here the server isn't running which
            // means I'm not 100% sure if changing the coc-config
            // will trigger a restart or not
          }
        })
    })
}


function fetchAndLaunchMetals(context: ExtensionContext, javaHome: string) {

  const dottyArtifact = dottyIdeArtifact()
  if (dottyArtifact && fs.existsSync(dottyArtifact)) {
    // TODO replace the reload window command with the coc-equivelant later
    workspace.showMessage(
      `Metals will not start since Dotty is enabled for this workspace. ` +
      `To enable Metals, remove the file ${dottyArtifact} and run ':CocCommand metals.restartServer'`,
      "warning"
    )
    return
  }

  const javaPath = path.join(javaHome, "bin", "java")
  const coursierPath = path.join(context.extensionPath, "./coursier")

  const config = workspace.getConfiguration("metals")
  const serverVersionConfig: string = config.get<string>("serverVersion")
  const defaultServerVersion = config.inspect<string>("serverVersion")!.defaultValue!
  const serverVersion = serverVersionConfig
    ? serverVersionConfig
    : defaultServerVersion

  migrateStringSettingToArray("serverProperties")
  migrateStringSettingToArray("customRepositories")

  const serverProperties: string[] = workspace
    .getConfiguration("metals")
    .get<string[]>("serverProperties")!

  const javaOptions = getJavaOptions()

  const fetchProperties: string[] = serverProperties.filter(
    p => !p.startsWith("-agentlib")
  )

  if (fetchProperties.length > 0) {
    workspace.showMessage(
      `Additional server properties detected: ${fetchProperties.join(", ")}`
    )
  }

  const customRepositories: string = config
    .get<string[]>("customRepositories")!
    .join("|")
  
  if (customRepositories.indexOf("|") !== -1) {
    workspace.showMessage(
      `Custom repositories detected: ${customRepositories}`
    )
  }

  const customRepositoriesEnv =
    customRepositories.length == 0
      ? {}
      : { COURSIER_REPOSITORIES: customRepositories }

  // TODO explain what all of these flags are
  const fetchProcess = spawn(
    javaPath,
    javaOptions.concat(fetchProperties).concat([
      "-jar",
      coursierPath,
      "fetch",
      "-p",
      "--ttl",
      // Use infinite ttl to avoid redunant "Checking..." logs when using SNAPSHOT
      // versions. Metals SNAPSHOT releases are effectively immutable since we
      // never publish the same version twice.
      "Inf",
      `org.scalameta:metals_2.12:${serverVersion}`,
      "-r",
      "bintray:scalacenter/releases",
      "-r",
      "sonatype:public",
      "-r",
      "sonatype:snapshots",
      "-p"
    ]),
    {
      env: {
        COURSIER_NO_TERM: "true",
        ...customRepositoriesEnv,
        ...process.env
      }
    }
  )

  trackDownloadProgress(fetchProcess)
    .then(classpath => {
      launchMetals(
        context,
        javaPath,
        classpath,
        serverProperties,
        javaOptions
      )
    },
    () => {
      const msg = (() => {
        const proxy =
          `See https://scalameta.org/metals/docs/editors/vscode.html#http-proxy for instructions ` +
          `if you are using an HTTP proxy.`
        if (process.env.FLATPAK_SANDBOX_DIR) {
          return (
            `Failed to download Metals. It seems you are running Visual Studio Code inside the ` +
            `Flatpak sandbox, which is known to interfere with the download of Metals. ` +
            `Please, try running Visual Studio Code without Flatpak.`
          )
        } else if (serverVersion === defaultServerVersion) {
          return (
            `Failed to download Metals, make sure you have an internet connection and ` +
            `the Java Home '${javaPath}' is valid. You can configure the Java Home in the settings.` +
            proxy
          )
        } else {
          return (
            `Failed to download Metals, make sure you have an internet connection, ` +
            `the Metals version '${serverVersion}' is correct and the Java Home '${javaPath}' is valid. ` +
            `You can configure the Metals version and Java Home in the settings.` +
            proxy
          )
        }
      })()
      workspace.showPrompt(msg + `\n Open Settings?`).then(choice => {
        if (choice) workspace.nvim.command('CocConfig', true)
      })
    })
}

function launchMetals(
  context: ExtensionContext,
  javaPath: string,
  metalsClasspath: string,
  serverProperties: string[],
  javaOptions: string[]
) {
  const baseProperties = [
    `-Dmetals.client=coc.nvim`,
    `-Xss4m`,
    `-Xms100m`
  ]
  const mainArgs = ["-classpath", metalsClasspath, "scala.meta.metals.Main"];
  // let user properties override base properties
  const launchArgs = baseProperties
    .concat(javaOptions)
    .concat(serverProperties)
    .concat(mainArgs)

  const serverOptions: ServerOptions = {
    run: { command: javaPath, args: launchArgs },
    debug: { command: javaPath, args: launchArgs }
  }

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", language: "scala" }],
    synchronize: {
      configurationSection: "metals"
    },
    revealOutputChannelOn: RevealOutputChannelOn.Never
  }

  // I know this any here is a bit gross, but I can't
  // getn any of the sendRequests to work or type check
  // correctly without it
  const client: any = new LanguageClient(
    "metals",
    "Metals",
    serverOptions,
    clientOptions
  )

  function registerCommand(command: string, callback: (...args: any[]) => any) {
    context.subscriptions.push(commands.registerCommand(command, callback))
  }

  registerCommand("metals.restartServer", () => {
    // First try to gracefully shutdown the server with LSP `shutdown` and `exit`.
    // If Metals doesn't respond within 4 seconds we kill the process.
    const timeout = (ms: number) =>
      new Promise((_resolve, reject) => setTimeout(reject, ms))
    const gracefullyTerminate = client
      .sendRequest(ShutdownRequest.type)
      .then(() => {
        client.sendNotification(ExitNotification.type);
        // TODO add progress here
        workspace.showMessage("Metals is restarting")
      })

    Promise.race([gracefullyTerminate, timeout(4000)]).catch(() => {
      workspace.showMessage(
        "Metals is unresponsive, killing the process and starting a new server.",
        "warning"
      )
      const serverPid = client["_serverProcess"].pid;
      exec(`kill ${serverPid}`);
    })
  })

  context.subscriptions.push(client.start())

  client.onReady().then(_ => {

    workspace.showMessage("Metals is ready!")

    const commands = [
      "build-import",
      "build-connect",
      "sources-scan",
      "doctor-run",
      "compile-cascade",
      "compile-cancel"
    ]

    commands.forEach(command => {
      registerCommand("metals." + command, async () =>
        client.sendRequest(ExecuteCommandRequest.type, { command })
      )
    })

    client.onNotification(ExecuteClientCommand.type, params => {
      switch (params.command) {
        case "metals-goto-location":
          const location =
            params.arguments && (params.arguments[0] as Location)
          if (location) {
            const range = Range.create(
              location.range.start.line,
              location.range.start.character,
              location.range.end.line,
              location.range.end.character
            )
            workspace.jumpTo(location.uri, range.start)
            workspace.selectRange(range)
          }
          break
        default:
          workspace.showMessage(`Unknown command: ${params.command}`)
      }
    })

    registerCommand("metals.goto", args => {
      const params: ExecuteCommandParams = {
        command: "goto",
        arguments: args
      }
      client.sendRequest(ExecuteCommandRequest.type, params)
    })

    registerCommand("metals-echo-command", (arg: string) => {
      client.sendRequest(ExecuteCommandRequest.type, {
        command: arg
      })
    })


  })

    // TODO skipping this for now. I could just easily display the messages
    // but I want to make sure that if there is a command, I'll probably
    // need to just display the prompt for executing the command
    // client.onNotification(MetalsStatus.type, params => {
    //   item.text = params.text;
    //   if (params.show) {
    //     item.show();
    //   } else if (params.hide) {
    //     item.hide();
    //   }
    //   if (params.tooltip) {
    //     workspace.showMessage(params.tooltip)
    //   }
    //   if (params.command) {
    //     item.command = params.command;
    //     commands.getCommands().then(values => {
    //       if (params.command && values.includes(params.command)) {
    //         registerCommand(params.command, () => {
    //           client.sendRequest(ExecuteCommandRequest.type, {
    //             command: params.command
    //           });
    //         });
    //       }
    //     });
    //   } else {
    //     item.command = undefined;
    //   }
    // });

  // Long running tasks such as "import project" trigger start a progress
  // bar with a "cancel" button.
  // TODO worry about this when it's working
  // client.onRequest(MetalsSlowTask.type, (params, requestToken) => {
  //   return new Promise(requestResolve => {
  //     window.withProgress(
  //       {
  //         location: ProgressLocation.Notification,
  //         title: params.message,
  //         cancellable: true
  //       },
  //       (progress, progressToken) => {
  //         const showLogs = !params.quietLogs;
  //         if (showLogs) {
  //           // Open logs so user can keep track of progress.
  //           client.outputChannel.show(true);
  //         }

  //         // Update total running time every second.
  //         let seconds = params.secondsElapsed || 0;
  //         const interval = setInterval(() => {
  //           seconds += 1;
  //           progress.report({ message: readableSeconds(seconds) });
  //         }, 1000);

  //         // Hide logs and clean up resources on completion.
  //         function onComplete() {
  //           clearInterval(interval);
  //           client.outputChannel.hide();
  //         }

  //         // Client triggered cancelation from the progress notification.
  //         progressToken.onCancellationRequested(() => {
  //           onComplete();
  //           requestResolve({ cancel: true });
  //         });

  //         return new Promise(progressResolve => {
  //           // Server completed long running task.
  //           requestToken.onCancellationRequested(() => {
  //             onComplete();
  //             progress.report({ increment: 100 });
  //             setTimeout(() => progressResolve(), 1000);
  //           });
  //         });
  //       }
  //     );
  //   });
  // });

}
