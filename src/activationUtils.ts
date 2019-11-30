import locateJavaHome from "locate-java-home"
import {Commands} from './commands'
import {workspace, commands} from 'coc.nvim'
import * as semver from "semver"

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
          if (choice === 1) {
            commands.executeCommand(Commands.RELOAD_WINDOW)
          }
        })
    }
  })
}

export function getJavaHome(): Promise<string> {
  const userJavaHome = workspace.getConfiguration("metals").get("javaHome")
  if (typeof userJavaHome === "string" && userJavaHome.trim() !== "") {
    return Promise.resolve(userJavaHome)
  } else {
    const JAVA_HOME = process.env["JAVA_HOME"]
    if (JAVA_HOME) return Promise.resolve(JAVA_HOME)
    else {
      return new Promise((resolve, reject) => {
        locateJavaHome({version: ">=1.8 <=1.11"}, (err, javaHomes) => {
          if (err) {
            reject(err)
          } else if (!javaHomes || javaHomes.length === 0) {
            reject(new Error("No suitable Java version found"))
          } else {
            javaHomes.sort((a, b) => {
              const byVersion = -semver.compare(a.version, b.version)
              if (byVersion === 0) return b.security - a.security
              else return byVersion
            })
            const jdkHome = javaHomes.find(j => j.isJDK)
            if (jdkHome) resolve(jdkHome.path)
            else resolve(javaHomes[0].path)
          }
        })
        
      })
    }
  }
}
