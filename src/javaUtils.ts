import { workspace } from "coc.nvim";
import { parse } from "shell-quote";
import * as fs from "fs";
import * as path from "path";

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
