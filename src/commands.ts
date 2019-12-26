/**
 * Commonly used commands
 */
export namespace Commands {
  /**
   * Reload VS Code window
   */
  export const RELOAD_WINDOW = "workbench.action.reloadWindow";
  /**
   * Open up the coc-config file
   */
  export const OPEN_COC_CONFIG = "CocConfig";
  /**
   * Restart coc
   */
  export const RESTART_COC = "CocRestart";
  /**
   * Opens a preview window to display information such as Doctor
   */
  export const OPEN_PREVIEW = "coc#util#preview_info";
  /**
   * Returns the result of checking to see if a current preview window exists
   */
  export const HAS_PREVIEW = "coc#util#has_preview";
  /**
   * Shows Coc Info and logs
   */
  export const OPEN_LOGS = "CocInfo";
}
