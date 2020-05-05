import { MetalsTreeViewNode } from "metals-languageclient";
import { Disposable, Emitter } from "vscode-jsonrpc";
import { Position, TextDocument } from "vscode-languageserver-types";
import { TreeViewProvider } from "./provider";
import { groupBy } from "./utils";

export interface NodeView {
  underlying: MetalsTreeViewNode;
  level: number;
  expandable: boolean;
  expanded: boolean;
}

export interface TreeModelUpdate {
  root: NodeView;
  oldNodes: NodeView[];
  newNodes: NodeView[];
  focusEvent: boolean;
}

export class Node {
  private expanded: boolean;
  private children: Promise<Node[]> | undefined;
  private lastTouch = Date.now();
  private defunct = false;

  constructor(
    public viewNode: MetalsTreeViewNode,
    public level: number,
    private provider: TreeViewProvider,
    private emitter: Emitter<TreeModelUpdate>,
    private autoExpand: boolean
  ) {
    this.expanded = false;
  }

  public expandable(): boolean {
    return this.viewNode.collapseState !== undefined;
  }

  public isExpanded(): boolean {
    return this.expanded;
  }

  public async expand(): Promise<boolean> {
    async function expandInternal(
      initNode: Node,
      state: number,
      curNode: Node
    ): Promise<boolean> {
      curNode.viewNode.nodeUri &&
        curNode.provider.sendTreeNodeVisibilityNotification(
          curNode.viewNode.nodeUri,
          false
        );
      curNode.expanded = true;
      const children = await curNode.getChildren();
      if (
        children.length === 1 &&
        children[0].expandable() &&
        curNode.autoExpand
      ) {
        return expandInternal(initNode, state, children[0]);
      } else {
        const newNodes = await initNode.collectVisibleNodes();
        if (state === initNode.lastTouch && !initNode.defunct) {
          curNode.emitter.fire({
            root: initNode.makeView(),
            oldNodes: [initNode.makeView()],
            newNodes,
            focusEvent: false,
          });
          return true;
        } else {
          return false;
        }
      }
    }

    if (this.defunct) return false;

    const curState = await this.touch();
    return expandInternal(this, curState, this);
  }

  public async collapse(): Promise<boolean> {
    if (this.defunct) return false;

    this.viewNode.nodeUri &&
      this.provider.sendTreeNodeVisibilityNotification(
        this.viewNode.nodeUri,
        true
      );
    const curState = await this.touch();
    const oldNodes = await this.collectVisibleNodes();
    this.expanded = false;
    if (curState === this.lastTouch && !this.defunct) {
      this.emitter.fire({
        root: this.makeView(),
        oldNodes,
        newNodes: [this.makeView()],
        focusEvent: false,
      });
      return true;
    } else {
      return false;
    }
  }

  public async refreshSubtree(
    viewNode: MetalsTreeViewNode | undefined
  ): Promise<void> {
    async function findOpenNodes(
      acc: string[][],
      curPath: string[],
      node: Node
    ): Promise<string[][]> {
      if (node.isExpanded()) {
        acc.push(curPath);
        const children = await node.getChildren();
        return children.reduce(async (zP, child) => {
          return zP.then((z) =>
            findOpenNodes(
              z,
              child.viewNode.nodeUri
                ? curPath.concat(child.viewNode.nodeUri)
                : curPath,
              child
            )
          );
        }, Promise.resolve(acc));
      } else {
        return acc;
      }
    }

    async function reloadSubtree(
      node: Node,
      openNodes: string[][]
    ): Promise<void> {
      if (openNodes.length != 0) {
        const children = await node.getChildren();
        const childToNodes = groupBy(
          openNodes.filter((node) => node.length != 0),
          (arr) => arr[0]
        );
        if (
          children.length === 1 &&
          node.autoExpand &&
          childToNodes.size === 0 &&
          children[0].expandable() &&
          children[0].viewNode.nodeUri
        ) {
          childToNodes.set(children[0].viewNode.nodeUri, [[""]]);
        }
        await Promise.all(
          children.map((child) => {
            const mbOpenNodes = child.viewNode.nodeUri
              ? childToNodes.get(child.viewNode.nodeUri)
              : undefined;
            if (mbOpenNodes === undefined) {
              return Promise.resolve();
            } else {
              child.expanded = true;
              const nextOpenNodes = mbOpenNodes.map((nodes) => nodes.slice(1));
              return reloadSubtree(child, nextOpenNodes);
            }
          })
        );
      }
    }

    function eq(v1: NodeView, v2: NodeView): boolean {
      return (
        v1.expanded === v2.expanded &&
        v1.level === v2.level &&
        v1.expandable === v2.expandable &&
        v1.underlying.nodeUri === v2.underlying.nodeUri &&
        v1.underlying.viewId === v2.underlying.viewId &&
        v1.underlying.label === v2.underlying.label
      );
    }

    function optimizeEvent(ev: TreeModelUpdate): TreeModelUpdate | undefined {
      let start = 0;
      while (
        start < ev.oldNodes.length &&
        start < ev.newNodes.length &&
        eq(ev.oldNodes[start], ev.newNodes[start])
      ) {
        start++;
      }
      let end = 0;
      while (
        start + end < ev.oldNodes.length &&
        start + end < ev.newNodes.length &&
        eq(
          ev.oldNodes[ev.oldNodes.length - end - 1],
          ev.newNodes[ev.newNodes.length - end - 1]
        )
      ) {
        end++;
      }
      const oldNodes =
        end !== 0 ? ev.oldNodes.slice(start, -end) : ev.oldNodes.slice(start);
      const newNodes =
        end !== 0 ? ev.newNodes.slice(start, -end) : ev.newNodes.slice(start);
      if (oldNodes.length === 0 && newNodes.length === 0) {
        return undefined;
      } else if (newNodes.length > 0) {
        return {
          root: newNodes[0],
          oldNodes,
          newNodes,
          focusEvent: false,
        };
      } else {
        // Optimization failed. Let's just handle whole `ev`.
        return ev;
      }
    }

    const oldNodes = await this.collectVisibleNodes();
    if (this.isExpanded()) {
      const children = await this.getChildren();
      await Promise.resolve(children.map((child) => child.markAsDefunct()));
    }
    const openNodes = await findOpenNodes([], [], this);
    this.children = undefined;
    await reloadSubtree(this, openNodes);
    if (viewNode !== undefined) {
      this.viewNode = viewNode;
    }
    const visibleNodes = await this.collectVisibleNodes();

    const mbEvent = optimizeEvent({
      root: this.makeView(),
      oldNodes,
      newNodes: visibleNodes,
      focusEvent: false,
    });
    if (mbEvent !== undefined) {
      this.emitter.fire(mbEvent);
    }
  }

