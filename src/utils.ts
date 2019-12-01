import {workspace} from "coc.nvim"
import * as path from "path"
import {ChildProcessPromise} from "promisify-child-process"
import {TextDocument} from "vscode-languageserver-protocol"

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

export function trackDownloadProgress(
  title: string,
  download: ChildProcessPromise
): Promise<string> {
  // TODO figure out the fancy progress spinner later
  workspace.showMessage(title)
  let stdout: Buffer[] = []
  download.stdout.on("data", (out: Buffer) => {
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
  return download.then(() =>
    stdout.map(buffer => buffer.toString().trim()).join("")
  )
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
