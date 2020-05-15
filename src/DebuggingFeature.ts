import { BaseLanguageClient, StaticFeature, Neovim } from "coc.nvim";
import {
  ExecuteCommandParams,
  ExecuteCommandRequest,
} from "vscode-languageserver-protocol";
import { commands } from "coc.nvim";

interface DebugAdapterStartResponse {
  name: string;
  uri: string;
}

export class DebuggingFeature implements StaticFeature {
  constructor(private _nvim: Neovim, private _client: BaseLanguageClient) {}

  fillInitializeParams(): void {}

  fillClientCapabilities(): void {}

  public initialize(): void {
    const debugHandler = async (_: boolean, ...args: any[]) => {
      let params: ExecuteCommandParams = {
        command: "debug-adapter-start",
        arguments: args,
      };
      return this._client.sendRequest(ExecuteCommandRequest.type, params).then(
        async (resp: DebugAdapterStartResponse) => {
          const colonIdx = resp.uri.lastIndexOf(":");
          if (colonIdx !== -1) {
            const port = parseInt(resp.uri.substr(colonIdx + 1));
            await this._nvim.call("vimspector#LaunchWithSettings", [
              { configuration: "coc-metals", port },
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
