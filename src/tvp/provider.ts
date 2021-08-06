import {
  MetalsTreeRevealResult,
  MetalsTreeViewNode,
} from "metals-languageclient";
import { Event } from "vscode-jsonrpc";
import { Position } from "vscode-languageserver-protocol";
import { TextDocument } from "vscode-languageserver-textdocument";

export interface TreeViewProvider {
  viewId: string;

  updatedNodes: Event<MetalsTreeViewNode>;

  loadNodeChildren(parentNode?: string): Thenable<MetalsTreeViewNode[]>;

  loadParentInfo(
    docPositionParams: TextDocument,
    position: Position
  ): Thenable<MetalsTreeRevealResult>;

  sendTreeViewVisibilityNotification(visible: boolean): void;

  sendTreeNodeVisibilityNotification(
    childNode: string,
    collapsed: boolean
  ): void;
}
