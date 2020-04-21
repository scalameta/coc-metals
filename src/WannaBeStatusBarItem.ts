import { StatusBarItem, workspace } from "coc.nvim";

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
export default class WannaBeStatusBarItem implements StatusBarItem {
  private frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  private interval: NodeJS.Timer;
  private counter = 0;

  public isProgress = false;
  public text: string = "";
  public priority = 0;

  constructor(priority: number, isProgress: boolean, initialMessage: string) {
    this.priority = priority;
    this.isProgress = isProgress;
    this.text = initialMessage;
    this.interval = setInterval(() => {
      this.showText();
    }, 1000);
  }

  public hide = () => this.dispose();
  public show = () => this.showText();
  public dispose = () => clearInterval(this.interval);
  public update = (newText: string) => (this.text = newText);

  private getText(): string {
    let textToDisplay: string;
    if (this.frames[this.counter] === undefined) {
      this.counter = 0;
    }
    if (this.isProgress && this.text.trim() !== "") {
      textToDisplay = this.text + this.frames[this.counter];
      this.counter++;
    } else {
      textToDisplay = this.text;
    }
    return textToDisplay;
  }

  private async showText(): Promise<void> {
    workspace.showMessage(this.getText());
  }
}
