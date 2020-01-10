import { workspace, FloatFactory } from "coc.nvim";
import { PublishDecorationsParams } from "./metalsProtocol";
import { DecorationOptions } from "./portedProtocol";

export default class DecorationProvider {
  private currentDecorations: DecorationOptions[] = [];
  private decorationNameSpace = workspace.createNameSpace(
    "worksheetDecorations"
  );
  private floatFactory: FloatFactory;

  constructor(floatFactory: FloatFactory) {
    this.floatFactory = floatFactory;
  }

  public async setDecorations(decorationParams: PublishDecorationsParams) {
    this.currentDecorations = [];
    const doc = workspace.getDocument(decorationParams.uri);
    const { buffer } = doc;

    decorationParams.options.forEach((option: DecorationOptions) => {
      this.currentDecorations.push(option);
      buffer.setVirtualText(this.decorationNameSpace, option.range.end.line, [
        [option.renderOptions.after.contentText.replace("//", "‣"), "test"]
      ]);
    });
  }

  public async showHover() {
    const { position } = await workspace.getCurrentState();
    const hoverText = this.currentDecorations.find(
      decoration => decoration.range.end.line === position.line
    );

    if (hoverText) {
      await this.floatFactory.create(
        [{ content: hoverText.hoverMessage.value, filetype: "scala" }],
        true,
        0
      );
    }
  }

  public clearDecorations(bufnr: number) {
    const doc = workspace.getDocument(bufnr);
    const { buffer } = doc;
    buffer.clearNamespace(this.decorationNameSpace);
    this.currentDecorations = [];
  }
}
