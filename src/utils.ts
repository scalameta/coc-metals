import { Commands } from "./commands";

import {
  ConfigurationTarget,
  workspace,
  WorkspaceConfiguration
} from "coc.nvim";
import { ChildProcessPromise } from "promisify-child-process";
import * as semver from "semver";
import ProgressItem from "./ProgressItem";
import { downloadProgress } from "metals-languageclient";

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

function serverVersionInfo(
  config: WorkspaceConfiguration
): {
  serverVersion: string;
  latestServerVersion: string;
  configurationTarget: ConfigurationTarget;
} {
  const computedVersion = config.get<string>("serverVersion")!;
  const { defaultValue, globalValue, workspaceValue } = config.inspect<string>(
    "serverVersion"
  )!;
  const configurationTarget = (() => {
    if (globalValue && globalValue !== defaultValue) {
      return ConfigurationTarget.Global;
    }
    if (workspaceValue && workspaceValue !== defaultValue) {
      return ConfigurationTarget.Workspace;
    }
    return ConfigurationTarget.Workspace;
  })();
  return {
    serverVersion: computedVersion,
    latestServerVersion: defaultValue!,
    configurationTarget
  };
}

export async function checkServerVersion() {
  const config = workspace.getConfiguration("metals");
  const { serverVersion, latestServerVersion } = serverVersionInfo(config);
  const isOutdated = (() => {
    try {
      return semver.lt(serverVersion, latestServerVersion);
    } catch (_e) {
      // serverVersion has an invalid format
      // ignore the exception here, and let subsequent checks handle this
      return false;
    }
  })();

  if (isOutdated) {
    const upgradeAction = `Upgrade to ${latestServerVersion} now`;
    const openSettingsAction = "Open settings";
    const outOfDateMessage = `You are running an out-of-date version of Metals. Latest version is ${latestServerVersion}, but you have configured a custom server version ${serverVersion}`;
    const ignore = "Ignore for now";

    const choice = await workspace.showQuickpick(
      [upgradeAction, openSettingsAction, ignore],
      outOfDateMessage
    );
    if (choice === 0) {
      config.update("serverVersion", latestServerVersion, true);
    } else if (choice === 1) {
      workspace.nvim.command(Commands.OPEN_COC_CONFIG, true);
    }
  }
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
