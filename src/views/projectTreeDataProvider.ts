import * as vscode from 'vscode';
import { ProjectService } from '../services/projectService';
import { ProjectConfig } from '../models/types';

export class ProjectTreeDataProvider implements vscode.TreeDataProvider<ProjectItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<ProjectItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor() {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ProjectItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ProjectItem): Promise<ProjectItem[]> {
    if (element) {
      return [];
    } else {
      const projects = await ProjectService.getAllProjects();
      return projects.map(project => new ProjectItem(project));
    }
  }
}

class ProjectItem extends vscode.TreeItem {
  constructor(public readonly project: ProjectConfig) {
    super(
      project.name, vscode.TreeItemCollapsibleState.None);
    this.description = project.branch;
    this.tooltip = `Branch: ${project.branch}\nIDE: ${project.ide}\nPath: ${project.workspace}/${project.name}\nStatus: ${project.status}`;
    this.command = {
      command: 'multiProjectCreator.openProjectById',
      title: 'Open Project',
      arguments: [project.id]
    };
  }

  iconPath = this.getIconPath();

  private getIconPath(): vscode.ThemeIcon {
    switch (this.project.status) {
      case 'ready':
        return new vscode.ThemeIcon('folder');
      case 'creating':
        return new vscode.ThemeIcon('sync~spin');
      case 'error':
        return new vscode.ThemeIcon('error');
      default:
        return new vscode.ThemeIcon('folder');
    }
  }
}
