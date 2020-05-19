import {
  commands,
  events,
  ExtensionContext,
  FloatFactory,
  LanguageClient,
  LanguageClientOptions,
  RevealOutputChannelOn,
  StatusBarItem,
  workspace,
  WorkspaceConfiguration,
} from "coc.nvim";
import {
  checkDottyIde,
  fetchMetals,
  getJavaConfig,
  getJavaHome,
  getServerOptions,
  JavaConfig,
  restartServer,
} from "metals-languageclient";
import * as path from "path";
import {
  ExecuteCommandRequest,
  Location,
} from "vscode-languageserver-protocol";
import { Commands } from "./commands";
import DecorationProvider from "./decoration";
import { makeVimDoctor } from "./embeddedDoctor";
import {
  DecorationsRangesDidChange,
  ExecuteClientCommand,
  MetalsDidFocus,
  MetalsInputBox,
  MetalsQuickPick,
  MetalsQuickPickParams,
  MetalsStatus,
  PublishDecorationsParams,
} from "./metalsProtocol";
import { InputBoxOptions } from "./portedProtocol";
import { TreeViewController } from "./tvp/controller";
import { TreeViewFeature } from "./tvp/feature";
import { TreeViewsManager } from "./tvp/treeviews";
import {
  checkServerVersion,
  detectLaunchConfigurationChanges,
  toggleLogs,
  trackDownloadProgress,
  wait,
} from "./utils";
import { DebuggingFeature } from "./DebuggingFeature";
import WannaBeStatusBarItem from "./WannaBeStatusBarItem";

export async function activate(context: ExtensionContext) {
  const config: WorkspaceConfiguration = workspace.getConfiguration("metals");
  if (config.get<boolean>("enable")) {
    detectLaunchConfigurationChanges();
    checkServerVersion(config);

    getJavaHome(config.get<string>("javaHome")).then(
      (javaHome) => fetchAndLaunchMetals(config, context, javaHome),
      () => {
        const message =
          "Unable to find a Java 8 or Java 11 installation on this computer. " +
          "To fix this problem, update the 'Java Home' setting to point to a Java 8 or Java 11 home directory";
        const openSettings = "Open Settings";
        const ignore = "Ignore for now";
        workspace
          .showQuickpick([openSettings, ignore], message)
          .then((choice) => {
            if (choice === 0) {
              workspace.nvim.command(Commands.OPEN_COC_CONFIG, true);
            }
          });
      }
    );
  }
}

function fetchAndLaunchMetals(
  config: WorkspaceConfiguration,
  context: ExtensionContext,
  javaHome: string
) {
  const dottyIde = checkDottyIde(workspace.workspaceFolder?.uri);
  if (dottyIde.enabled) {
    workspace.showMessage(
      `Metals will not start since Dotty is enabled for this workspace. ` +
        `To enable Metals, remove the file ${dottyIde.path} and run ':CocCommand metals.restartServer'`,
      "warning"
    );
    return;
  }

  const serverVersionConfig = config.get<string>("serverVersion");
  const defaultServerVersion = config.inspect<string>("serverVersion")!
    .defaultValue!;
  const serverVersion = serverVersionConfig
    ? serverVersionConfig
    : defaultServerVersion;

  const serverProperties = config.get<string[]>("serverProperties")!;
  const customRepositories = config.get<string[]>("customRepositories")!;

  const javaConfig = getJavaConfig({
    workspaceRoot: workspace.workspaceFolder?.uri,
    javaHome,
    customRepositories,
    extensionPath: context.extensionPath,
  });

  const fetchProcess = fetchMetals({
    serverVersion,
    serverProperties,
    javaConfig,
  });

  const statusBarEnabled = config.get<boolean>("statusBarEnabled");

  const progress: StatusBarItem = statusBarEnabled
    ? workspace.createStatusBarItem(0, { progress: true })
    : new WannaBeStatusBarItem(0, true, "Preparing Metals");

  const title = `Downloading Metals v${serverVersion}`;
  trackDownloadProgress(title, fetchProcess, progress).then(
    (classpath) => {
      launchMetals(
        context,
        classpath,
        serverProperties,
        javaConfig,
        progress,
        statusBarEnabled
      );
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
      workspace.showPrompt(`${msg}\n Open Settings?`).then((choice) => {
        if (choice) workspace.nvim.command(Commands.OPEN_COC_CONFIG, true);
      });
    }
  );
}

