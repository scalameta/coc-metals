import {Commands} from './commands'
import {workspace, commands} from 'coc.nvim'

export function detechLauncConfigurationChanges() {
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
          if (choice === 0) {
            workspace.nvim.command(Commands.RESTART_COC, true)
          }
        })
    }
  })
}

