import {detechLauncConfigurationChanges} from "./activationUtils"
import {getJavaHome, getJavaOptions} from "./javaUtils"
import {ExecuteClientCommand} from "./protocol"
import {
  dottyIdeArtifact,
  migrateStringSettingToArray,
  trackDownloadProgress
} from "./utils"

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
import {Emitter, ExecuteCommandRequest, Location, Range} from "vscode-languageserver-protocol"

import * as fs from "fs"
import * as path from "path"

export async function activate(context: ExtensionContext) {
  detechLauncConfigurationChanges()
  // TODO add in checkServerVersion

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
            // TODO figure out a good way to store both commands and thier
            // arguments in the command file and mvoe this
            workspace.nvim.command('CocConfig', true)
            // TODO below is what we used to do, but figure out a way to
            // restart after the config changes
            //commands.executeCommand("setContext", "metals:enabled", true)
            workspace.nvim.command("CocRestart", true)
          }
        })
    })
}


function fetchAndLaunchMetals(context: ExtensionContext, javaHome: string) {
  // TODO figure out the best way to do this check in vim
  // since while testin if I open a single file from the command line
  // it still recognizes the parent folder
  // if (!workspace.workspaceFolders) {
  //   workspace.showMessage(
  //     `Metals will not start because you've opened a single file and not a project directory.`,
  //     "warning"
  //   )
  //   return
  // }

  const dottyArtifact = dottyIdeArtifact()
  if (dottyArtifact && fs.existsSync(dottyArtifact)) {
    // TODO replace the reload window command with the coc-equivelant later
    workspace.showMessage(
      `Metals will not start since Dotty is enabled for this workspace. ` +
      `To enable Metals, remove the file ${dottyArtifact} and run 'Reload window'`,
      "warning"
    )
    return
  }

  workspace.showMessage(`Java home: ${javaHome}`)
  const javaPath = path.join(javaHome, "bin", "java")
  workspace.showMessage(`Java path: ${javaPath}`)
  const coursierPath = path.join(context.extensionPath, "./coursier")
  workspace.showMessage(`Coursier  path: ${coursierPath}`)

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

  const fetchProperties = serverProperties.filter(
    p => !p.startsWith("-agentlib")
  )

  const customRepositories: string = config
    .get<string[]>("customRepositories")!
    .join("|")

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

  const title = `Downloading Metals v${serverVersion}`

  trackDownloadProgress(title, fetchProcess)
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
  // Make editing Scala docstrings slightly nicer.
  // TODO the coc api doesn't have the setLangugageCOnfiguration
  // built in yet it seems. I'll need to look into a way to do this
  // or potentially just add it into coc core
  // enableScaladocIndentation();

  const baseProperties = [
    `-Dmetals.input-box=on`,
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

  const client = new LanguageClient(
    "metals",
    "Metals",
    serverOptions,
    clientOptions
  )
  // TODO look into how coc handles experimental features
  // since I'm really not sure it does
  // const features = new MetalsFeatures();
  // client.registerFeature(features);

  function registerCommand(command: string, callback: (...args: any[]) => any) {
    context.subscriptions.push(commands.registerCommand(command, callback))
  }

  // TODO figure out how to send the graceful shutdown to coc
  // registerCommand("metals.restartServer", () => {
  //   // First try to gracefully shutdown the server with LSP `shutdown` and `exit`.
  //   // If Metals doesn't respond within 4 seconds we kill the process.
  //   const timeout = (ms: number) =>
  //     new Promise((_resolve, reject) => setTimeout(reject, ms))
  //   const gracefullyTerminate = client
  //     .sendRequest(ShutdownRequest.type)
  //     .then(() => {
  //       client.sendNotification(ExitNotification.type);
  //       window.showInformationMessage("Metals is restarting");
  //     });
  //
  //   Promise.race([gracefullyTerminate, timeout(4000)]).catch(() => {
  //     window.showWarningMessage(
  //       "Metals is unresponsive, killing the process and starting a new server."
  //     );
  //     const serverPid = client["_serverProcess"].pid;
  //     exec(`kill ${serverPid}`);
  //   });
  // });


  context.subscriptions.push(client.start())

  // TODO add in the doctor stuff here

  // should be the compilation of a currently opened file
  // but some race conditions may apply
  let compilationDoneEmitter = new Emitter<void>()

  // let codeLensRefresher: CodeLensProvider = {
  //   // TODO the onDidChangeCodeLenses doesn't seem to be available in coc
  //   // onDidChangeCodeLenses: compilationDoneEmitter.event,
  //   provideCodeLenses: () => undefined
  // }

  // languages.registerCodeLensProvider(
  //   // TODO scheme isn't available here
  //   { scheme: "file", language: "scala" },
  //   codeLensRefresher
  // );

  // Handle the metals/executeClientCommand extension notification.
  // TODO FIX FIrst
  // client.onNotification(ExecuteClientCommand.type, params => {
  //   switch (params.command) {
  //     case "metals-goto-location":
  //       const location =
  //       params.arguments && (params.arguments[0] as Location)
  //     if (location) {
  //       const range = Range.create(
  //         location.range.start.line,
  //         location.range.start.character,
  //         location.range.end.line,
  //         location.range.end.character
  //       )
  //       // TODO is there a way to do this with one command?
  //       workspace.jumpTo(location.uri, range.start)
  //       workspace.selectRange(range)
  //     }
  //     break
  //     case "metals-model-refresh":
  //       compilationDoneEmitter.fire()
  //     break
  //     // TODO need to figure out the doctor stuff
  //     //case "metals-doctor-run":
  //     //case "metals-doctor-reload":
  //     //  const isRun = params.command === "metals-doctor-run";
  //     //  const isReload = params.command === "metals-doctor-reload";
  //     //  if (isRun || (doctor && isReload)) {
  //     //    const html = params.arguments && params.arguments[0];
  //     //    if (typeof html === "string") {
  //     //      const panel = getDoctorPanel(isReload);
  //     //      panel.webview.html = html;
  //     //    }
  //     //  }
  //     //  break;
  //     default:
  //       workspace.showMessage(`Unknown command: ${params.command}`)
  //   }
  // })

  // TODO For now this is just a message, but I want the spinner progress
  // thingy, which looks way better
  const item = workspace.createStatusBarItem(0, {progress: true})
  item.hide()
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

  // TODO SHOULD WORK 2
  // registerCommand("metals.goto", args => {
  //   client.sendRequest(ExecuteCommandRequest.type, {
  //     command: "goto",
  //     arguments: args
  //   })
  // })

  // registerCommand("metals-echo-command", (arg: string) => {
  //   client.sendRequest(ExecuteCommandRequest.type, {
  //     command: arg
  //   })
  // })

  // TODO onDidChangeActiveTextEditor doesn't exist in coc,
  // figure out how to replace this if possible
  // window.onDidChangeActiveTextEditor(editor => {
  //   if (editor && isSupportedLanguage(editor.document.languageId)) {
  //     client.sendNotification(
  //       MetalsDidFocus.type,
  //       editor.document.uri.toString()
  //     );
  //   }
  // });

  // TODO doesn't exist in coc, see what we can replace it with
  // or if it's even applicable
  // window.onDidChangeWindowState(windowState => {
  //   client.sendNotification(MetalsWindowStateDidChange.type, {
  //     focused: windowState.focused
  //   });
  // });

  // TODO rewrite this to use workspace choice
  // client.onRequest(MetalsInputBox.type, (options, requestToken) => {
  //   return window.showInputBox(options, requestToken).then(result => {
  //     if (result === undefined) {
  //       return { cancelled: true };
  //     } else {
  //       return { value: result };
  //     }
  //   });
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