  public getChildren(): Promise<Node[]> {
    if (this.children === undefined) {
      const level = this.level;
      const promise = Promise.resolve(
        this.provider.loadNodeChildren(this.viewNode.nodeUri)
      ).then((nodes) =>
        nodes.map(
          (node) =>
            new Node(
              node,
              level + 1,
              this.provider,
              this.emitter,
              this.autoExpand
            )
        )
      );
      return (this.children = promise);
    } else {
      return this.children;
    }
  }

  public async height(): Promise<number> {
    if (this.isExpanded()) {
      const children = await this.getChildren();
      const heights = await Promise.all(
        children.map((child) => child.height())
      );
      return heights.reduce((h1, h2) => h1 + h2, 1);
    } else {
      return 1;
    }
  }

  private async collectVisibleNodes(): Promise<NodeView[]> {
    async function collectInternal(
      acc: NodeView[],
      node: Node
    ): Promise<NodeView[]> {
      const newAcc = acc.concat(node.makeView());
      if (node.isExpanded()) {
        const children = await node.getChildren();
        return children.reduce(
          (zP, child) => zP.then((z) => collectInternal(z, child)),
          Promise.resolve(newAcc)
        );
      } else {
        return newAcc;
      }
    }
    return collectInternal([], this);
  }

  private async touch(): Promise<number> {
    const state = (this.lastTouch = Date.now());
    if (this.isExpanded()) {
      const children = await this.getChildren();
      return Promise.all(children.map((child) => child.touch())).then(
        (_) => state
      );
    } else {
      return state;
    }
  }

  private async markAsDefunct(): Promise<void> {
    this.defunct = true;
    if (this.isExpanded()) {
      const children = await this.getChildren();
      await Promise.all(children.map((child) => child.markAsDefunct()));
    }
  }

  public makeView(): NodeView {
    return {
      underlying: this.viewNode,
      level: this.level,
      expandable: this.expandable(),
      expanded: this.isExpanded(),
    };
  }
}

export class TreeModel implements Disposable {
  private emitter = new Emitter<TreeModelUpdate>();
  public readonly updateEvents = this.emitter.event;
  public readonly rootNode: Node;
  private visible: boolean = false;

  constructor(private provider: TreeViewProvider, private autoExpand: boolean) {
    const viewId = provider.viewId;
    const treeViewNode: MetalsTreeViewNode = { viewId, label: viewId };
    this.rootNode = new Node(
      treeViewNode,
      0,
      provider,
      this.emitter,
      this.autoExpand
    );
    provider.updatedNodes((node) => {
      if (node.nodeUri !== undefined) {
        void this.findNodeByUri(node.nodeUri).then((treeNode) => {
          if (treeNode !== undefined) return treeNode.refreshSubtree(node);
        });
      } else {
        void this.rootNode.refreshSubtree(undefined);
      }
    });
  }

  public get viewId(): string {
    return this.provider.viewId;
  }

