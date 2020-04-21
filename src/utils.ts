import { StatusBarItem, workspace, WorkspaceConfiguration } from "coc.nvim";
import * as metalsLanguageClient from "metals-languageclient";
import { downloadProgress } from "metals-languageclient";
import { ChildProcessPromise } from "promisify-child-process";
import { Commands } from "./commands";

export function trackDownloadProgress(
  title: string,
  download: ChildProcessPromise,
  progress: StatusBarItem
): Promise<string> {
  return downloadProgress({
    download,
    onProgress: (_) => {
      progress.text = title;
      progress.show();
    },
    onError: progress.dispose,
    onComplete: progress.dispose,
  });
}

export function checkServerVersion(config: WorkspaceConfiguration) {
  metalsLanguageClient.checkServerVersion({
    config,
    updateConfig: ({ configSection, latestServerVersion }) => {
      config.update(configSection, latestServerVersion, true);
    },
    onOutdated: ({
      message,
      upgradeChoice,
      openSettingsChoice,
      dismissChoice,
      upgrade,
    }) => {
      workspace
        .showQuickpick(
          [upgradeChoice, openSettingsChoice, dismissChoice],
          message
        )
        .then((choice) => {
          if (choice === 0) {
            upgrade();
          } else if (choice === 1) {
            workspace.nvim.command(Commands.OPEN_COC_CONFIG, true);
          }
        });
    },
  });
}

export function toggleLogs() {
  const infoBuffer = workspace.documents.find((doc) =>
    doc.uri.endsWith("info")
  );
  if (infoBuffer) {
    workspace.nvim.command(`bd ${infoBuffer.bufnr}`);
  } else {
    workspace.nvim.command(Commands.OPEN_LOGS);
  }
}

export function wait(ms: number): Promise<any> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function detectLaunchConfigurationChanges(): void {
  metalsLanguageClient.detectLaunchConfigurationChanges(
    workspace,
    ({ message, reloadWindowChoice, dismissChoice }) => {
      // NOTE: I used to just have a prompt here, but was having issues
      // with it working correctly with vim even using async await.
      return workspace
        .showQuickpick([reloadWindowChoice, dismissChoice], message)
        .then((choice) => {
          if (choice === 0) {
            workspace.nvim.command(Commands.RESTART_COC, true);
          }
        });
    },
    ["statusBarEnabled", "bloopVersion", "enable"]
  );
}
