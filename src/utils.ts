import { Commands } from "./commands";

import { workspace } from "coc.nvim";
import { ChildProcessPromise } from "promisify-child-process";
import ProgressItem from "./ProgressItem";
import { downloadProgress } from "metals-languageclient";
import * as metalsLanguageClient from "metals-languageclient";

export function trackDownloadProgress(
  download: ChildProcessPromise
): Promise<string> {
  const progress = new ProgressItem().createStatusBarItem("Preparing Metals");
  return downloadProgress({
    download,
    onProgress: progress.update,
    onError: progress.dispose,
    onComplete: progress.dispose
  });
}

export async function checkServerVersion() {
  const config = workspace.getConfiguration("metals");
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
      upgrade
    }) => {
      workspace
        .showQuickpick(
          [upgradeChoice, openSettingsChoice, dismissChoice],
          message
        )
        .then(choice => {
          if (choice === 0) {
            upgrade();
          } else if (choice === 1) {
            workspace.nvim.command(Commands.OPEN_COC_CONFIG, true);
          }
        });
    }
  });
}

export function toggleLogs() {
  const infoBuffer = workspace.documents.find(doc => doc.uri.endsWith("info"));
  if (infoBuffer) {
    workspace.nvim.command(`bd ${infoBuffer.bufnr}`);
  } else {
    workspace.nvim.command(Commands.OPEN_LOGS);
  }
}

export function wait(ms: number): Promise<any> {
  return new Promise(resolve => {
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
        .then(choice => {
          if (choice === 0) {
            workspace.nvim.command(Commands.RESTART_COC, true);
          }
        });
    }
  );
}
