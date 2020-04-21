import {
  ExecuteCommandParams,
  NotificationType,
  RequestType,
} from "vscode-languageserver-protocol";
import { DecorationOptions, InputBoxOptions } from "./portedProtocol";

export namespace ExecuteClientCommand {
  export const type = new NotificationType<ExecuteCommandParams, void>(
    "metals/executeClientCommand"
  );
}

export namespace MetalsInputBox {
  export const type = new RequestType<
    InputBoxOptions,
    MetalsInputBoxResult,
    void,
    void
  >("metals/inputBox");
}

export interface MetalsSlowTaskParams {
  message: string;
  quietLogs?: boolean;
  secondsElapsed?: number;
}

export interface MetalsSlowTaskResult {
  cancel: boolean;
}

export interface MetalsStatusParams {
  text: string;
  show?: boolean;
  hide?: boolean;
  tooltip?: string;
  command?: string;
}

export interface MetalsInputBoxResult {
  value?: string;
  cancelled?: boolean;
}

export interface PublishDecorationsParams {
  uri: string;
  options: DecorationOptions[];
}

export namespace DecorationsRangesDidChange {
  export const type = new NotificationType<PublishDecorationsParams, void>(
    "metals/publishDecorations"
  );
}

export namespace MetalsDidFocus {
  export const type = new NotificationType<string, void>(
    "metals/didFocusTextDocument"
  );
}

export namespace MetalsQuickPick {
  export const type = new RequestType<
    MetalsQuickPickParams,
    MetalsQuickPickResult,
    void,
    void
  >("metals/quickPick");
}

export interface MetalsQuickPickParams {
  items: MetalsQuickPickItem[];
  matchOnDescription?: boolean;
  matchOnDetail?: boolean;
  placeHolder?: string;
  ignoreFocusOut?: boolean;
}

export interface MetalsQuickPickResult {
  itemId?: string;
  cancelled?: boolean;
}

export interface MetalsQuickPickItem {
  id: string;
  label: string;
  description?: string;
  detail?: string;
  alwaysShow?: boolean;
}

export namespace MetalsStatus {
  export const type = new NotificationType<MetalsStatusParams, void>(
    "metals/status"
  );
}

export interface MetalsStatusParams {
  text: string;
  show?: boolean;
  hide?: boolean;
  tooltip?: string;
  command?: string;
}
