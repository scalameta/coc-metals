import {
  InitializeParams,
  ServerCapabilities
} from "vscode-languageserver-protocol";
import { StaticFeature, workspace } from "coc.nvim";

export interface DebuggingProvider {}
export interface DecorationProvider {}
export interface QuickPickProvider {}

export class MetalsFeatures implements StaticFeature {
  debuggingProvider?: DebuggingProvider;
  decorationProvider?: DecorationProvider;
  quickPickProvider?: QuickPickProvider;

  fillInitializeParams(params: InitializeParams): void {
    if (!params.capabilities.experimental) {
      params.capabilities.experimental = {};
    }
    (params.capabilities.experimental as any).debuggingProvider = false;
    (params.capabilities.experimental as any).decorationProvider =
      workspace.isNvim;
    (params.capabilities.experimental as any).quickPickProvider = true;
  }
  fillClientCapabilities(): void {}
  initialize(capabilities: ServerCapabilities): void {
    if (capabilities.experimental) {
      this.debuggingProvider = capabilities.experimental.debuggingProvider;
      this.decorationProvider = capabilities.experimental.decorationProvider;
      this.quickPickProvider = capabilities.experimental.quickPickProvider;
    }
  }
}
