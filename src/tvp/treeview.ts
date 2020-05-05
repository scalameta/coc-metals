import { Buffer, Neovim, Window } from "@chemzqm/neovim";
import {
  commands,
  Disposable,
  workspace,
  WorkspaceConfiguration,
} from "coc.nvim";
import * as log4js from "log4js";
import { Position, TextDocument } from "vscode-languageserver-types";
import { Node, NodeView, TreeModel, TreeModelUpdate } from "./model";
import { sequence } from "./utils";

export interface TreeViewDescription {
  name: string;
  size: number;
  expanded: string[][];
}

interface WindowWithOffsets {
  window: Window;
  curLine: number;
  topLine?: number;
}

export class TreeView implements Disposable {
  private firstUpdate = true;
  private closed = "▸";
  private open = "▾";
  private eventQueue: Promise<any> = Promise.resolve(1);
  private highlightPlaceId = 0;

  constructor(
    private nvim: Neovim,
    private config: WorkspaceConfiguration,
    private buffer: Buffer,
    private model: TreeModel,
    private logger: log4js.Logger
  ) {}

  public async init(): Promise<void> {
    await this.nvim.command(`silent file ${this.model.viewId}`);
    const commandPrefix = "nnoremap <buffer> <silent>";
    function cocCommand(param: string): string {
      return `:<C-u>CocCommand metals.tvp.view ${param} <CR>`;
    }
    await this.nvim.command(
      `${commandPrefix} ${this.config.get<string>("toggleNode")} ${cocCommand(
        "ToggleNode"
      )}`
    );
    await this.nvim.command(
      `${commandPrefix} ${this.config.get<string>(
        "forceChildrenReload"
      )} ${cocCommand("ForceChildrenReload")}`
    );
    await this.nvim.command(
      `${commandPrefix} ${this.config.get<string>(
        "gotoParentNode"
      )} ${cocCommand("ParentNode")}`
    );
    await this.nvim.command(
      `${commandPrefix} ${this.config.get<string>(
        "gotoFirstChild"
      )} ${cocCommand("FirstSibling")}`
    );
    await this.nvim.command(
      `${commandPrefix} ${this.config.get<string>(
        "gotoLastChild"
      )} ${cocCommand("LastSibling")}`
    );
    await this.nvim.command(
      `${commandPrefix} ${this.config.get<string>(
        "gotoPrevSibling"
      )} ${cocCommand("PrevSibling")}`
    );
    await this.nvim.command(
      `${commandPrefix} ${this.config.get<string>(
        "gotoLastSibling"
      )} ${cocCommand("NextSibling")}`
    );
    await this.nvim.command(
      `${commandPrefix} ${this.config.get<string>(
        "executeCommand"
      )} ${cocCommand("ExecuteCommand")}`
    );
    await this.nvim.command(
      `${commandPrefix} ${this.config.get<string>(
        "executeCommandAndOpenSplit"
      )} ${cocCommand("ExecuteCommandAndOpenSplit")}`
    );
    await this.nvim.command(
      `${commandPrefix} ${this.config.get<string>(
        "executeCommandAndOpenVSplit"
      )} ${cocCommand("ExecuteCommandAndOpenVSplit")}`
    );
    await this.nvim.command(
      `${commandPrefix} ${this.config.get<string>(
        "executeCommandAndOpenTab"
      )} ${cocCommand("ExecuteCommandAndOpenTab")}`
    );

    await this.nvim.command(
      `au BufWinLeave <buffer> CocCommand metals.tvp.view Hidden ${this.model.viewId}`
    );

    await this.nvim.command(
      "setlocal nonumber norelativenumber nobuflisted nowrap noswapfile winfixwidth winfixheight"
    ); // cursorline")
    await this.nvim.command(
      "setlocal statusline=%f buftype=nofile bufhidden=hide"
    );

    this.model.updateEvents((ev) => this.handleModelUpdates(ev));

    const viewsConfigs = this.config.get<TreeViewDescription[]>("initialViews");
    await this.model.rootNode.expand();
    const mbDesc = viewsConfigs?.find((c) => c.name === this.model.viewId);
    if (mbDesc !== undefined) {
      await Promise.all(
        mbDesc.expanded.map((parents) =>
          this.model.revealByParents(parents.concat(""))
        )
      );
      await this.nvim.call("coc#util#jumpTo", [0, 1]);
    }
  }

