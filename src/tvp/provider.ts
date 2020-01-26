import { Event } from 'vscode-jsonrpc'
import { Position, TextDocument } from 'vscode-languageserver-protocol'

import { MetalsTreeRevealResult, TreeViewNode } from './domain'

export interface TreeViewProvider {

  viewId: string

  updatedNodes: Event<TreeViewNode>

  loadNodeChildren(
    parentNode?: string
  ): Thenable<TreeViewNode[]>

  loadParentInfo(
    docPositionParams: TextDocument,
    position: Position
  ): Thenable<MetalsTreeRevealResult>

  sendTreeViewVisibilityNotification(
    visible: boolean
  ): void

  sendTreeNodeVisibilityNotification(
    childNode: string,
    collapsed: boolean
  ): void
}
