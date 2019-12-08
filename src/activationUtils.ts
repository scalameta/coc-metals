import {Commands} from "./commands"
import {workspace} from "coc.nvim"

export function detechLauncConfigurationChanges() {
  workspace.onDidChangeConfiguration(change => {
    const promptRestartKeys = [
      "serverVersion",
      "serverProperties",
      "javaHome",
      "customRepositories"
    ]

    const shouldPromptRestart = promptRestartKeys.some(key =>
      change.affectsConfiguration(`metals.${key}`)
    )

    if (shouldPromptRestart) {
      workspace.showPrompt("Server configuration changes detected. Would you like to reload the window for them to take affect?")
        .then(choice => {
          if (choice) {
            workspace.nvim.command(Commands.RESTART_COC, true)
          }
        })
    }
  })
}

