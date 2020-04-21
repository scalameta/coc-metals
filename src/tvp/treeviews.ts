import { NeovimClient as Neovim, Tabpage, Window } from "@chemzqm/neovim";
import { Disposable, workspace, WorkspaceConfiguration } from "coc.nvim";
import * as log4js from "log4js";
import { Position, TextDocument } from "vscode-languageserver-types";
import { TreeModel } from "./model";
import { TreeView, TreeViewDescription } from "./treeview";
import { sequence } from "./utils";

interface WindowWithTree {
  window: Window;
  name: string;
}

export enum WindowProp {
  Default,
  HSplit,
  VSplit,
  Tab,
}

export class TreeViewsManager implements Disposable {
  private view2treemodel: Map<string, TreeModel> = new Map();
  private view2treeview: Map<string, TreeView> = new Map();
  private config: WorkspaceConfiguration;
  private lastWindowProp: [WindowProp, number] = [WindowProp.Default, 0];

  constructor(private nvim: Neovim, private logger: log4js.Logger) {
    this.config = workspace.configurations.getConfiguration("metals.treeviews");

    this.nvim.command("highlight default link TvpClass Constant", true);
    this.nvim.command("highlight default link TvpObject PreProc", true);
    this.nvim.command("highlight default link TvpTrait Statement", true);
    this.nvim.command("highlight default link TvpMethod Identifier", true);
    this.nvim.command("highlight default link TvpVal Type", true);
    this.nvim.command("highlight default link TvpTopLevel MsgArea", true);
    this.nvim.command("highlight default link TvpCommand Directory", true);
    this.nvim.command("sign define TvpClass linehl=TvpClass", true);
    this.nvim.command("sign define TvpObject linehl=TvpObject", true);
    this.nvim.command("sign define TvpTrait linehl=TvpTrait", true);
    this.nvim.command("sign define TvpMethod linehl=TvpMethod", true);
    this.nvim.command("sign define TvpVal linehl=TvpVal", true);
    this.nvim.command("sign define TvpVal linehl=TvpTopLevel", true);
    this.nvim.command("sign define TvpVal linehl=TvpCommand", true);
  }

  public addTreeModel(model: TreeModel): void {
    this.view2treemodel.set(model.viewId, model);
  }
  public disposeTreeModel(treeViewId: string): void {
    this.view2treemodel.delete(treeViewId);
  }
  private allTreeViews(): string[] {
    return [...this.view2treemodel.keys()];
  }

  public async toggleAllTrees(): Promise<void> {
    const treeViews = this.allTreeViews();
    if (!this.checkTreeViewAvailability(treeViews)) return;
    const [curtab, openWindows] = await this.getOpenWindows(treeViews);
    if (openWindows.length > 0) {
      await Promise.all(openWindows.map(({ window }) => window.close(true)));
      treeViews.forEach((view) => curtab.setVar(view, 0, false));
    } else {
      const viewsConfigs =
        this.config.get<TreeViewDescription[]>("initialViews") ?? [];
      const windows = await sequence(
        treeViews
          .filter(
            (view) => viewsConfigs.find((c) => c.name === view) !== undefined
          )
          .sort(this.viewsComparator(viewsConfigs)),
        async (viewId, idx) => {
          if (idx == 0) {
            await this.makeTreeViewPanel(viewId);
          } else {
            await this.nvim.command(`new ${viewId}`);
          }
          const window = await this.assignOrCreateTreeView(curtab, viewId);
          return { name: viewId, window } as WindowWithTree;
        }
      );
      await this.alignWindows(windows, viewsConfigs);
    }
  }

  public async toggleTreeView(viewName: string): Promise<void> {
    const treeViews = this.allTreeViews();
    if (!this.checkTreeViewAvailability(treeViews)) return;
    if (!this.checkTreeViewExistence(treeViews, viewName)) return;
    const [opened, windows] = await this.toggleTreeViewInternal(
      treeViews,
      viewName,
      false
    );
    const viewsConfigs =
      this.config.get<TreeViewDescription[]>("initialViews") ?? [];
    if (opened) return this.alignWindows(windows, viewsConfigs);
  }

