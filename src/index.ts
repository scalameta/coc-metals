import {detechLauncConfigurationChanges, getJavaHome} from "./activationUtils"
import {commands, workspace} from "coc.nvim"

export async function activate() {
  detechLauncConfigurationChanges()
  // TODO add in checkServerVersion

  getJavaHome()
    .then(javaHome => workspace.showMessage(javaHome))
    .catch(err => {
      const message =
        err.message +
        "Unable to find a Java 8 or Java 11 installation on this computer. " +
        "To fix this problem, update the 'Java Home' setting to point to a Java 8 or Java 11 home directory"
      const openSettings = "Open Settings"
      const ignore = "Ignore for now"
      workspace.showQuickpick([openSettings, ignore], message)
        .then(choice => {
          if (choice === 0) {
            // TODO figure out a good way to store both commands and thier
            // arguments in the command file and mvoe this
            commands.executeCommand("setContext", "metals:enabled", true)
          }
        })
    })
  workspace.showMessage("This is working")
}

