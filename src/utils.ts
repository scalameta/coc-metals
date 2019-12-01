import {workspace} from "coc.nvim"
import * as path from "path"

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
