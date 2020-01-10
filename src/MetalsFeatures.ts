import {
  InitializeParams,
  ServerCapabilities
} from "vscode-languageserver-protocol";
import { StaticFeature, workspace } from "coc.nvim";

export interface TreeViewProvider {}
export interface DebuggingProvider {}
export interface DecorationProvider {}

export class MetalsFeatures implements StaticFeature {
  treeViewProvider?: TreeViewProvider;
  debuggingProvider?: DebuggingProvider;
  decorationProvider?: DecorationProvider;

  fillInitializeParams(params: InitializeParams): void {
    if (!params.capabilities.experimental) {
      params.capabilities.experimental = {};
    }
    params.capabilities.experimental.treeViewProvider = false;
    params.capabilities.experimental.debuggingProvider = false;
    params.capabilities.experimental.decorationProvider = workspace.isNvim
      ? true
      : false;
  }
  fillClientCapabilities(): void {}
  initialize(capabilities: ServerCapabilities): void {
    if (capabilities.experimental) {
      this.treeViewProvider = capabilities.experimental.treeViewProvider;
      this.debuggingProvider = capabilities.experimental.debuggingProvider;
      this.decorationProvider = capabilities.experimental.decorationProvider;
    }
  }
}
