import { Command, Definition } from 'vscode-languageserver-protocol'

export interface TreeViewNode {
  /** The ID of the view that this node is associated with. */
  viewId: string
  /** The URI of this node, or undefined if node is a root of the tree. */
  nodeUri?: string
  /** The title to display for this node. */
  label: string
  /** An optional command to trigger when the user clicks on node. */
  command?: Command
  /** An optional SVG icon to display next to the label of this node. */
  icon?: string
  /** An optional description of this node that is displayed when the user hovers over this node. */
  tooltip?: string
  /**
   * Whether this tree node should be collapsed, expanded or if it has no children.
   *
   * - undefined: this node has no children.
   * - collapsed: this node has children and this node should be auto-expanded
   *   on the first load.
   * - expanded: this node has children and the user should manually expand
   *   this node to see the children.
   */
  collapseState?: "expanded" | "collapsed"
}

export interface TreeViewDidChangeParams {
  /** The nodes that have changed. */
  nodes: TreeViewNode[]
}

export interface TreeViewChildrenParams {
  /** The ID of the view that this node is associated with. */
  viewId: string
  /** The URI of the parent node or undefined when listing the root node. */
  nodeUri?: string
}

export interface TreeViewChildrenResult {
  /** The child nodes of the requested parent node. */
  nodes: TreeViewNode[]
}

export interface TreeViewVisibilityDidChangeParams {
  /** The ID of the view that this node is associated with. */
  viewId: string
  /** True if the node is visible in the editor UI, false otherwise. */
  visible: boolean
}

export interface TreeViewNodeCollapseDidChangeParams {
  /** The ID of the view that this node is associated with. */
  viewId: string
  /** The URI of the node that was collapsed or expanded. */
  nodeUri: string
  /** True if the node is collapsed, false if the node was expanded. */
  collapsed: boolean
}

export interface MetalsClientCommandParams {
  command: string
  arguments: Definition
}

export interface MetalsTreeRevealResult {
  /** The ID of the view that this node is associated with. */
  viewId: string
  /**
   * The list of URIs for the node to reveal and all of its ancestor parents.
   *
   * The node to reveal is at index 0, it's parent is at index 1 and so forth
   * up until the root node.
   */
  uriChain: string[]
}
