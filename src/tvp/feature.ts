import { BaseLanguageClient, DynamicFeature, RegistrationData, Event } from 'coc.nvim'
import {
  ClientCapabilities, RPCMessageType, ServerCapabilities, Emitter,
  ExecuteCommandParams, ExecuteCommandRequest, TextDocumentPositionParams, TextDocument, Position,
  NotificationType, RequestType, Disposable
} from 'vscode-languageserver-protocol'
import {
  TreeViewChildrenParams, TreeViewChildrenResult, TreeViewDidChangeParams,
  TreeViewNodeCollapseDidChangeParams, TreeViewVisibilityDidChangeParams, TreeViewNode,
  MetalsTreeRevealResult
} from './domain'
import { commands } from 'coc.nvim'
import { TreeViewProvider } from './provider'

export class TreeViewFeature implements DynamicFeature<void> {

  private requestType =
    new RequestType<void, any, void, void>('metals/treeView')
  private treeViewChildrenParamsType =
    new RequestType<TreeViewChildrenParams, TreeViewChildrenResult, void, void>('metals/treeViewChildren')
  private treeViewRevealType =
    new RequestType<TextDocumentPositionParams, MetalsTreeRevealResult, void, void>('metals/treeViewReveal')

  private treeViewDidChangeType =
    new NotificationType<TreeViewDidChangeParams, void>('metals/treeViewDidChange')

  private treeViewVisibilityChangedType =
    new NotificationType<TreeViewVisibilityDidChangeParams, void>('metals/treeViewVisibilityDidChange')
  private treeViewNodeCollapseChangedType =
    new NotificationType<TreeViewNodeCollapseDidChangeParams, void>('metals/treeViewNodeCollapseDidChange')

  private providerEmitter: Emitter<TreeViewProvider> = new Emitter()
  private viewUpdaters: Map<string, Emitter<TreeViewNode>> = new Map()
  private mbGotoCommandDisposable: Disposable | undefined = undefined

  constructor(private _client: BaseLanguageClient) { }

  public get messages(): RPCMessageType {
    return this.requestType
  }

  public fillClientCapabilities(capabilities: ClientCapabilities): void {
    if (capabilities.experimental == null) {
      capabilities.experimental = {}
    }
    (capabilities.experimental as any).treeViewProvider = true
  }

  public initialize(
    capabilities: ServerCapabilities,
  ): void {
    if (!capabilities.experimental!.treeViewProvider) return
    const client = this._client

    client.onNotification(this.treeViewDidChangeType, message => {
      message.nodes.forEach(node => {
        const viewId = node.viewId
        const mbViewUpdater = this.viewUpdaters.get(viewId)
        if (mbViewUpdater === undefined) {
          const updatesEmitter = new Emitter<TreeViewNode>()
          const provider: TreeViewProvider = {
            viewId,

            updatedNodes: updatesEmitter.event,

            loadNodeChildren: (
              parentNode?: string
            ): Promise<TreeViewNode[]> => {
              const result = client
                .sendRequest(this.treeViewChildrenParamsType, { viewId, nodeUri: parentNode })
                .then(response => response.nodes)
              return Promise.resolve(result)
            },

            loadParentInfo: (
              document: TextDocument,
              position: Position
            ): Promise<MetalsTreeRevealResult> => {
              const tweakedPosition = { line: position.line + 1, character: position.character }
              const arg: TextDocumentPositionParams = {
                textDocument: {
                  uri: document.uri,
                },
                position: tweakedPosition
              }
              return Promise.resolve(client.sendRequest(this.treeViewRevealType, arg))
            },

            sendTreeViewVisibilityNotification: (
              visible: boolean
            ): void => {
              client.sendNotification(this.treeViewVisibilityChangedType, { viewId, visible })
            },

            sendTreeNodeVisibilityNotification: (
              childNode: string,
              collapsed: boolean
            ): void => {
              client.sendNotification(this.treeViewNodeCollapseChangedType, { viewId, nodeUri: childNode, collapsed })
            }
          }
          this.providerEmitter.fire(provider)
          this.viewUpdaters.set(viewId, updatesEmitter)
        } else {
          mbViewUpdater.fire(node)
        }
      })
    })

    this.mbGotoCommandDisposable = commands.registerCommand("metals.goto", async (...args: any[]) => {
      let params: ExecuteCommandParams = {
        command: "metals.goto",
        arguments: args
      }
      return client
        .sendRequest(ExecuteCommandRequest.type, params)
        .then(undefined, error => {
          client.logFailedRequest(ExecuteCommandRequest.type, error)
        })
    }, null, true)
  }

  public providerEvents(): Event<TreeViewProvider> {
    return this.providerEmitter.event
  }

  /* tslint:disable:no-empty */
  public register(_message: RPCMessageType, _data: RegistrationData<void>): void { }

  /* tslint:disable:no-empty */
  public unregister(_: string): void { }

  public dispose(): void {
    this.providerEmitter.dispose()
    this.viewUpdaters.forEach(emitter => emitter.dispose())
    if (this.mbGotoCommandDisposable !== undefined) this.mbGotoCommandDisposable.dispose()
  }
}
