"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectTreeDataProvider = void 0;
const vscode = __importStar(require("vscode"));
const projectService_1 = require("../services/projectService");
class ProjectTreeDataProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (element) {
            return [];
        }
        else {
            const projects = await projectService_1.ProjectService.getAllProjects();
            return projects.map(project => new ProjectItem(project));
        }
    }
}
exports.ProjectTreeDataProvider = ProjectTreeDataProvider;
class ProjectItem extends vscode.TreeItem {
    constructor(project) {
        super(project.name, vscode.TreeItemCollapsibleState.None);
        this.project = project;
        this.iconPath = this.getIconPath();
        this.description = project.branch;
        this.tooltip = `Branch: ${project.branch}\nIDE: ${project.ide}\nPath: ${project.workspace}/${project.name}\nStatus: ${project.status}`;
        this.command = {
            command: 'multiProjectCreator.openProjectById',
            title: 'Open Project',
            arguments: [project.id]
        };
    }
    getIconPath() {
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
//# sourceMappingURL=projectTreeDataProvider.js.map