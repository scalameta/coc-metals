import { NotificationType } from "vscode-languageserver-protocol";
import { DecorationOptions } from "./portedProtocol";

/**
 * As much as I'd like to move the decoration protocol over to the shared
 * library it's too intertwined with VS Code.
 */
export interface PublishDecorationsParams {
  uri: string;
  options: DecorationOptions[];
}

export namespace DecorationsRangesDidChange {
  export const type = new NotificationType<PublishDecorationsParams, void>(
    "metals/publishDecorations"
  );
}
