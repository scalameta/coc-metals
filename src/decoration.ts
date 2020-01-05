import {workspace} from "coc.nvim";
import {PublishDecorationsParams} from "./metalsProtocol";
import {DecorationOptions} from "./portedProtocol";

export default class DecorationProvider {
  private currentDecorations: DecorationOptions[] = []
  private decorationNameSpace = workspace.createNameSpace("worksheetDecorations")

  public async setDecorations(decorationParams: PublishDecorationsParams) {
    const doc = workspace.getDocument(decorationParams.uri);
    const { buffer } = doc;


    decorationParams.options.forEach((option: DecorationOptions) => {
      // this.currentDecorations.find(decoration => decoration.range.end.line = option.range.end.line)
      this.currentDecorations.push(option)
      buffer.setVirtualText(this.decorationNameSpace, option.range.end.line, [[option.renderOptions.after.contentText.replace("//", "‣"), "test"]]);
    })
  }

  public async showHover() {
    const { document, position } = await workspace.getCurrentState()
    const buf = await workspace.nvim.createNewBuffer(false, true)
    const hoverText = this.currentDecorations.find(decoration => decoration.range.end.line === position.line)

    if (hoverText) {

      const lines: string[] = hoverText.hoverMessage.value.split("\n")

      const maxWidth = 200;
      let width = 0
      let height = 0

      for (const line of lines) {
        const byteLength = Buffer.byteLength(line);
        width = Math.max(width, Math.min(byteLength, maxWidth));
        height = height + Math.max(1, Math.ceil(byteLength / (maxWidth - 2)));
      }

      buf.replace(lines, 0)
      const win = await workspace.nvim.openFloatWindow(
        buf,
        false,
        {
          focusable: true, // do I want this?
          relative: "editor",
          height: height,
          width: width,
          row: position.line + 2,
          col: position.character + 2
        }
      )
      await win.setOption('number', false);
      await win.setOption('relativenumber', false);
      await win.setOption('cursorline', false);
      await win.setOption('cursorcolumn', false);
      await win.setOption('conceallevel', 2);
      await win.setOption('signcolumn', 'no');
      await win.setOption('foldcolumn', 1);
      await win.setOption('winhighlight', 'FoldColumn:NormalFloat');
    }
  }

  public clearDecorations(bufnr: number) {
    const doc = workspace.getDocument(bufnr);
    const { buffer } = doc;
    buffer.clearNamespace(this.decorationNameSpace)
  }
}

