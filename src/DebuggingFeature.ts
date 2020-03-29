import { BaseLanguageClient, StaticFeature, Neovim } from "coc.nvim";
import {
  ExecuteCommandParams,
  ExecuteCommandRequest,
  InitializeParams,
  ServerCapabilities,
} from "vscode-languageserver-protocol";
import { commands, workspace } from "coc.nvim";

interface DebugAdapterStartResponse {
  name: string;
  uri: string;
}

export class DebuggingFeature implements StaticFeature {
  private withVimspector = false;

  constructor(private _nvim: Neovim, private _client: BaseLanguageClient) {}

  async preInit(): Promise<void> {
    this.withVimspector = (await this._nvim.getVar("loaded_vimpector")) === 1;
  }

  fillInitializeParams(params: InitializeParams): void {
    if (params.capabilities.experimental == null) {
      params.capabilities.experimental = {};
    }
    (params.capabilities.experimental as any).debuggingProvider =
      workspace.isNvim && this.withVimspector;
  }

  fillClientCapabilities(): void {}

  public initialize(capabilities: ServerCapabilities): void {
    if (
      this.withVimspector &&
      capabilities.experimental &&
      capabilities.experimental.debuggingProvider
    ) {
      const debugHandler = async (_: boolean, ...args: any[]) => {
        let params: ExecuteCommandParams = {
          command: "debug-adapter-start",
          arguments: args,
        };
        return this._client
          .sendRequest(ExecuteCommandRequest.type, params)
          .then(
            async (resp: DebugAdapterStartResponse) => {
              const colonIdx = resp.uri.lastIndexOf(":");
              if (colonIdx !== -1) {
                const port = parseInt(resp.uri.substr(colonIdx + 1));
                await this._nvim.call("vimspector#LaunchWithSettings", [
                  { configuration: "cocmetals", port },
                ]);
              }
            },
            (error) => {
              this._client.logFailedRequest(ExecuteCommandRequest.type, error);
            }
          );
      };

      commands.registerCommand(
        "metals-run-session-start",
        debugHandler.bind(this, false),
        null,
        true
      );
      commands.registerCommand(
        "metals-debug-session-start",
        debugHandler.bind(this, true),
        null,
        true
      );
    }
  }
}
