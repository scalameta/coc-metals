import locateJavaHome from "locate-java-home";
import { workspace } from "coc.nvim";
import { parse } from "shell-quote";
import * as semver from "semver";
import * as fs from "fs";
import * as path from "path";

export function getJavaHome(): Promise<string> {
  const userJavaHome = workspace.getConfiguration("metals").get("javaHome");
  if (typeof userJavaHome === "string" && userJavaHome.trim() !== "") {
    return Promise.resolve(userJavaHome);
  } else {
    const JAVA_HOME = process.env["JAVA_HOME"];
    if (JAVA_HOME) return Promise.resolve(JAVA_HOME);
    else {
      return new Promise((resolve, reject) => {
        locateJavaHome({ version: ">=1.8 <=1.11" }, (err, javaHomes) => {
          if (err) {
            reject(err);
          } else if (!javaHomes || javaHomes.length === 0) {
            reject(new Error("No suitable Java version found"));
          } else {
            javaHomes.sort((a, b) => {
              const byVersion = -semver.compare(a.version, b.version);
              if (byVersion === 0) return b.security - a.security;
              else return byVersion;
            });
            const jdkHome = javaHomes.find(j => j.isJDK);
            if (jdkHome) resolve(jdkHome.path);
            else resolve(javaHomes[0].path);
          }
        });
      });
    }
  }
}

function javaOpts(): string[] {
  function expandVariable(variable: string | undefined): string[] {
    if (variable) {
      workspace.showMessage("Using JAVA options set in JAVA_OPTS");
      return parse(variable).filter((entry): entry is string => {
        if (typeof entry === "string") {
          return true;
        } else {
          workspace.showMessage(
            `Ignoring unexpected JAVA_OPTS token: ${entry}`
          );
          return false;
        }
      });
    } else {
      return [];
    }
  }
  const javaOpts = expandVariable(process.env.JAVA_OPTS);
  const javaFlags = expandVariable(process.env.JAVA_FLAGS);
  return javaOpts.concat(javaFlags);
}

function jvmOpts(): string[] {
  if (workspace.workspaceFolders) {
    const jvmoptsPath = path.join(
      workspace.workspaceFolders[0].uri,
      ".jvmopts"
    );
    if (fs.existsSync(jvmoptsPath)) {
      workspace.showMessage("Using JVM options set in " + jvmoptsPath);
      const raw = fs.readFileSync(jvmoptsPath, "utf8");
      return raw.match(/[^\r\n]+/g) || [];
    }
  }
  return [];
}

export function getJavaOptions(): string[] {
  const combinedOptions = [...javaOpts(), ...jvmOpts()];
  const options = combinedOptions.reduce((options, line) => {
    if (
      line.startsWith("-") &&
      !line.startsWith("-Xms") &&
      !line.startsWith("-Xmx") &&
      !line.startsWith("-Xss")
    ) {
      return [...options, line];
    }
    return options;
  }, [] as string[]);
  return options;
}