  private async toggleTreeViewInternal(
    treeViews: string[],
    viewName: string,
    onlyOpen: boolean
  ): Promise<[boolean, WindowWithTree[]]> {
    const [curtab, openWindows] = await this.getOpenWindows(treeViews);
    const mbWindow = openWindows.find(({ name }) => name == viewName);
    if (mbWindow !== undefined) {
      if (!onlyOpen) {
        await mbWindow.window.close(true);
        await curtab.setVar(viewName, 0, false);
      }
      return [false, []];
    } else if (openWindows.length != 0) {
      const window = openWindows[0].window;
      await this.nvim.call("win_gotoid", window.id);
      await this.nvim.command(`new ${viewName}`);
      const newWindow = await this.assignOrCreateTreeView(curtab, viewName);
      return [true, openWindows.concat({ name: viewName, window: newWindow })];
    } else {
      await this.makeTreeViewPanel(viewName);
      const newWindow = await this.assignOrCreateTreeView(curtab, viewName);
      return [true, openWindows.concat({ name: viewName, window: newWindow })];
    }
  }

  public async revealDocInTreeView(
    viewName: string,
    textDocument: TextDocument,
    position: Position
  ): Promise<void> {
    const treeViews = this.allTreeViews();
    if (!this.checkTreeViewAvailability(treeViews)) return;
    if (!this.checkTreeViewExistence(treeViews, viewName)) return;
    const [opened, windows] = await this.toggleTreeViewInternal(
      treeViews,
      viewName,
      true
    );
    const viewsConfigs =
      this.config.get<TreeViewDescription[]>("initialViews") ?? [];
    if (opened) await this.alignWindows(windows, viewsConfigs);
    const treeView = this.view2treeview.get(viewName);
    return treeView
      ?.revealDocInTreeView(textDocument, position)
      .then(() => undefined);
  }

  private makeTreeViewPanel(viewName: string): Promise<void> {
    const initWidth = this.config.get<number>("initialWidth");
    const position =
      this.config.get<string>("alignment") == "right" ? "botright" : "topleft";
    return this.nvim.command(
      `silent ${position} vertical ${initWidth} new ${viewName}`
    );
  }

  private async getOpenWindows(
    treeViews: string[]
  ): Promise<[Tabpage, WindowWithTree[]]> {
    const curtab = await this.nvim.tabpage;
    const windows = await this.nvim.windows;
    const openWindows = await Promise.all(
      treeViews.map(async (view) => {
        const windowId = await curtab.getVar(view);
        return {
          name: view,
          window: windows.find((w) => w.id == windowId),
        } as WindowWithTree;
      })
    ).then((ws) => ws.filter((w) => w.window !== undefined));
    return [curtab, openWindows];
  }

  private async assignOrCreateTreeView(
    curtab: Tabpage,
    viewId: string
  ): Promise<Window> {
    const mbTreeView = this.view2treeview.get(viewId);
    const model = this.view2treemodel.get(viewId);
    model?.show();
    if (mbTreeView !== undefined) {
      await this.nvim.call("coc#util#jumpTo", [0, 1]);
    } else if (model !== undefined) {
      const buffer = await this.nvim.buffer;
      const treeView = new TreeView(
        this.nvim,
        this.config,
        buffer,
        model,
        this.logger
      );
      await treeView.init();
      this.view2treeview.set(viewId, treeView);
    }
    const curWindow = await this.nvim.window;
    await curtab.setVar(viewId, curWindow.id, false);

    const allTreeViews = (await curtab.getVar("alltreeviews")) as string;
    if (allTreeViews === null) {
      await curtab.setVar("alltreeviews", viewId, false);
    } else if (allTreeViews.indexOf(viewId) == -1) {
      await curtab.setVar("alltreeviews", `${allTreeViews},${viewId}`, false);
    }
    return curWindow;
  }

  private checkTreeViewAvailability(treeViews: string[]): boolean {
    if (treeViews === undefined || treeViews.length == 0) {
      workspace.showMessage(
        "Information about Tree Views is not yet loaded. Please try a bit later.",
        "warning"
      );
      return false;
    } else {
      return true;
    }
  }

  private checkTreeViewExistence(
    treeViews: string[],
    viewName: string
  ): boolean {
    if (treeViews.indexOf(viewName) == -1) {
      workspace.showMessage(
        `Unknown view name ${viewName}. Available values: ${treeViews.join(
          ", "
        )}`,
        "error"
      );
      return false;
    } else {
      return true;
    }
  }

  private async alignWindows(
    windows: WindowWithTree[],
    viewsConfigs: TreeViewDescription[]
  ): Promise<void> {
    const heights = await Promise.all(
      windows.map(({ window }) => window.height)
    );
    const totalHeight = heights.reduce((acc, num) => acc + num, 0);
    const windowToPart = windows.map(({ name: view, window }) => {
      const mbDesc = viewsConfigs.find((c) => c.name === view);
      let height: number;
      if (mbDesc === undefined) {
        height =
          viewsConfigs.length != 0
            ? viewsConfigs.reduce(
                (z, c) => Math.min(z, c.size),
                Number.MAX_VALUE
              )
            : 10;
      } else {
        height = mbDesc.size;
      }
      return [window, height] as [Window, number];
    });
    const allParts = windowToPart
      .map(([_, h]) => h)
      .reduce((n1, n2) => n1 + n2);
    await Promise.all(
      windowToPart.map(([window, part]) => {
        return window.setHeight(Math.floor((part * totalHeight) / allParts));
      })
    );
  }

