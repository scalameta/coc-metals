import { Commands } from "./commands";
import { makeVimDoctor } from "./embeddedDoctor";
import {
  getJavaHome,
  checkDottyIde,
  restartServer,
  fetchMetals,
  getServerOptions,
  getJavaConfig,
  JavaConfig
} from "metals-languageclient";
import {
  ExecuteClientCommand,
  MetalsDidFocus,
  MetalsInputBox,
  MetalsQuickPick,
  DecorationsRangesDidChange,
  PublishDecorationsParams,
  MetalsQuickPickParams
} from "./metalsProtocol";
import {
  checkServerVersion,
  trackDownloadProgress,
  toggleLogs,
  wait,
  detectLaunchConfigurationChanges
} from "./utils";
import {
  commands,
  ExtensionContext,
  LanguageClient,
  LanguageClientOptions,
  RevealOutputChannelOn,
  workspace,
  events,
  FloatFactory
} from "coc.nvim";
import {
  ExecuteCommandRequest,
  Location
} from "vscode-languageserver-protocol";
import { MetalsFeatures } from "./MetalsFeatures";
import DecorationProvider from "./decoration";
import { InputBoxOptions } from "./portedProtocol";
import { TreeViewController } from "./tvp/controller";
import { TreeViewFeature } from "./tvp/feature";
import { TreeViewsManager } from "./tvp/treeviews";
import * as path from "path";

export async function activate(context: ExtensionContext) {
  detectLaunchConfigurationChanges();
  await checkServerVersion();

  getJavaHome(workspace.getConfiguration("metals").get("javaHome")).then(
    javaHome => fetchAndLaunchMetals(context, javaHome),
    () => {
      const message =
        "Unable to find a Java 8 or Java 11 installation on this computer. " +
        "To fix this problem, update the 'Java Home' setting to point to a Java 8 or Java 11 home directory";
      const openSettings = "Open Settings";
      const ignore = "Ignore for now";
      workspace.showQuickpick([openSettings, ignore], message).then(choice => {
        if (choice === 0) {
          workspace.nvim.command(Commands.OPEN_COC_CONFIG, true);
        }
      });
    }
  );
}

function fetchAndLaunchMetals(context: ExtensionContext, javaHome: string) {
  const dottyIde = checkDottyIde(workspace.workspaceFolder?.uri);
  if (dottyIde.enabled) {
    workspace.showMessage(
      `Metals will not start since Dotty is enabled for this workspace. ` +
        `To enable Metals, remove the file ${dottyIde.path} and run ':CocCommand metals.restartServer'`,
      "warning"
    );
    return;
  }

  const config = workspace.getConfiguration("metals");
  const serverVersionConfig = config.get<string>("serverVersion");
  const defaultServerVersion = config.inspect<string>("serverVersion")!
    .defaultValue!;
  const serverVersion = serverVersionConfig
    ? serverVersionConfig
    : defaultServerVersion;

  const serverProperties = config.get<string[]>("serverProperties") ?? [];
  const customRepositories = config.get<string[]>("customRepositories ");

  const javaConfig = getJavaConfig({
    workspaceRoot: workspace.workspaceFolder?.uri,
    javaHome,
    customRepositories,
    extensionPath: context.extensionPath
  });

  const fetchProcess = fetchMetals({
    serverVersion,
    serverProperties,
    javaConfig
  });

  trackDownloadProgress(fetchProcess).then(
    classpath => {
      launchMetals(context, classpath, serverProperties, javaConfig);
    },
    () => {
      const msg = (() => {
        const proxy =
          `See https://scalaeta.org/metals/docs/editors/vscode.html#http-proxy for instructions ` +
          `if you are using an HTTP proxy.`;
        if (serverVersion === defaultServerVersion) {
          return (
            `Failed to download Metals, make sure you have an internet connection and ` +
            `the Java Home '${javaHome}' is valid. You can configure the Java Home in the settings.` +
            proxy
          );
        } else {
          return (
            `Failed to download Metals, make sure you have an internet connection, ` +
            `the Metals version '${serverVersion}' is correct and the Java Home '${javaHome}' is valid. ` +
            `You can configure the Metals version and Java Home in the settings.` +
            proxy
          );
        }
      })();
      workspace.showPrompt(`${msg}\n Open Settings?`).then(choice => {
        if (choice) workspace.nvim.command(Commands.OPEN_COC_CONFIG, true);
      });
    }
  );
}

