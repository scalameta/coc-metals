import { Commands } from './commands'
import {ExtensionContext, workspace, commands} from 'coc.nvim'

export async function activate() {
  detechLauncConfigurationChanges()
  // TODO add in checkServerVersion

  workspace.showMessage('This is working')
}

function detechLauncConfigurationChanges() {
  workspace.onDidChangeConfiguration(change => {
    const promptRestartKeys = [
      'serverVersion',
      'serverProperties',
      'javaHome',
      'customRepositories'
    ]

    const shouldPromptRestart = promptRestartKeys.some(key =>
      change.affectsConfiguration(`metals.${key}`)
    )

    if (shouldPromptRestart) {
      const message = 'Server launch configuration change detected.Reload the window for changes to take effect'
      const options = [
        'Reload Window',
        'Not Now'
      ]
      workspace.showQuickpick(options, message)
        .then(choice => {
          if (choice === 1) {
            commands.executeCommand(Commands.RELOAD_WINDOW)
          }
        })
    }
  })
}