  public async toggleTreeViewNode(): Promise<void> {
    return this.doOnActiveTree((treeView) => treeView.toggleTreeViewNode());
  }
  public async forceChildrenReload(): Promise<void> {
    return this.doOnActiveTree((treeView) => treeView.forceChildrenReload());
  }
  public async gotoParentNode(): Promise<void> {
    return this.doOnActiveTree((treeView) => treeView.gotoParentNode());
  }
  public async gotoFirstNode(): Promise<void> {
    return this.doOnActiveTree((treeView) => treeView.gotoEdgeNode(true));
  }
  public async gotoLastNode(): Promise<void> {
    return this.doOnActiveTree((treeView) => treeView.gotoEdgeNode(false));
  }
  public async gotoPrevSibling(): Promise<void> {
    return this.doOnActiveTree((treeView) =>
      treeView.gotoNeighboringSibling(true)
    );
  }
  public async gotoNextSibling(): Promise<void> {
    return this.doOnActiveTree((treeView) =>
      treeView.gotoNeighboringSibling(false)
    );
  }
  public async executeCommand(prop: WindowProp): Promise<void> {
    return this.doOnActiveTree(async (treeView) => {
      this.lastWindowProp = [prop, Date.now()];
      await treeView.executeCommand();
    });
  }

  private async doOnActiveTree(
    func: (v: TreeView) => Promise<void>
  ): Promise<void> {
    const curBufferId = await this.nvim.eval('bufnr("%")');
    const activeTreeView = [...this.view2treeview.values()].find(
      (view) => view.bufferId == curBufferId
    );
    if (activeTreeView === undefined) {
      return this.nvim.command("echo 'no active tree view'");
    } else {
      return func(activeTreeView);
    }
  }

  private viewsComparator(
    descs: TreeViewDescription[]
  ): (view1: string, view2: string) => number {
    return (view1: string, view2: string) => {
      const idx1 = descs.findIndex((d) => d.name === view1);
      const idx2 = descs.findIndex((d) => d.name === view2);
      if (idx1 == -1 && idx2 == -1) return 0;
      else if (idx1 == -1) return 1;
      else if (idx2 == -1) return -1;
      else return idx2 - idx1;
    };
  }

  public async prepareWindowForGoto(): Promise<any> {
    const windowProp =
      Date.now() - this.lastWindowProp[1] < 1000
        ? this.lastWindowProp[0]
        : WindowProp.Default;
    if (windowProp === WindowProp.Tab) {
      await this.nvim.command("tabnew");
    } else {
      const tabpage = await this.nvim.tabpage;
      const allViewNames =
        ((await tabpage.getVar("alltreeviews")) as string) || "";
      const allTreeViews = await Promise.all(
        allViewNames.split(",").map((viewName) => tabpage.getVar(viewName))
      );
      const windows = await tabpage.windows;
      // Sort this to ensure we find the first opened to avoid opening in NERDTree
      const windowIds = windows.map((window) => window.id).sort();
      const mbWindow = windowIds.find(
        (windowId) =>
          allTreeViews.find((treeViewId) => windowId === treeViewId) ===
          undefined
      );
      if (mbWindow === undefined) {
        const initWidth = this.config.get<number>("initialWidth")!;
        const position =
          this.config.get<string>("alignment") == "right"
            ? "topleft"
            : "botright";
        if (windows.length > 0) {
          const fullWidth = await windows[0].width;
          await this.nvim.command(`silent ${position} vertical new`);
          await this.nvim.command(
            `silent vertical resize ${fullWidth - initWidth}`
          );
        } else {
          await this.nvim.command(`silent ${position} vertical new`);
        }
      } else {
        await this.nvim.call("win_gotoid", mbWindow);
        if (windowProp === WindowProp.HSplit) {
          await this.nvim.command("split");
        } else if (windowProp === WindowProp.VSplit) {
          await this.nvim.command("vsplit");
        }
      }
    }
  }

  public viewHidden(viewId: string): void {
    const model = this.view2treemodel.get(viewId);
    if (model !== undefined) model.hide();
  }

  public dispose(): void {
    this.view2treeview.forEach((view) => view.dispose());
  }
}
