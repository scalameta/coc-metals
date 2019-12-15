import { Commands } from "./commands";

import {
  ConfigurationTarget,
  workspace,
  WorkspaceConfiguration,
  commands,
  StatusBarItem
} from "coc.nvim";
import * as path from "path";
import { ChildProcessPromise } from "promisify-child-process";
import { TextDocument } from "vscode-languageserver-protocol";
import * as semver from "semver";
import ProgressItem from "./ProgressItem";

export function dottyIdeArtifact(): string | undefined {
  // TODO the fsPath doesn't exist in the coc api, so make sure
  // the joined path is correct
  if (workspace.workspaceFolders) {
    return path.join(workspace.workspaceFolders[0].uri, ".dotty-ide-artifact");
  }
}

export function migrateStringSettingToArray(id: string): void {
  const setting = workspace
    .getConfiguration("metals")
    .inspect<string | string[]>(id)!;

  if (typeof setting.globalValue === "string") {
    workspace.getConfiguration("metals").update(
      id,
      setting.globalValue.split(" ").filter(e => e.length > 0),
      true
    );
  }

  if (typeof setting.workspaceValue === "string") {
    workspace.getConfiguration("metals").update(
      id,
      setting.workspaceValue.split(" ").filter(e => e.length > 0),
      true
    );
  }
}

export async function trackDownloadProgress(
  download: ChildProcessPromise
): Promise<string> {
  let stdout: Buffer[] = [];
  const progress = new ProgressItem().createStatusBarItem("Preparing Metals");
  download.stdout.on("data", (out: Buffer) => {
    progress.update(out.toString());
    stdout.push(out);
  });
  download.stderr.on("data", (err: Buffer) => {
    const msg = err.toString().trim();
    if (msg.startsWith("Downloaded") || msg.startsWith("Downloading")) {
      progress.update(msg);
    }
  });
  download.on("close", (code: number) => {
    if (code != 0) {
      // something went wrong, print stdout to the console to help troubleshoot.
      stdout.forEach(buffer =>
        workspace.showMessage(buffer.toString(), "error")
      );
      progress.dispose();
      throw Error(`Coursier exit: ${code}`);
    }
  });
  await download;
  progress.dispose();
  return stdout.map(buffer => buffer.toString().trim()).join("");
}

export function isSupportedLanguage(
  languageId: TextDocument["languageId"]
): boolean {
  switch (languageId) {
    case "scala":
    case "sc":
    case "java":
      return true;
    default:
      return false;
  }
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
