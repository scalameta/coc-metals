import { FloatFactory, workspace } from "coc.nvim";
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
    const doc = workspace.getDocument(decorationParams.uri);
    const { buffer } = doc;
    // NOTE: For now, worksheets seem small enough that what we are doing
    // here by clearing the entire namespace and emptying the decorations
    // array doesn't really matter. If this ever becomes an issue, we can
    // address in then.
    buffer.clearNamespace(this.decorationNameSpace);
    this.currentDecorations = [];

    decorationParams.options.forEach((option: DecorationOptions) => {
      this.currentDecorations.push(option);
      buffer.setVirtualText(this.decorationNameSpace, option.range.end.line, [
        [
          option.renderOptions?.after?.contentText?.replace("//", "‣") ?? "",
          "test",
        ],
      ]);
    });
  }

  public async showHover() {
    const { position } = await workspace.getCurrentState();
    const hoverText = this.currentDecorations.find(
      (decoration) => decoration.range.end.line === position.line
    );

    if (
      hoverText &&
      typeof hoverText.hoverMessage !== "string" &&
      hoverText.hoverMessage
    ) {
      await this.floatFactory.create(
        [
          {
            content: hoverText.hoverMessage.value,
            filetype: hoverText.hoverMessage.language,
          },
        ],
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
