import {
  BaseLanguageClient,
  commands,
  DynamicFeature,
  Event,
  RegistrationData,
} from "coc.nvim";
import {
  MetalsTreeRevealResult,
  MetalsTreeViewChildren,
  MetalsTreeViewDidChange,
  MetalsTreeViewNode,
  MetalsTreeViewNodeCollapseDidChange,
  MetalsTreeViewReveal,
  MetalsTreeViewVisibilityDidChange,
  ServerCommands,
} from "metals-languageclient";
import {
  Disposable,
  Emitter,
  ExecuteCommandParams,
  ExecuteCommandRequest,
  Position,
  RequestType,
  RPCMessageType,
  TextDocument,
  TextDocumentPositionParams,
} from "vscode-languageserver-protocol";
import { TreeViewProvider } from "./provider";

export class TreeViewFeature implements DynamicFeature<void> {
  private requestType = new RequestType<void, any, void, void>(
    "metals/treeView"
  );

  private providerEmitter: Emitter<TreeViewProvider> = new Emitter();
  private viewUpdaters: Map<string, Emitter<MetalsTreeViewNode>> = new Map();
  private mbGotoCommandDisposable: Disposable | undefined = undefined;

  constructor(private _client: BaseLanguageClient) {}

  public get messages(): RPCMessageType {
    return this.requestType;
  }

  public fillClientCapabilities(): void {}

  public initialize(): void {
    const client = this._client;

    client.onNotification(MetalsTreeViewDidChange.type, (params) => {
      params.nodes.forEach((node) => {
        const viewId = node.viewId;
        const mbViewUpdater = this.viewUpdaters.get(viewId);
        if (mbViewUpdater === undefined) {
          const updatesEmitter = new Emitter<MetalsTreeViewNode>();
          const provider: TreeViewProvider = {
            viewId,
            updatedNodes: updatesEmitter.event,
            loadNodeChildren: (
              parentNode?: string
            ): Promise<MetalsTreeViewNode[]> => {
              const result = client
                .sendRequest(MetalsTreeViewChildren.type, {
                  viewId,
                  nodeUri: parentNode,
                })
                .then((response) => response.nodes);
              return Promise.resolve(result);
            },

            loadParentInfo: (
              document: TextDocument,
              position: Position
            ): Promise<MetalsTreeRevealResult> => {
              const tweakedPosition = {
                line: position.line + 1,
                character: position.character,
              };
              const arg: TextDocumentPositionParams = {
                textDocument: {
                  uri: document.uri,
                },
                position: tweakedPosition,
              };
              return Promise.resolve(
                client.sendRequest(MetalsTreeViewReveal.type, arg)
              );
            },

            sendTreeViewVisibilityNotification: (visible: boolean): void => {
              client.sendNotification(MetalsTreeViewVisibilityDidChange.type, {
                viewId,
                visible,
              });
            },

            sendTreeNodeVisibilityNotification: (
              childNode: string,
              collapsed: boolean
            ): void => {
              client.sendNotification(
                MetalsTreeViewNodeCollapseDidChange.type,
                {
                  viewId,
                  nodeUri: childNode,
                  collapsed,
                }
              );
            },
          };
          this.providerEmitter.fire(provider);
          this.viewUpdaters.set(viewId, updatesEmitter);
        } else {
          mbViewUpdater.fire(node);
        }
      });
    });

    this.mbGotoCommandDisposable = commands.registerCommand(
      `metals.${ServerCommands.Goto}`,
      async (...args: any[]) => {
        let params: ExecuteCommandParams = {
          command: ServerCommands.Goto,
          arguments: args,
        };
        return client
          .sendRequest(ExecuteCommandRequest.type, params)
          .then(undefined, (error) => {
            client.logFailedRequest(ExecuteCommandRequest.type, error);
          });
      },
      null,
      true
    );
  }

  public providerEvents(): Event<TreeViewProvider> {
    return this.providerEmitter.event;
  }

  public register(
    _message: RPCMessageType,
    _data: RegistrationData<void>
  ): void {}

  public unregister(_: string): void {}

  public dispose(): void {
    this.providerEmitter.dispose();
    this.viewUpdaters.forEach((emitter) => emitter.dispose());
    if (this.mbGotoCommandDisposable !== undefined)
      this.mbGotoCommandDisposable.dispose();
  }
}