  public get bufferId(): number {
    return this.buffer.id;
  }

  private async restoreCursor(
    window: Window,
    topLine: number,
    curLine: number
  ): Promise<void> {
    await window.setCursor([topLine, 1]);
    await window.setCursor([curLine, 1]);
  }

  public handleModelUpdates(initEvent: TreeModelUpdate): void {
    // hide root in trees
    let ev: TreeModelUpdate;
    if (initEvent.root.underlying.nodeUri === undefined) {
      ev = {
        root: initEvent.newNodes[1],
        oldNodes: initEvent.oldNodes.slice(1),
        newNodes: initEvent.newNodes.slice(1),
        focusEvent: initEvent.focusEvent,
      };
    } else {
      ev = initEvent;
    }

    this.eventQueue = this.eventQueue.then(async (_) => {
      const nodeOffset =
        ev.root !== undefined ? await this.model.findNodeOffset(ev.root) : 1;
      if (nodeOffset === undefined) return;
      const offset = nodeOffset - 1;

      const tabpage = await this.nvim.tabpage;
      const allWindows = await this.nvim.windows;
      const tabpageWindows = await tabpage.windows;
      const windowIds = (await this.nvim.call(
        "win_findbuf",
        this.bufferId
      )) as number[];
      const bufferWindows = allWindows.filter(
        (window) => windowIds.indexOf(window.id) != -1
      );
      if (ev.focusEvent) {
        ev.root !== undefined &&
          this.logger.debug(
            `Focus event. Root: ${ev.root.underlying.nodeUri}, offset: ${offset}.`
          );
        await sequence(bufferWindows, async (w) => {
          const needRedraw =
            tabpageWindows.find((tabwindow) => tabwindow.id === w.id) !==
            undefined;
          if (needRedraw) {
            await this.nvim.call("win_gotoid", [w.id]);
            await this.restoreCursor(w, 1, offset + 1);
            await this.nvim.command("redraw");
          }
        });
      } else {
        const payload = ev.newNodes.map((n) => n.underlying.nodeUri).join(",");
        ev.root !== undefined &&
          this.logger.debug(
            `Update event. Root: ${ev.root.underlying.nodeUri}, length: ${ev.oldNodes.length}, payload: ${payload}.`
          );
        await this.modifyBuffer(async () => {
          const offsets = await sequence(bufferWindows, async (window) => {
            const cursor = await window.cursor;
            if (
              workspace.isVim &&
              tabpageWindows.find((w) => w.id === window.id) !== undefined
            ) {
              const raw = (await this.nvim.call("win_execute", [
                window.id,
                'echo line(".").":".line("w0")',
              ])) as string;
              const lines = raw.split(":").map((str) => parseInt(str, 10));
              return {
                window,
                curLine: lines[0],
                topLine: lines[1],
              } as WindowWithOffsets;
            } else {
              return {
                window,
                curLine: cursor[0],
                topLine: undefined,
              } as WindowWithOffsets;
            }
          });
          await this.removeRows(offset, ev.oldNodes);
          await this.insertRows(offset, ev.newNodes);
          await sequence(offsets, async ({ window, curLine, topLine }) => {
            if (topLine !== undefined) {
              await this.restoreCursor(window, topLine, curLine);
              await this.nvim.call("win_execute", [window.id, `redraw`]);
            } else {
              await window.setCursor([curLine, 1]);
            }
          });
          if (this.firstUpdate) {
            this.firstUpdate = false;
            await this.buffer.remove(
              ev.newNodes.length,
              ev.newNodes.length + 1
            );
          }
        });
      }
    });
  }

  private async removeRows(from: number, nodes: NodeView[]): Promise<void> {
    await this.buffer.remove(from, from + nodes.length);
  }

  private async insertRows(offset: number, nodes: NodeView[]): Promise<void> {
    await this.buffer.insert(this.makeRows(nodes), offset);
    await Promise.all(
      nodes.map((node, idx) => {
        let highlightSchema: string | undefined;
        switch (node.underlying.icon) {
          case "trait":
            highlightSchema = "TvpTrait";
            break;
          case "class":
            highlightSchema = "TvpClass";
            break;
          case "object":
            highlightSchema = "TvpObject";
            break;
          case "method":
            highlightSchema = "TvpMethod";
            break;
          case "val":
            highlightSchema = "TvpVal";
            break;
          case "command":
          case "sync":
          case "connect":
          case "cascade":
          case "cancel":
          case "clean":
          case "debug-stop":
            highlightSchema = "TvpCommand";
            break;
          default:
            highlightSchema = "TvpTopLevel";
        }
        const placeId = this.highlightPlaceId++;
        const line = offset + idx;
        this.logger.debug(
          `signplace id=${placeId} schema=${highlightSchema} num=${line} uri=${node.underlying.nodeUri}`
        );
        return this.buffer.addHighlight({ hlGroup: highlightSchema, line });
      })
    );
  }