function launchMetals(
  context: ExtensionContext,
  metalsClasspath: string,
  serverProperties: string[],
  javaConfig: JavaConfig
) {
  const serverOptions = getServerOptions({
    metalsClasspath,
    serverProperties,
    javaConfig,
    clientName: "coc-metals"
  });

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", language: "scala" }],
    synchronize: {
      configurationSection: "metals"
    },
    revealOutputChannelOn: RevealOutputChannelOn.Never
  };

  const client = new LanguageClient(
    "metals",
    "Metals",
    serverOptions,
    clientOptions
  );

  const features = new MetalsFeatures();
  const treeViewFeature = new TreeViewFeature(client);
  client.registerFeature(features);
  client.registerFeature(treeViewFeature);

  const floatFactory = new FloatFactory(
    workspace.nvim,
    workspace.env,
    false,
    100,
    100,
    true
  );
  const decorationProvider = new DecorationProvider(floatFactory);

  const treeViewsManager = new TreeViewsManager(workspace.nvim, context.logger);
  const treeViewController = new TreeViewController(
    treeViewFeature,
    treeViewsManager
  );
  context.subscriptions.push(
    treeViewFeature,
    treeViewsManager,
    treeViewController
  );

  function registerCommand(command: string, callback: (...args: any[]) => any) {
    context.subscriptions.push(commands.registerCommand(command, callback));
  }

  registerCommand("metals.restartServer", restartServer(client, workspace));

  context.subscriptions.push(client.start());

  client.onReady().then(_ => {
    workspace.showMessage("Metals is ready!");

    const commands = [
      "build-import",
      "build-connect",
      "sources-scan",
      "doctor-run",
      "compile-cascade",
      "compile-cancel"
    ];

    commands.forEach(command => {
      registerCommand("metals." + command, async () => {
        workspace.showMessage("metals" + command);
        client.sendRequest(ExecuteCommandRequest.type, { command });
      });
    });

    registerCommand("metals.logs-toggle", () => {
      toggleLogs();
    });

    if (features.decorationProvider) {
      context.subscriptions.push(
        workspace.registerKeymap(
          ["n"],
          "metals-expand-decoration",
          () => {
            decorationProvider.showHover();
          },
          { sync: false }
        )
      );
    }

    registerCommand("metals.new-scala-file", async () => {
      const currentDoc = await workspace.document;
      const currentPath = currentDoc.uri;
      const parentDir = path.dirname(currentPath);

      client.sendRequest(ExecuteCommandRequest.type, {
        command: "new-scala-file",
        arguments: [parentDir]
      });
    });

    client.onNotification(ExecuteClientCommand.type, async params => {
      switch (params.command) {
        case "metals-goto-location":
          const location =
            params.arguments && (params.arguments[0] as Location);
          if (location) {
            await treeViewsManager.prepareWindowForGoto();
            // It seems this line fixes weird issue with "returned a response with an unknown
            // request id" after executing commands several times.
            await wait(10);
            await workspace.jumpTo(location.uri, location.range.start);
          }
          break;
        case "metals-doctor-run":
          const doctorJson: string = params.arguments && params.arguments[0];
          makeVimDoctor(JSON.parse(doctorJson));
          break;
        case "metals-doctor-reload":
          workspace.nvim.call("coc#util#has_preview").then(preview => {
            if (preview > 0) {
              const doctorJson: string =
                params.arguments && params.arguments[0];
              makeVimDoctor(JSON.parse(doctorJson));
            }
          });
          break;
        case "metals-diagnostics-focus":
          workspace.nvim.command("CocList diagnostics");
          break;
        case "metals-logs-toggle":
          toggleLogs();
          break;
        default:
          workspace.showMessage(`Recieved unknown command: ${params.command}`);
      }
    });

    events.on("BufWinEnter", (bufnr: number) => {
      const currentDocument = workspace.documents.find(
        document => document.bufnr === bufnr
      );
      // For now I'm just checking for scala since both scala and sc files will be marked
      // as scala, and this is only relevant for decorations anyways.
      if (currentDocument && currentDocument.filetype === "scala") {
        client.sendNotification(MetalsDidFocus.type, currentDocument.uri);
      }
    });

    client.onRequest(MetalsInputBox.type, async (options: InputBoxOptions) => {
      const response = await workspace.callAsync<string>("input", [
        `${options.prompt}: `,
        options.value ? options.value : ""
      ]);
      if (response.trim() === "") {
        return { cancelled: true };
      } else {
        return { value: response };
      }
    });

    client.onRequest(MetalsQuickPick.type, (params: MetalsQuickPickParams, _) =>
      workspace
        .showQuickpick(
          params.items.map(item => item.label),
          params.placeHolder
        )
        .then(answer => {
          if (answer === -1) {
            return { cancelled: true };
          } else {
            return { itemId: params.items[answer].id };
          }
        })
    );

    if (features.decorationProvider) {
      client.onNotification(
        DecorationsRangesDidChange.type,
        (params: PublishDecorationsParams) => {
          if (workspace.uri && workspace.uri === params.uri) {
            decorationProvider.setDecorations(params);
          }
        }
      );

      events.on("BufWinLeave", (bufnr: number) => {
        const previousDocument = workspace.documents.find(
          document => document.bufnr === bufnr
        );
        if (
          previousDocument &&
          previousDocument.uri.endsWith(".worksheet.sc")
        ) {
          decorationProvider.clearDecorations(bufnr);
        }
      });
    }
  });
}
