import { commands, Disposable, workspace } from "coc.nvim";
import { TreeViewFeature } from "./feature";
import { TreeModel } from "./model";
import { TreeViewsManager, WindowProp } from "./treeviews";

interface QuickpickAction {
  title: string;
  action: string;
}

const tvpViewActions: QuickpickAction[] = [
  { title: "Expand/Collapse tree node", action: "ToggleNode" },
  {
    title: "Force the reloading of the children of this node.",
    action: "ForceChildrenReload",
  },
  { title: "Go to parent node", action: "ParentNode" },
  { title: "Go to first child", action: "FirstSibling" },
  { title: "Go to last child", action: "LastSibling" },
  { title: "Go to prev sibling", action: "PrevSibling" },
  { title: "Go to next sibling", action: "NextSibling" },
  { title: "Execute command for node", action: "ExecuteCommand" },
  {
    title: "Execute command and open node under cursor in horizontal split",
    action: "ExecuteCommandAndOpenSplit",
  },
  {
    title: "Execute command and open node under cursor in vertical split",
    action: "ExecuteCommandAndOpenVSplit",
  },
  {
    title: "Execute command and open node under cursor in tab",
    action: "ExecuteCommandAndOpenTab",
  },
];

export class TreeViewController implements Disposable {
  private treeModels: Map<string, TreeModel> = new Map();
  private listeners: Disposable[] = [];

  public constructor(
    treeViewFeature: TreeViewFeature,
    private treeViewsManager: TreeViewsManager
  ) {
    this.listeners.push(
      treeViewFeature.providerEvents()((provider) => {
        const model = new TreeModel(provider, true);
        this.treeModels.set(provider.viewId, model);
        treeViewsManager.addTreeModel(model);
      })
    );

    this.listeners.push(
      commands.registerCommand("metals.tvp", (viewName) => {
        if (viewName === undefined) {
          treeViewsManager.toggleAllTrees();
        } else {
          treeViewsManager.toggleTreeView(viewName);
        }
      })
    );

    const tvpViewHandler = (action: string, viewId: string | undefined) => {
      switch (action) {
        case "ToggleNode":
          return treeViewsManager.toggleTreeViewNode();
        case "ForceChildrenReload":
          return treeViewsManager.forceChildrenReload();
        case "ParentNode":
          return treeViewsManager.gotoParentNode();
        case "FirstSibling":
          return treeViewsManager.gotoFirstNode();
        case "LastSibling":
          return treeViewsManager.gotoLastNode();
        case "PrevSibling":
          return treeViewsManager.gotoPrevSibling();
        case "NextSibling":
          return treeViewsManager.gotoNextSibling();
        case "ExecuteCommand":
          return treeViewsManager.executeCommand(WindowProp.Default);
        case "ExecuteCommandAndOpenSplit":
          return treeViewsManager.executeCommand(WindowProp.HSplit);
        case "ExecuteCommandAndOpenVSplit":
          return treeViewsManager.executeCommand(WindowProp.VSplit);
        case "ExecuteCommandAndOpenTab":
          return treeViewsManager.executeCommand(WindowProp.Tab);
        case "Hidden":
          return viewId && treeViewsManager.viewHidden(viewId);
        default:
          workspace
            .showQuickpick(tvpViewActions.map((action) => action.title))
            .then((num) => {
              if (num === -1) return;
              tvpViewHandler(tvpViewActions[num].action, undefined);
            });
      }
    };

    this.listeners.push(
      commands.registerCommand("metals.tvp.view", tvpViewHandler)
    );

    this.listeners.push(
      commands.registerCommand("metals.revealInTreeView", async (viewName) => {
        const { document, position } = await workspace.getCurrentState();
        return this.treeViewsManager.revealDocInTreeView(
          viewName,
          document,
          position
        );
      })
    );
  }

  public dispose(): void {
    this.treeModels.forEach((model) => model.dispose());
    this.treeModels.clear();
    this.listeners.forEach((d) => d.dispose());
  }
}
