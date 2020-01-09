import { commands, workspace, Disposable } from "coc.nvim"

import { TreeModel } from "./model"
import { TreeViewFeature } from "./feature"
import { TreeViewsManager, WindowProp } from "./treeviews"

export class TreeViewController implements Disposable {
  private treeModels: Map<string, TreeModel> = new Map()
  private listeners: Disposable[] = []

  public constructor(
    treeViewFeature: TreeViewFeature,
    private treeViewsManager: TreeViewsManager
  ) {
    this.listeners.push(
      treeViewFeature.providerEvents()(provider => {
        const model = new TreeModel(provider)
        this.treeModels.set(provider.viewId, model)
        treeViewsManager.addTreeModel(model)
      })
    )

    this.listeners.push(
      commands.registerCommand("metals.tvp", viewName => {
        if (viewName === undefined) {
          treeViewsManager.toggleAllTrees()
        } else {
          treeViewsManager.toggleTreeView(viewName)
        }
      })
    )

    this.listeners.push(
      commands.registerCommand("metals.tvp.view", (action, viewId) => {
        switch (action) {
          case "ToggleNode":
            return treeViewsManager.toggleTreeViewNode()
          case "ForceChildrenReload":
            return treeViewsManager.forceChildrenReload()
          case "ParentNode":
            return treeViewsManager.gotoParentNode()
          case "FirstSibling":
            return treeViewsManager.gotoFirstNode()
          case "LastSibling":
            return treeViewsManager.gotoLastNode()
          case "PrevSibling":
            return treeViewsManager.gotoPrevSibling()
          case "NextSibling":
            return treeViewsManager.gotoNextSibling()
          case "ExecuteCommand":
            return treeViewsManager.executeCommand(WindowProp.Default)
          case "ExecuteCommandAndOpenSplit":
            return treeViewsManager.executeCommand(WindowProp.HSplit)
          case "ExecuteCommandAndOpenVSplit":
            return treeViewsManager.executeCommand(WindowProp.VSplit)
          case "ExecuteCommandAndOpenTab":
            return treeViewsManager.executeCommand(WindowProp.Tab)
          case "Hidden":
            return treeViewsManager.viewHidden(viewId)
          default:
            return
        }
      })
    )

    this.listeners.push(
      commands.registerCommand("metals.revealInTreeView", async viewName => {
        const { document, position } = await workspace.getCurrentState()
        return this.treeViewsManager.revealDocInTreeView(viewName, document, position)
      })
    )
  }

  public dispose(): void {
    this.treeModels.forEach(model => model.dispose())
    this.treeModels.clear()
    this.listeners.forEach(d => d.dispose())
  }
}
