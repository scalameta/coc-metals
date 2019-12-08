import { Commands } from './commands'

import { ConfigurationTarget, workspace, WorkspaceConfiguration, commands, StatusBarItem } from "coc.nvim"
import * as path from "path"
import {ChildProcessPromise} from "promisify-child-process"
import {TextDocument} from "vscode-languageserver-protocol"
import * as semver from "semver"

export function dottyIdeArtifact(): string | undefined {
  // TODO the fsPath doesn't exist in the coc api, so make sure
  // the joined path is correct
  if (workspace.workspaceFolders) {
    return path.join(
      workspace.workspaceFolders[0].uri,
      ".dotty-ide-artifact"
    )
  }
}

export function migrateStringSettingToArray(id: string): void {
  const setting = workspace
    .getConfiguration("metals")
    .inspect<string | string[]>(id)!

  // TODO check a bit more into the last param of update
  // in vscode this can also be the configuration target
  // where in coc it's only a boolean
  // I think I got this right, but I've been wrong before
  if (typeof setting.globalValue === "string") {
    workspace
      .getConfiguration("metals")
      .update(
        id,
        setting.globalValue.split(" ").filter(e => e.length > 0),
        true
      )
  }

  if (typeof setting.workspaceValue === "string") {
    workspace
      .getConfiguration("metals")
      .update(
        id,
        setting.workspaceValue.split(" ").filter(e => e.length > 0),
        true
      )
  }
}

export async function trackDownloadProgress(
  download: ChildProcessPromise
): Promise<string> {
  // TODO I've been unable to get the progress status bar item
  // to work correctly in coc, but we'll need to in order to
  // have a betterd diplsaying that something is going on
  let stdout: Buffer[] = []
  download.stdout.on("data", (out: Buffer) => {
    workspace.showMessage("Preparing Metals")
    stdout.push(out)
  })
  download.stderr.on("data", (err: Buffer) => {
    const msg = err.toString().trim()
    if (!msg.startsWith("Downloading")) {
      workspace.showMessage(msg, "error")
    }
  })
  download.on("close", (code: number) => {
    if (code != 0) {
      // something went wrong, print stdout to the console to help troubleshoot.
      stdout.forEach(buffer => workspace.showMessage(buffer.toString(), "error"))
      throw Error(`coursier exit: ${code}`)
    }
  })
  await download
  return stdout.map(buffer => buffer.toString().trim()).join("")
}

export function isSupportedLanguage(languageId: TextDocument["languageId"]): boolean {
  switch (languageId) {
    case "scala":
    case "sc":
    case "java":
      return true
    default:
      return false
  }
}

function serverVersionInfo(
  config: WorkspaceConfiguration
): {
  serverVersion: string;
  latestServerVersion: string;
  configurationTarget: ConfigurationTarget;
} {
  const computedVersion = config.get<string>("serverVersion")!
  const { defaultValue, globalValue, workspaceValue } = config.inspect<
    string
  >("serverVersion")!
  const configurationTarget = (() => {
    if (globalValue && globalValue !== defaultValue) {
      return ConfigurationTarget.Global
    }
    if (workspaceValue && workspaceValue !== defaultValue) {
      return ConfigurationTarget.Workspace
    }
    return ConfigurationTarget.Workspace
  })()
  return {
    serverVersion: computedVersion,
    latestServerVersion: defaultValue!,
    configurationTarget
  }
}

export function checkServerVersion() {
  const config = workspace.getConfiguration("metals")
  const {
    serverVersion,
    latestServerVersion,
    configurationTarget
  } = serverVersionInfo(config)
  const isOutdated = (() => {
    try {
      return semver.lt(serverVersion, latestServerVersion)
    } catch (_e) {
      // serverVersion has an invalid format
      // ignore the exception here, and let subsequent checks handle this
      return false
    }
  })()

  if (isOutdated) {
    const upgradeAction = `Upgrade to ${latestServerVersion} now`
    const openSettingsAction = "Open settings"
    const outOfDateMessage = `You are running an out-of-date version of Metals. Latest version is ${latestServerVersion}, but you have configured a custom server version ${serverVersion}`

    workspace.showQuickpick([upgradeAction, openSettingsAction], outOfDateMessage)
      .then(choice => {
        if (choice === 0) {
          config.update(
            "serverVersion",
            latestServerVersion,
            true
          )
        } else if (choice === 1) {
          workspace.nvim.command(Commands.OPEN_COC_CONFIG, true)
        }
      })
  }
}
