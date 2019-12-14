import { workspace } from "coc.nvim";

/**
 * ProgressItem is meant to mimic the the progress you can display using
 * `workspace.createStatusBarItem(0, { progress: true})`. Since we can't
 * guarauntee a user has a statusline integration, it won't do a lot of
 * good to display longer processes there. This will ensure that the user
 * can still see it is a longer running process as a workspace messages.
 * Later on, logic can be build in to handle the case where a user may
 * have a statusline and would like to have this displayed there along
 * with other long lived processes.
 */
export default class ProgressItem {
  private frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  private _text = "";
  private interval: NodeJS.Timer;
  private counter = 0;
  constructor() {
    this.interval = setInterval(() => {
      this.showProgress();
    }, 1000);
  }
  public createStatusBarItem(initialMessage: string) {
    this._text = initialMessage;
    let item = {
      update: (text: string) => {
        this._text = text;
      },
      dispose: () => {
        clearInterval(this.interval);
      }
    };
    this.showProgress();
    return item;
  }

  private getText(): string {
    if (this.frames[this.counter] === undefined) {
      this.counter = 0;
    }
    const textToDisplay =
      this._text.trim() !== ""
        ? this._text + this.frames[this.counter]
        : this._text;
    this.counter++;
    return textToDisplay;
  }

  private async showProgress(): Promise<void> {
    let text = this.getText();
    workspace.showMessage(text);
  }
}