  public show(): void {
    if (!this.visible) {
      this.visible = true;
      return this.provider.sendTreeViewVisibilityNotification(true);
    }
  }

  public hide(): void {
    if (this.visible) {
      this.visible = false;
      return this.provider.sendTreeViewVisibilityNotification(false);
    }
  }

  private async findNodeWithOffsetInternal(
    node: Node,
    offset: number
  ): Promise<Node | undefined> {
    if (offset == 0) {
      return node;
    } else {
      const children = await node.getChildren();
      return children
        .reduce(
          async (stateP, child) => {
            const state = await stateP;
            if (state.result) {
              return state;
            } else {
              return child.height().then((childHeight) => {
                if (state.height + childHeight <= offset) {
                  return {
                    height: state.height + childHeight,
                    result: undefined,
                  };
                } else {
                  return this.findNodeWithOffsetInternal(
                    child,
                    offset - state.height
                  ).then((result) => ({ height: 0, result }));
                }
              });
            }
          },
          Promise.resolve<{ height: number; result?: Node }>({ height: 1 })
        )
        .then((state) => state.result);
    }
  }

  public async findNodeWithOffset(offset: number): Promise<Node | undefined> {
    return this.findNodeWithOffsetInternal(this.rootNode, offset);
  }

  public async findNodeOffset(nodeView: NodeView): Promise<number | undefined> {
    async function findNodeOffsetInternal(
      acc: [number, boolean],
      node: Node
    ): Promise<[number, boolean]> {
      if (node.viewNode.nodeUri === nodeView.underlying.nodeUri || acc[1]) {
        return [acc[0], true];
      } else if (node.isExpanded()) {
        const children = await node.getChildren();
        const init: [number, boolean] = [acc[0] + 1, acc[1]];
        return children.reduce(async (zP, child) => {
          return zP.then((z) => findNodeOffsetInternal(z, child));
        }, Promise.resolve(init));
      } else {
        return [acc[0] + 1, acc[1]];
      }
    }
    return findNodeOffsetInternal([0, false], this.rootNode).then(
      ([offset, found]) => {
        return found ? offset : undefined;
      }
    );
  }

  public async findParentNode(node: Node): Promise<Node | undefined> {
    async function internal(
      result: Node | undefined,
      parent: Node
    ): Promise<Node | undefined> {
      if (result !== undefined) {
        return result;
      } else if (parent.isExpanded()) {
        const children = await parent.getChildren();
        return children.reduce(async (zP, child) => {
          const z = await zP;
          if (z !== undefined) {
            return z;
          } else if (child.viewNode.nodeUri === node.viewNode.nodeUri) {
            return parent;
          } else {
            return internal(undefined, child);
          }
        }, Promise.resolve<Node | undefined>(undefined));
      } else {
        return undefined;
      }
    }
    return internal(undefined, this.rootNode);
  }

  public async revealDocument(
    textDocument: TextDocument,
    position: Position
  ): Promise<Node | undefined> {
    const revealResult = await Promise.resolve(
      this.provider.loadParentInfo(textDocument, position)
    );
    const parents = revealResult.uriChain.reverse();
    const result = await this.revealDocumentInternal(parents, this.rootNode);
    if (result !== undefined) {
      this.emitter.fire({
        root: result.makeView(),
        oldNodes: [],
        newNodes: [],
        focusEvent: true,
      });
    }
    return result;
  }

  public async revealByParents(parents: string[]): Promise<Node | undefined> {
    return this.revealDocumentInternal(parents, this.rootNode);
  }

  private async revealDocumentInternal(
    parents: string[],
    node: Node
  ): Promise<Node | undefined> {
    if (parents.length != 0) {
      const childUri = parents[0];
      const expanded = node.isExpanded() ? true : await node.expand();
      if (expanded) {
        const children = await node.getChildren();
        const child = children.find(
          (child) => child.viewNode.nodeUri === childUri
        );
        if (child) {
          return this.revealDocumentInternal(parents.slice(1), child);
        } else {
          return;
        }
      } else {
        return;
      }
    } else {
      return node;
    }
  }

  private async findNodeByUri(uri: String): Promise<Node | undefined> {
    async function findNodeByUriInternal(
      acc: Node | undefined,
      node: Node
    ): Promise<Node | undefined> {
      if (acc !== undefined) {
        return acc;
      } else if (node.viewNode.nodeUri === uri) {
        return node;
      } else if (node.isExpanded()) {
        const children = await node.getChildren();
        return children.reduce(async (zP, child) => {
          return zP.then((z) => findNodeByUriInternal(z, child));
        }, Promise.resolve<Node | undefined>(undefined));
      } else {
        return undefined;
      }
    }
    return findNodeByUriInternal(undefined, this.rootNode);
  }

  public dispose(): void {
    this.emitter.dispose();
  }
}