  public async toggleTreeViewNode(): Promise<void> {
    const node = await this.nodeUnderCursor();
    if (node === undefined || !node.expandable()) return;
    await (node.isExpanded() ? node.collapse() : node.expand());
  }

  public async forceChildrenReload(): Promise<void> {
    const node = await this.nodeUnderCursor();
    if (node === undefined || !node.expandable()) return;
    if (!node.isExpanded()) await node.expand();
    node.refreshSubtree(undefined);
  }

  public async gotoParentNode(): Promise<void> {
    const node = await this.nodeUnderCursor();
    if (node === undefined) return;
    const parent = await this.model.findParentNode(node);
    if (parent === undefined) return;
    const offset = await this.model.findNodeOffset(parent.makeView());
    if (offset === undefined) return;
    await this.nvim.call("coc#util#jumpTo", [offset - 1, 1]);
  }

  public async gotoEdgeNode(first: boolean): Promise<void> {
    const node = await this.nodeUnderCursor();
    if (node === undefined) return;
    const parent = await this.model.findParentNode(node);
    if (parent === undefined) return;
    const children = await parent.getChildren();
    if (children.length > 0) {
      const node = first ? children[0] : children[children.length - 1];
      const offset = await this.model.findNodeOffset(node.makeView());
      if (offset === undefined) return;
      await this.nvim.call("coc#util#jumpTo", [offset - 1, 1]);
    }
  }

  public async gotoNeighboringSibling(prev: boolean): Promise<void> {
    const node = await this.nodeUnderCursor();
    if (node === undefined) return;
    const parent = await this.model.findParentNode(node);
    if (parent === undefined) return;
    const children = await parent.getChildren();
    const childIdx = children.findIndex(
      (child) => child.viewNode.nodeUri === node.viewNode.nodeUri
    );
    let targetNode: Node | undefined;
    if (prev && childIdx > 0) {
      targetNode = children[childIdx - 1];
    } else if (!prev && childIdx + 1 < children.length) {
      targetNode = children[childIdx + 1];
    } else {
      targetNode = undefined;
    }
    if (targetNode === undefined) return;
    const offset = await this.model.findNodeOffset(targetNode.makeView());
    if (offset === undefined) return;
    await this.nvim.call("coc#util#jumpTo", [offset - 1, 1]);
  }

  public async executeCommand(): Promise<void> {
    const node = await this.nodeUnderCursor();
    if (node === undefined) return;
    const command = node.viewNode.command;
    if (command === undefined) return;
    if (command.arguments !== undefined) {
      return commands.executeCommand(command.command, ...command.arguments);
    } else {
      return commands.executeCommand(command.command);
    }
  }

  public async revealDocInTreeView(
    textDocument: TextDocument,
    position: Position
  ): Promise<Node | undefined> {
    return this.model.revealDocument(textDocument, position);
  }

  private makeRows(nodes: NodeView[]): string[] {
    return nodes.map((child) => {
      let icon: string;
      if (child.expandable) {
        icon = (child.expanded ? this.open : this.closed) + " ";
      } else {
        icon = "  ";
      }

      return "  ".repeat(child.level - 1) + icon + child.underlying.label;
    });
  }

  private async nodeUnderCursor(): Promise<Node | undefined> {
    const curLine = ((await this.nvim.eval("coc#util#cursor()")) as [
      number,
      number
    ])[0];
    return this.model.findNodeWithOffset(curLine + 1);
  }

  private async modifyBuffer<X>(action: () => Promise<X>): Promise<X> {
    try {
      await this.buffer.setOption("readonly", false);
      await this.buffer.setOption("modifiable", true);
      return await action();
    } finally {
      await this.buffer.setOption("modifiable", false);
      await this.buffer.setOption("readonly", true);
    }
  }

  public dispose(): void {
    this.nvim.command(`bd ${this.bufferId}`, true);
  }
}
