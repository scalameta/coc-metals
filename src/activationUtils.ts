import { Commands } from "./commands";
import { workspace } from "coc.nvim";

export async function detechLauncConfigurationChanges() {
  workspace.onDidChangeConfiguration(change => {
    const promptRestartKeys = [
      "serverVersion",
      "serverProperties",
      "javaHome",
      "customRepositories"
    ];

    const shouldPromptRestart = promptRestartKeys.some(key =>
      change.affectsConfiguration(`metals.${key}`)
    );

    // Note: I used to just have a prompt here, but was having issues
    // with it working correctly with vim even using async await.
    if (shouldPromptRestart) {
      workspace
        .showQuickpick(
          ["Reload Window", "Ignore for now"],
          "Server configuration changes detected. Would you like to reload the window for them to take affect?"
        )
        .then(choice => {
          if (choice === 0) {
            workspace.nvim.command(Commands.RESTART_COC, true);
          }
        });
    }
  });
}