async function launchMetals(
  context: ExtensionContext,
  metalsClasspath: string,
  serverProperties: string[],
  javaConfig: JavaConfig,
  progress: StatusBarItem,
  statusBarEnabled: boolean | undefined
) {
  const serverOptions = getServerOptions({
    metalsClasspath,
    serverProperties,
    javaConfig,
    clientName: "coc-metals",
  });

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", language: "scala" }],
    synchronize: {
      configurationSection: "metals",
    },
    revealOutputChannelOn: RevealOutputChannelOn.Never,
    initializationOptions: {
      decorationProvider: workspace.isNvim,
      didFocusProvider: true,
      doctorProvider: "json",
      executeClientCommandProvider: true,
      quickPickProvider: true,
      inputBoxProvider: true,
      slowTaskProvider: true,
      statusBarProvider: statusBarEnabled ? "on" : "show-message",
      treeViewProvider: true,
      debuggingProvider:
        workspace.isNvim &&
        (await workspace.nvim.getVar("loaded_vimpector")) === 1,
    },
  };

  const client = new LanguageClient(
    "metals",
    "Metals",
    serverOptions,
    clientOptions
  );

  const treeViewFeature = new TreeViewFeature(client);
  client.registerFeature(treeViewFeature);
  if (clientOptions.initializationOptions.debuggingProvider) {
    const debuggingFeature = new DebuggingFeature(workspace.nvim, client);
    client.registerFeature(debuggingFeature);
  }

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

  client.onReady().then((_) => {
    progress.isProgress = false;
    progress.text = "Metals is Ready!";
    progress.show();

    const commands = [
      "build-import",
      "build-connect",
      "build-restart",
      "sources-scan",
      "doctor-run",
      "compile-cascade",
      "compile-cancel",
      "compile-clean",
      "ammonite-start",
      "ammonite-stop",
      "new-scala-project",
    ];

    commands.forEach((command) => {
      registerCommand("metals." + command, async () => {
        workspace.showMessage("metals" + command);
        client.sendRequest(ExecuteCommandRequest.type, { command });
      });
    });

    registerCommand("metals.logs-toggle", () => {
      toggleLogs();
    });

    if (workspace.isNvim) {
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
        arguments: [parentDir],
      });
    });

    registerCommand("metals.go-to-super-method", async () => {
      const currentDoc = await workspace.document;
      const position = await workspace.getCursorPosition();

      client.sendRequest(ExecuteCommandRequest.type, {
        command: "goto-super-method",
        arguments: [
          {
            document: currentDoc.uri,
            position,
          },
        ],
      });
    });

    registerCommand("metals.super-method-hierarchy", async () => {
      const currentDoc = await workspace.document;
      const position = await workspace.getCursorPosition();

      client.sendRequest(ExecuteCommandRequest.type, {
        command: "super-method-hierarchy",
        arguments: [
          {
            document: currentDoc.uri,
            position,
          },
        ],
      });
    });

    client.onNotification(ExecuteClientCommand.type, async (params) => {
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
          workspace.nvim.call("coc#util#has_preview").then((preview) => {
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
        case "metals-model-refresh":
          // CodeLensManager from coc.nvim reloads codeLens on this event
          events.fire("BufEnter", [workspace.bufnr]);
          break;
        default:
          workspace.showMessage(`Recieved unknown command: ${params.command}`);
      }
    });

    events.on("BufWinEnter", (bufnr: number) => {
      const currentDocument = workspace.documents.find(
        (document) => document.bufnr === bufnr
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
        options.value ? options.value : "",
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
          params.items.map((item) => item.label),
          params.placeHolder
        )
        .then((answer) => {
          if (answer === -1) {
            return { cancelled: true };
          } else {
            return { itemId: params.items[answer].id };
          }
        })
    );

    if (statusBarEnabled) {
      const statusItem = workspace.createStatusBarItem(0);
      client.onNotification(MetalsStatus.type, (params) => {
        statusItem.text = params.text;
        if (params.show) {
          statusItem.show();
        } else if (params.hide) {
          statusItem.hide();
        }
      });
    }

    if (workspace.isNvim) {
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
          (document) => document.bufnr === bufnr
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
