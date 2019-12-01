import {detechLauncConfigurationChanges, getJavaHome} from "./activationUtils"
import {commands, ExtensionContext, workspace} from "coc.nvim"
import {parse} from "shell-quote"
import {ChildProcessPromise, spawn} from "promisify-child-process"
import * as fs from "fs"
import * as path from "path"

export async function activate(context: ExtensionContext) {
  detechLauncConfigurationChanges()
  // TODO add in checkServerVersion

  getJavaHome()
    .then(javaHome => fetchAndLaunchMetals(context, javaHome))
    .catch(err => {
      const message =
        `${err.stack}\n` +
        "Unable to find a Java 8 or Java 11 installation on this computer. " +
        "To fix this problem, update the 'Java Home' setting to point to a Java 8 or Java 11 home directory"
      const openSettings = "Open Settings"
      const ignore = "Ignore for now"
      workspace.showQuickpick([openSettings, ignore], message)
        .then(choice => {
          if (choice === 0) {
            // TODO figure out a good way to store both commands and thier
            // arguments in the command file and mvoe this
            workspace.nvim.command('CocConfig', true)
            // TODO blow is what we used to do, but figure out a way to
            // restart after the config changes
            //commands.executeCommand("setContext", "metals:enabled", true)
            workspace.nvim.command("CocRestart", true)
          }
        })
    })
}


function fetchAndLaunchMetals(context: ExtensionContext, javaHome: string) {
  // TODO figure out the best way to do this check in vim
  // since while testin if I open a single file from the command line
  // it still recognizes the parent folder
  // if (!workspace.workspaceFolders) {
  //   workspace.showMessage(
  //     `Metals will not start because you've opened a single file and not a project directory.`,
  //     "warning"
  //   )
  //   return
  // }

  const dottyArtifact = dottyIdeArtifact()
  if (dottyArtifact && fs.existsSync(dottyArtifact)) {
    // TODO replace the reload window command with the coc-equivelant later
    workspace.showMessage(
      `Metals will not start since Dotty is enabled for this workspace. ` +
      `To enable Metals, remove the file ${dottyArtifact} and run 'Reload window'`,
      "warning"
    )
    return
  }

  workspace.showMessage(`Java home: ${javaHome}`)
  const javaPath = path.join(javaHome, "bin", "java")
  workspace.showMessage(`Java path: ${javaPath}`)
  const coursierPath = path.join(context.extensionPath, "./coursier")
  workspace.showMessage(`Coursier  path: ${coursierPath}`)

  const config = workspace.getConfiguration("metals")
  const serverVersionConfig: string = config.get<string>("serverVersion")
  const defaultServerVersion = config.inspect<string>("serverVersion")!.defaultValue!
  const serverVersion = serverVersionConfig
    ? serverVersionConfig
    : defaultServerVersion

  migrateStringSettingToArray("serverProperties")
  migrateStringSettingToArray("customRepositories")

  const serverProperties: string[] = workspace
    .getConfiguration("metals")
    .get<string[]>("serverProperties")!

  const javaOptions = getJavaOptions()

  const fetchProperties = serverProperties.filter(
    p => !p.startsWith("-agentlib")
  )

  const customRepositories: string = config
    .get<string[]>("customRepositories")!
    .join("|")

  const customRepositoriesEnv =
    customRepositories.length == 0
      ? {}
      : { COURSIER_REPOSITORIES: customRepositories }

  // TODO explain what all of these flags are
  const fetchProcess = spawn(
    javaPath,
    javaOptions.concat(fetchProperties).concat([
      "-jar",
      coursierPath,
      "fetch",
      "-p",
      "--ttl",
      // Use infinite ttl to avoid redunant "Checking..." logs when using SNAPSHOT
      // versions. Metals SNAPSHOT releases are effectively immutable since we
      // never publish the same version twice.
      "Inf",
      `org.scalameta:metals_2.12:${serverVersion}`,
      "-r",
      "bintray:scalacenter/releases",
      "-r",
      "sonatype:public",
      "-r",
      "sonatype:snapshots",
      "-p"
    ]),
    {
      env: {
        COURSIER_NO_TERM: "true",
        ...customRepositoriesEnv,
        ...process.env
      }
    }
  )

  const title = `Downloading Metals v${serverVersion}`
  workspace.showMessage(title)

  trackDownloadProgress(title, fetchProcess)
    .then(classpath => workspace.showMessage(classpath))
}


function trackDownloadProgress(
  title: string,
  download: ChildProcessPromise
): Promise<string> {
  const progressItem = workspace.createStatusBarItem(0, {progress: true})
  let stdout: Buffer[] = []
  download.stdout.on("data", (out: Buffer) => {
    stdout.push(out)
  })
  download.stderr.on("data", (err: Buffer) => {
    const msg = err.toString().trim()
    if (!msg.startsWith("Downloading")) {
      progressItem.text = msg
      progressItem.show()
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

function dottyIdeArtifact(): string | undefined {
  // TODO the fsPath doesn't exist in the coc api, so make sure
  // the joined path is correct
  if (workspace.workspaceFolders) {
    return path.join(
      workspace.workspaceFolders[0].uri,
      ".dotty-ide-artifact"
    )
  }
}

function migrateStringSettingToArray(id: string): void {
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

function javaOpts(): string[] {
  function expandVariable(variable: string | undefined): string[] {
    if (variable) {
      workspace.showMessage("Using JAVA options set in JAVA_OPTS")
      return parse(variable).filter(
        (entry): entry is string => {
          if (typeof entry === "string") {
            return true
          } else {
            workspace.showMessage(
              `Ignoring unexpected JAVA_OPTS token: ${entry}`
            )
            return false
          }
        }
      )
    } else {
      return []
    }
  }
  const javaOpts = expandVariable(process.env.JAVA_OPTS)
  const javaFlags = expandVariable(process.env.JAVA_FLAGS)
  return javaOpts.concat(javaFlags)
}

function jvmOpts(): string[] {
  if (workspace.workspaceFolders) {
    const jvmoptsPath = path.join(
      workspace.workspaceFolders[0].uri,
      ".jvmopts"
    )
    if (fs.existsSync(jvmoptsPath)) {
      workspace.showMessage("Using JVM options set in " + jvmoptsPath)
      const raw = fs.readFileSync(jvmoptsPath, "utf8")
      return raw.match(/[^\r\n]+/g) || []
    }
  }
  return []
}

function getJavaOptions(): string[] {
  const combinedOptions = [
    ...javaOpts(),
    ...jvmOpts()
  ]
  const options = combinedOptions.reduce(
    (options, line) => {
      if (
        line.startsWith("-") &&
        !line.startsWith("-Xms") &&
        !line.startsWith("-Xmx") &&
        !line.startsWith("-Xss")
      ) {
        return [...options, line]
      }
      return options
    },
    [] as string[]
  )
  return options
}
