import {
  InitializeParams,
  ServerCapabilities
} from "vscode-languageserver-protocol";
import { StaticFeature, workspace } from "coc.nvim";

export interface DebuggingProvider {}
export interface DecorationProvider {}
export interface QuickPickProvider {}
export interface InputBoxProvider {}

export class MetalsFeatures implements StaticFeature {
  debuggingProvider?: DebuggingProvider;
  decorationProvider?: DecorationProvider;
  quickPickProvider?: QuickPickProvider;
  inputBoxProvider?: InputBoxProvider;

  fillInitializeParams(params: InitializeParams): void {
    if (!params.capabilities.experimental) {
      params.capabilities.experimental = {};
    }
    (params.capabilities.experimental as any).debuggingProvider = false;
    (params.capabilities.experimental as any).decorationProvider =
      workspace.isNvim;
    (params.capabilities.experimental as any).quickPickProvider = true;
    (params.capabilities.experimental as any).inputBoxProvider = true;
  }
  fillClientCapabilities(): void {}
  initialize(capabilities: ServerCapabilities): void {
    if (capabilities.experimental) {
      this.debuggingProvider = capabilities.experimental.debuggingProvider;
      this.decorationProvider = capabilities.experimental.decorationProvider;
      this.quickPickProvider = capabilities.experimental.quickPickProvider;
      this.inputBoxProvider = capabilities.experimental.inputBoxProvider;
    }
  }
}
