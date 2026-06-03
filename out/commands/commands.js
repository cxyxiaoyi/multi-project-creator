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
exports.FormView = void 0;
exports.createProjectCommand = createProjectCommand;
exports.openProjectByIdCommand = openProjectByIdCommand;
exports.refreshProjectsTreeView = refreshProjectsTreeView;
exports.listProjectsCommand = listProjectsCommand;
exports.registerCommands = registerCommands;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const projectService_1 = require("../services/projectService");
const projectTreeDataProvider_1 = require("../views/projectTreeDataProvider");
const projectTemplateService_1 = require("../services/projectTemplateService");
const ideService_1 = require("../services/ideService");
const gitService_1 = require("../services/gitService");
let formView;
let projectTreeDataProvider;
/** 当前 IDE 打开的工作区根目录，用于「管理已有需求」默认路径 */
function getDefaultWorkspaceRoot() {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
        return '';
    }
    if (folders.length === 1) {
        return folders[0].uri.fsPath;
    }
    // 多根工作区：优先使用 .code-workspace 文件所在目录（通常为各需求文件夹的父目录）
    const workspaceFile = vscode.workspace.workspaceFile;
    if (workspaceFile) {
        return path.dirname(workspaceFile.fsPath);
    }
    return folders[0].uri.fsPath;
}
function escapeHtmlAttribute(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;');
}
class FormView {
    constructor(extensionUri) {
        this.extensionUri = extensionUri;
    }
    async show() {
        const defaultWorkspaceRoot = getDefaultWorkspaceRoot();
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.One);
            if (defaultWorkspaceRoot) {
                this.panel.webview.postMessage({
                    type: 'setDefaultWorkspaceRoot',
                    path: defaultWorkspaceRoot
                });
            }
            return;
        }
        this.panel = vscode.window.createWebviewPanel('multiProjectCreatorForm', '多工作区创建工具', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        const templates = projectTemplateService_1.ProjectTemplateService.getTemplates();
        this.panel.webview.html = this.getWebviewContent(templates, defaultWorkspaceRoot);
        this.panel.webview.onDidReceiveMessage(async (message) => {
            await this.handleMessage(message);
        });
        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });
    }
    getWebviewContent(templates, defaultWorkspaceRoot = '') {
        const defaultRootAttr = defaultWorkspaceRoot
            ? ` value="${escapeHtmlAttribute(defaultWorkspaceRoot)}"`
            : '';
        const templateOptions = templates.length > 0
            ? templates.map(t => `<option value="${t.gitUrl}">${t.name}</option>`).join('')
            : '<option value="">暂无保存的工程</option>';
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>多工作区创建工具</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      padding: 20px;
      background-color: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
    }

    h2 {
      margin-bottom: 20px;
      font-size: 18px;
      color: var(--vscode-foreground);
    }

    .form-group {
      margin-bottom: 20px;
    }

    label {
      display: block;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--vscode-foreground);
      font-size: 14px;
    }

    .input-row {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    input, select, textarea {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      font-size: 14px;
    }

    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: var(--vscode-focusBorder);
    }

    .btn {
      padding: 6px 24px;
      border: 1px solid var(--vscode-button-border);
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      white-space: nowrap;
    }

    .btn:hover {
      background-color: var(--vscode-button-hoverBackground);
    }

    .btn-sm {
      padding: 4px 12px;
      font-size: 12px;
    }

    .btn-danger {
      background-color: #f14c4c;
      color: white;
    }

    .btn-danger:hover {
      background-color: #d43d3d;
    }

    .btn-secondary {
      background-color: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    .btn-secondary:hover {
      background-color: var(--vscode-button-secondaryHoverBackground);
    }

    .button-group {
      display: flex;
      gap: 12px;
      justify-content: center;
      margin: 24px 0;
    }

    .repo-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
    }

    .repo-table th,
    .repo-table td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid var(--vscode-input-border);
    }

    .repo-table th {
      background-color: var(--vscode-editorWidget-background);
      font-weight: 600;
    }

    .repo-table td input {
      width: 100%;
      padding: 6px 8px;
    }

    .repo-table .actions {
      width: 120px;
      text-align: center;
    }

    .add-repo-btn {
      margin-top: 10px;
    }

    .ide-section {
      margin-bottom: 24px;
    }

    .ide-options {
      display: flex;
      gap: 20px;
      padding: 12px;
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
    }

    .ide-option {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }

    .ide-option input[type="radio"] {
      width: auto;
      flex: 0 0 auto;
    }

    .ide-option label {
      margin: 0;
      cursor: pointer;
      font-weight: normal;
    }

    .log-section {
      margin-top: 24px;
    }

    .log-area {
      width: 100%;
      min-height: 200px;
      background-color: #1e1e1e;
      color: #d4d4d4;
      font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
      font-size: 13px;
      padding: 12px;
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      resize: vertical;
      line-height: 1.5;
    }

    /* Modal Styles */
    .modal-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 1000;
      justify-content: center;
      align-items: center;
    }

    .modal-overlay.active {
      display: flex;
    }

    .modal {
      background-color: var(--vscode-editor-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 8px;
      width: 90%;
      max-width: 800px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }

    .modal-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--vscode-input-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 16px;
      font-weight: 600;
    }

    .modal-close {
      background: none;
      border: none;
      color: var(--vscode-foreground);
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-close:hover {
      background-color: var(--vscode-toolbar-hoverBackground);
      border-radius: 4px;
    }

    .modal-body {
      padding: 20px;
      overflow-y: auto;
      flex: 1;
    }

    .modal-footer {
      padding: 16px 20px;
      border-top: 1px solid var(--vscode-input-border);
      display: flex;
      justify-content: flex-end;
    }

    .template-form {
      display: flex;
      gap: 10px;
      margin-bottom: 16px;
    }

    .template-form input {
      flex: 1;
    }

    .template-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
    }

    .template-table th,
    .template-table td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid var(--vscode-input-border);
    }

    .template-table th {
      background-color: var(--vscode-editorWidget-background);
      font-weight: 600;
      font-size: 13px;
    }

    .template-table tr:last-child td {
      border-bottom: none;
    }

    .template-table td input {
      width: 100%;
      padding: 6px 8px;
    }

    .template-table .actions {
      width: 150px;
      text-align: center;
    }

    .editing-row input {
      background-color: var(--vscode-input-background);
    }

    .mode-section {
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--vscode-input-border);
    }

    .mode-options {
      display: flex;
      gap: 24px;
      padding: 12px;
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
    }

    .section-title {
      font-size: 16px;
      margin-bottom: 16px;
      color: var(--vscode-foreground);
    }

    .info-box {
      padding: 12px;
      background-color: var(--vscode-editorWidget-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      margin-bottom: 16px;
      font-size: 13px;
      line-height: 1.6;
    }

    .info-box .info-row {
      display: flex;
      gap: 8px;
    }

    .info-box .info-label {
      font-weight: 600;
      min-width: 72px;
    }

    .readonly-text {
      color: var(--vscode-descriptionForeground);
      word-break: break-all;
    }

    #managePanel {
      display: none;
    }

    .repo-list-empty {
      text-align: center;
      color: var(--vscode-descriptionForeground);
      padding: 16px;
    }

    .branch-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .branch-cell .repo-branch-text {
      flex: 1;
      word-break: break-all;
    }

    .branch-cell-container select,
    .branch-cell-container input {
      width: 100%;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>多工作区创建工具</h2>

    <div class="mode-section">
      <label>操作模式</label>
      <div class="mode-options">
        <div class="ide-option">
          <input type="radio" name="workMode" value="create" id="mode-create" checked>
          <label for="mode-create">新建需求工作区</label>
        </div>
        <div class="ide-option">
          <input type="radio" name="workMode" value="manage" id="mode-manage">
          <label for="mode-manage">管理已有需求</label>
        </div>
      </div>
    </div>

    <div id="createPanel">
    <h3 class="section-title">创建工作区</h3>

    <!-- Project Template Button -->
    <div class="form-group">
      <label>📦 工程列表</label>
      <div class="input-row">
        <button class="btn" id="openTemplateModal">工程列表</button>
      </div>
    </div>

    <!-- Workspace Name -->
    <div class="form-group">
      <label for="workspaceName">需求名称:</label>
      <div class="input-row">
        <input type="text" id="workspaceName" placeholder="feature_example">
      </div>
    </div>

    <!-- Workspace Path -->
    <div class="form-group">
      <label for="workspacePath">工作区路径:</label>
      <div class="input-row">
        <input type="text" id="workspacePath" placeholder="/Users/yourname/workspace">
        <button class="btn" id="browsePath">浏览...</button>
      </div>
    </div>

    <!-- Repository List -->
    <div class="repo-section">
      <label>Git 仓库列表</label>
      <table class="repo-table" id="repoTable">
        <thead>
          <tr>
            <th style="width: 40%;">选择工程</th>
            <th style="width: 40%;">分支名</th>
            <th style="width: 20%;" class="actions">操作</th>
          </tr>
        </thead>
        <tbody id="repoBody">
          <tr>
            <td>
              <select class="create-template-select">
                <option value="">-- 选择工程 --</option>
                ${templateOptions}
              </select>
            </td>
            <td class="branch-cell-container">
              <input type="text" class="repo-branch" placeholder="main" value="main">
            </td>
            <td class="actions">
              <button class="btn btn-sm btn-danger delete-repo">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
      <button class="btn btn-secondary add-repo-btn" id="addRepo">+ 添加仓库</button>
    </div>

    <!-- IDE Selection -->
    <div class="ide-section">
      <label>目标 IDE</label>
      <div class="ide-options">
        <div class="ide-option">
          <input type="radio" id="ide-vscode" name="ide" value="VSCode" checked>
          <label for="ide-vscode">VSCode</label>
        </div>
        <div class="ide-option">
          <input type="radio" id="ide-cursor" name="ide" value="Cursor">
          <label for="ide-cursor">Cursor</label>
        </div>
        <div class="ide-option">
          <input type="radio" id="ide-qoder" name="ide" value="Qoder">
          <label for="ide-qoder">Qoder</label>
        </div>
        <div class="ide-option">
          <input type="radio" id="ide-kiro" name="ide" value="Kiro">
          <label for="ide-kiro">Kiro</label>
        </div>
        <div class="ide-option">
          <input type="radio" id="ide-idea" name="ide" value="IDEA">
          <label for="ide-idea">IDEA</label>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="button-group">
      <button class="btn" id="createWorkspace">创建工作区</button>
      <button class="btn btn-secondary" id="clearForm">清空表单</button>
    </div>
    </div>

    <div id="managePanel">
      <h3 class="section-title">管理已有需求</h3>

      <div class="form-group">
        <label for="manageWorkspaceRoot">工作区根目录:</label>
        <div class="input-row">
          <input type="text" id="manageWorkspaceRoot" placeholder="/Users/yourname/workspace"${defaultRootAttr}>
          <button class="btn" id="browseManagePath">浏览...</button>
          <button class="btn btn-secondary" id="refreshWorkspace">刷新</button>
        </div>
      </div>

      <div class="form-group">
        <label for="requirementSelect">需求列表:</label>
        <select id="requirementSelect">
          <option value="">-- 请先扫描工作区 --</option>
        </select>
      </div>

      <div id="requirementInfo" class="info-box" style="display: none;">
        <div class="info-row">
          <span class="info-label">需求名称:</span>
          <span id="manageReqName" class="readonly-text"></span>
        </div>
        <div class="info-row">
          <span class="info-label">需求路径:</span>
          <span id="manageReqPath" class="readonly-text"></span>
        </div>
      </div>

      <div class="repo-section">
        <label>已有工程列表</label>
        <table class="repo-table" id="existingRepoTable">
          <thead>
            <tr>
              <th style="width: 18%;">工程名</th>
              <th style="width: 42%;">Git URL</th>
              <th style="width: 28%;">分支</th>
              <th style="width: 12%;" class="actions">操作</th>
            </tr>
          </thead>
          <tbody id="existingRepoBody">
            <tr><td colspan="4" class="repo-list-empty">请选择需求以查看已有工程</td></tr>
          </tbody>
        </table>
      </div>

      <div class="repo-section">
        <label>添加新工程</label>
        <table class="repo-table" id="appendRepoTable">
          <thead>
            <tr>
              <th style="width: 40%;">选择工程</th>
              <th style="width: 40%;">分支名</th>
              <th style="width: 20%;" class="actions">操作</th>
            </tr>
          </thead>
          <tbody id="appendRepoBody">
            <tr>
              <td>
                <select class="append-template-select">
                  <option value="">-- 选择工程 --</option>
                  ${templateOptions}
                </select>
              </td>
              <td class="branch-cell-container">
                <input type="text" class="append-branch" placeholder="main" value="main">
              </td>
              <td class="actions">
                <button class="btn btn-sm btn-danger delete-append-repo">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
        <button class="btn btn-secondary add-repo-btn" id="addAppendRepo">+ 添加工程</button>
      </div>

      <div class="ide-section">
        <label>目标 IDE</label>
        <div class="ide-options">
          <div class="ide-option">
            <input type="radio" id="manage-ide-vscode" name="manageIde" value="VSCode" checked>
            <label for="manage-ide-vscode">VSCode</label>
          </div>
          <div class="ide-option">
            <input type="radio" id="manage-ide-cursor" name="manageIde" value="Cursor">
            <label for="manage-ide-cursor">Cursor</label>
          </div>
          <div class="ide-option">
            <input type="radio" id="manage-ide-qoder" name="manageIde" value="Qoder">
            <label for="manage-ide-qoder">Qoder</label>
          </div>
          <div class="ide-option">
            <input type="radio" id="manage-ide-kiro" name="manageIde" value="Kiro">
            <label for="manage-ide-kiro">Kiro</label>
          </div>
          <div class="ide-option">
            <input type="radio" id="manage-ide-idea" name="manageIde" value="IDEA">
            <label for="manage-ide-idea">IDEA</label>
          </div>
        </div>
      </div>

      <div class="button-group">
        <button class="btn" id="appendRepos">追加工程</button>
        <button class="btn btn-secondary" id="openInIDE">在 IDE 中打开</button>
      </div>
    </div>

    <!-- Log Area -->
    <div class="log-section">
      <label>执行日志</label>
      <textarea class="log-area" id="logArea" readonly></textarea>
    </div>
  </div>

  <!-- Template Management Modal -->
  <div class="modal-overlay" id="templateModal">
    <div class="modal">
      <div class="modal-header">
        <span>工程列表</span>
        <button class="modal-close" id="closeModal">&times;</button>
      </div>
      <div class="modal-body">
        <div class="template-form">
          <input type="text" id="templateName" placeholder="工程名称">
          <input type="text" id="templateGitUrl" placeholder="Git 仓库地址">
          <button class="btn" id="addTemplate">添加</button>
        </div>
        <table class="template-table">
          <thead>
            <tr>
              <th>名称</th>
              <th>Git 地址</th>
              <th class="actions">操作</th>
            </tr>
          </thead>
          <tbody id="templateBody">
            <!-- Templates will be loaded here -->
          </tbody>
        </table>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="closeModalBtn">关闭</button>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    let editingId = null;
    let cachedTemplates = [];
    let selectedRequirementPath = '';
    let branchRequestCounter = 0;

    function log(message, type = 'info') {
      const logArea = document.getElementById('logArea');
      const timestamp = new Date().toLocaleTimeString();
      const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'progress' ? '🔄' : '📝';
      logArea.value += \`[\${timestamp}] \${prefix} \${message}\\n\`;
      logArea.scrollTop = logArea.scrollHeight;
    }

    function clearLogs() {
      document.getElementById('logArea').value = '';
    }

    // Template Modal Functions
    function openTemplateModal() {
      document.getElementById('templateModal').classList.add('active');
      loadTemplates();
    }

    function closeTemplateModal() {
      document.getElementById('templateModal').classList.remove('active');
      editingId = null;
    }

    function loadTemplates() {
      vscode.postMessage({ type: 'getTemplates' });
    }

    function renderTemplates(templates) {
      const tbody = document.getElementById('templateBody');
      
      if (templates.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #888;">暂无保存的工程</td></tr>';
        return;
      }

      tbody.innerHTML = templates.map(t => \`
        <tr data-id="\${t.id}">
          <td>\${editingId === t.id ? \`<input type="text" id="editName" value="\${t.name}">\` : t.name}</td>
          <td>\${editingId === t.id ? \`<input type="text" id="editGitUrl" value="\${t.gitUrl}">\` : t.gitUrl}</td>
          <td class="actions">
            \${editingId === t.id 
              ? \`<button class="btn btn-sm" onclick="saveEdit('\${t.id}')">保存</button>\`
              : \`<button class="btn btn-sm" onclick="editTemplate('\${t.id}')">编辑</button>\`
            }
            <button class="btn btn-sm btn-danger" onclick="deleteTemplate('\${t.id}')">删除</button>
          </td>
        </tr>
      \`).join('');

      cachedTemplates = templates;
      updateTemplateSelects();
    }

    function getTemplateOptionsHtml() {
      return '<option value="">-- 选择工程 --</option>' +
        cachedTemplates.map(t => \`<option value="\${escapeAttr(t.gitUrl)}">\${escapeAttr(t.name)}</option>\`).join('');
    }

    function updateTemplateSelects() {
      const optionsHtml = getTemplateOptionsHtml();
      document.querySelectorAll('.create-template-select, .append-template-select').forEach(sel => {
        const current = sel.value;
        sel.innerHTML = optionsHtml;
        sel.value = current;
      });
    }

    function createRepoRowHtml(context) {
      const templateClass = context === 'append' ? 'append-template-select' : 'create-template-select';
      const deleteClass = context === 'append' ? 'delete-append-repo' : 'delete-repo';
      const branchClass = getBranchClass(context);
      const options = getTemplateOptionsHtml();
      return \`
        <tr>
          <td><select class="\${templateClass}">\${options}</select></td>
          <td class="branch-cell-container">
            <input type="text" class="\${branchClass}" placeholder="main" value="main">
          </td>
          <td class="actions">
            <button class="btn btn-sm btn-danger \${deleteClass}">删除</button>
          </td>
        </tr>
      \`;
    }

    function getBranchFromRow(row, context) {
      const cls = getBranchClass(context);
      const el = row.querySelector('.' + cls);
      return el?.value?.trim() || 'main';
    }

    function sortBranches(branches) {
      const priority = ['main', 'master', 'develop', 'development'];
      return [...branches].sort((a, b) => {
        const ai = priority.indexOf(a);
        const bi = priority.indexOf(b);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return a.localeCompare(b);
      });
    }

    function getBranchClass(context) {
      return context === 'append' ? 'append-branch' : 'repo-branch';
    }

    function renderBranchInput(cell, context, value) {
      const cls = getBranchClass(context);
      const val = escapeAttr(value || 'main');
      cell.innerHTML = \`<input type="text" class="\${cls}" placeholder="main" value="\${val}">\`;
    }

    function renderBranchSelect(cell, branches, context) {
      const cls = getBranchClass(context);
      const sorted = sortBranches(branches);
      const defaultBranch = sorted.find(b => ['main', 'master'].includes(b)) || sorted[0] || 'main';
      const options = sorted.map(b =>
        \`<option value="\${escapeAttr(b)}"\${b === defaultBranch ? ' selected' : ''}>\${escapeAttr(b)}</option>\`
      ).join('');
      cell.innerHTML = \`<select class="\${cls}" style="width:100%">\${options}</select>\`;
    }

    function loadBranchesForRow(row, gitUrl, context) {
      const cell = row.querySelector('.branch-cell-container');
      if (!cell) return;

      if (!gitUrl) {
        delete row.dataset.branchRequestId;
        renderBranchInput(cell, context, 'main');
        return;
      }

      const requestId = ++branchRequestCounter;
      row.dataset.branchRequestId = String(requestId);
      row.dataset.branchContext = context;
      const cls = getBranchClass(context);
      cell.innerHTML = \`<select class="\${cls}" style="width:100%" disabled><option>加载分支中...</option></select>\`;
      vscode.postMessage({ type: 'fetchRemoteBranches', gitUrl, requestId, context });
    }

    function switchWorkMode(mode) {
      const isManage = mode === 'manage';
      document.getElementById('createPanel').style.display = isManage ? 'none' : 'block';
      document.getElementById('managePanel').style.display = isManage ? 'block' : 'none';
    }

    function scanWorkspace() {
      const root = document.getElementById('manageWorkspaceRoot').value.trim();
      if (!root) {
        log('请输入工作区根目录', 'error');
        return;
      }
      clearLogs();
      log('正在扫描工作区...', 'progress');
      vscode.postMessage({ type: 'scanWorkspace', workspacePath: root });
    }

    function renderRequirements(requirements) {
      const select = document.getElementById('requirementSelect');
      selectedRequirementPath = '';
      document.getElementById('requirementInfo').style.display = 'none';
      renderExistingRepos([]);

      if (!requirements || requirements.length === 0) {
        select.innerHTML = '<option value="">-- 未找到需求文件夹 --</option>';
        return;
      }

      select.innerHTML = '<option value="">-- 选择需求 --</option>' +
        requirements.map(r => \`<option value="\${r.path}">\${r.name}</option>\`).join('');
    }

    function escapeAttr(value) {
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;');
    }

    function renderExistingRepos(repositories) {
      const tbody = document.getElementById('existingRepoBody');
      if (!repositories || repositories.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="repo-list-empty">该需求下暂无 Git 工程</td></tr>';
        return;
      }
      tbody.innerHTML = repositories.map(r => \`
        <tr data-repo-path="\${escapeAttr(r.path)}">
          <td>\${r.name}</td>
          <td>\${r.gitUrl}</td>
          <td class="branch-cell">
            <span class="repo-branch-text">\${r.branch}</span>
            <button class="btn btn-sm btn-secondary refresh-repo-branch" data-path="\${escapeAttr(r.path)}" title="刷新分支">↻</button>
          </td>
          <td class="actions"></td>
        </tr>
      \`).join('');
    }

    function editTemplate(id) {
      editingId = id;
      loadTemplates();
    }

    function saveEdit(id) {
      const name = document.getElementById('editName').value.trim();
      const gitUrl = document.getElementById('editGitUrl').value.trim();

      if (!name || !gitUrl) {
        log('请填写完整的工程信息', 'error');
        return;
      }

      vscode.postMessage({
        type: 'updateTemplate',
        data: { id, name, gitUrl }
      });

      editingId = null;
    }

    function deleteTemplate(id) {
      if (confirm('确定要删除这个工程吗？')) {
        vscode.postMessage({
          type: 'deleteTemplate',
          data: { id }
        });
      }
    }

    // Event Listeners
    document.getElementById('openTemplateModal').addEventListener('click', openTemplateModal);
    document.getElementById('closeModal').addEventListener('click', closeTemplateModal);
    document.getElementById('closeModalBtn').addEventListener('click', closeTemplateModal);

    document.getElementById('templateModal').addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) {
        closeTemplateModal();
      }
    });

    document.getElementById('addTemplate').addEventListener('click', () => {
      const name = document.getElementById('templateName').value.trim();
      const gitUrl = document.getElementById('templateGitUrl').value.trim();

      if (!name || !gitUrl) {
        log('请填写工程名称和 Git 地址', 'error');
        return;
      }

      vscode.postMessage({
        type: 'addTemplate',
        data: { name, gitUrl }
      });

      document.getElementById('templateName').value = '';
      document.getElementById('templateGitUrl').value = '';
    });

    // Repository Functions
    document.getElementById('addRepo').addEventListener('click', () => {
      document.getElementById('repoBody').insertAdjacentHTML('beforeend', createRepoRowHtml('create'));
      log('添加新仓库行', 'info');
    });

    document.getElementById('repoTable').addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-repo')) {
        const row = e.target.closest('tr');
        const repoCount = document.querySelectorAll('#repoBody tr').length;
        if (repoCount > 1) {
          row.remove();
          log('删除仓库行', 'info');
        } else {
          log('至少保留一个仓库', 'error');
        }
      }
    });

    document.getElementById('repoTable').addEventListener('change', (e) => {
      if (e.target.classList.contains('create-template-select')) {
        const row = e.target.closest('tr');
        loadBranchesForRow(row, e.target.value.trim(), 'create');
      }
    });

    // Mode switch
    document.querySelectorAll('input[name="workMode"]').forEach(radio => {
      radio.addEventListener('change', (e) => switchWorkMode(e.target.value));
    });

    // Manage mode: workspace scan
    document.getElementById('browseManagePath').addEventListener('click', () => {
      vscode.postMessage({ type: 'browseDirectory', target: 'manage' });
    });
    document.getElementById('refreshWorkspace').addEventListener('click', scanWorkspace);

    document.getElementById('existingRepoTable').addEventListener('click', (e) => {
      const btn = e.target.closest('.refresh-repo-branch');
      if (!btn) return;
      const repoPath = btn.getAttribute('data-path');
      if (!repoPath) return;
      log(\`正在刷新分支: \${repoPath}\`, 'progress');
      vscode.postMessage({ type: 'refreshRepoBranch', repoPath });
    });

    document.getElementById('requirementSelect').addEventListener('change', (e) => {
      const reqPath = e.target.value;
      selectedRequirementPath = reqPath;
      if (!reqPath) {
        document.getElementById('requirementInfo').style.display = 'none';
        renderExistingRepos([]);
        return;
      }
      log('正在扫描需求目录...', 'progress');
      vscode.postMessage({ type: 'scanRequirement', requirementPath: reqPath });
    });

    document.getElementById('addAppendRepo').addEventListener('click', () => {
      document.getElementById('appendRepoBody').insertAdjacentHTML('beforeend', createRepoRowHtml('append'));
    });

    document.getElementById('appendRepoTable').addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-append-repo')) {
        const row = e.target.closest('tr');
        const count = document.querySelectorAll('#appendRepoBody tr').length;
        if (count > 1) {
          row.remove();
        } else {
          log('至少保留一个工程行', 'error');
        }
      }
    });

    document.getElementById('appendRepoTable').addEventListener('change', (e) => {
      if (e.target.classList.contains('append-template-select')) {
        const row = e.target.closest('tr');
        loadBranchesForRow(row, e.target.value.trim(), 'append');
      }
    });

    document.getElementById('appendRepos').addEventListener('click', () => {
      if (!selectedRequirementPath) {
        log('请先选择需求', 'error');
        return;
      }
      const repositories = [];
      document.querySelectorAll('#appendRepoBody tr').forEach(row => {
        const gitUrl = row.querySelector('.append-template-select')?.value.trim();
        const branch = row.querySelector('.append-branch')?.value.trim() || 'main';
        if (gitUrl) {
          repositories.push({ gitUrl, branch });
        }
      });
      if (repositories.length === 0) {
        log('请至少选择一个要追加的工程', 'error');
        return;
      }
      clearLogs();
      log('开始追加工程...', 'progress');
      vscode.postMessage({
        type: 'appendRepositoriesToPath',
        path: selectedRequirementPath,
        repositories
      });
    });

    document.getElementById('openInIDE').addEventListener('click', () => {
      if (!selectedRequirementPath) {
        log('请先选择需求', 'error');
        return;
      }
      const ide = document.querySelector('input[name="manageIde"]:checked')?.value || 'VSCode';
      vscode.postMessage({
        type: 'openInIDE',
        data: { path: selectedRequirementPath, ide }
      });
    });

    // Browse Directory
    document.getElementById('browsePath').addEventListener('click', () => {
      vscode.postMessage({ type: 'browseDirectory', target: 'create' });
    });

    // Clear Form
    document.getElementById('clearForm').addEventListener('click', () => {
      document.getElementById('workspaceName').value = '';
      document.getElementById('workspacePath').value = '';

      document.getElementById('repoBody').innerHTML = createRepoRowHtml('create');

      document.querySelector('input[name="ide"][value="VSCode"]').checked = true;
      clearLogs();
      log('表单已清空', 'info');
    });

    // Create Workspace
    document.getElementById('createWorkspace').addEventListener('click', async () => {
      const workspaceName = document.getElementById('workspaceName').value.trim();
      const workspacePath = document.getElementById('workspacePath').value.trim();

      const repoRows = document.querySelectorAll('#repoBody tr');
      const repositories = [];
      repoRows.forEach(row => {
        const url = row.querySelector('.create-template-select')?.value.trim();
        const branch = getBranchFromRow(row, 'create');
        if (url) {
          repositories.push({ url, branch });
        }
      });

      const selectedIDE = document.querySelector('input[name="ide"]:checked')?.value || 'VSCode';

      if (!workspaceName) {
        log('请输入需求名称', 'error');
        return;
      }
      if (!workspacePath) {
        log('请选择工作区路径', 'error');
        return;
      }
      if (repositories.length === 0) {
        log('请至少添加一个仓库', 'error');
        return;
      }

      const mainRepo = repositories[0];
      const additionalRepos = repositories.slice(1).map(r => r.url);
      const branch = mainRepo.branch;

      clearLogs();
      log('开始创建工作区...', 'info');

      vscode.postMessage({
        type: 'createProject',
        data: {
          workspace: workspacePath,
          projectName: workspaceName,
          gitUrl: mainRepo.url,
          branch: branch,
          ide: selectedIDE,
          repositories: additionalRepos
        }
      });
    });

    // Handle messages from extension
    window.addEventListener('message', (event) => {
      const message = event.data;

      if (message.type === 'log') {
        log(message.message, message.logType || 'info');
      }

      if (message.type === 'setDefaultWorkspaceRoot' && message.path) {
        const el = document.getElementById('manageWorkspaceRoot');
        if (!el.value.trim()) {
          el.value = message.path;
        }
      }

      if (message.type === 'setDirectory') {
        if (message.target === 'manage') {
          document.getElementById('manageWorkspaceRoot').value = message.path;
          scanWorkspace();
        } else {
          document.getElementById('workspacePath').value = message.path;
        }
      }

      if (message.type === 'workspaceScanned') {
        renderRequirements(message.requirements);
        log(\`扫描完成，找到 \${message.requirements?.length || 0} 个需求\`, 'success');
      }

      if (message.type === 'requirementScanned') {
        const req = message.requirement;
        selectedRequirementPath = req.path;
        document.getElementById('manageReqName').textContent = req.name;
        document.getElementById('manageReqPath').textContent = req.path;
        document.getElementById('requirementInfo').style.display = 'block';
        renderExistingRepos(req.repositories);
        log(\`已加载需求「\${req.name}」，共 \${req.repositories?.length || 0} 个工程\`, 'success');
      }

      if (message.type === 'remoteBranchesLoaded') {
        const rows = document.querySelectorAll('#appendRepoBody tr, #repoBody tr');
        for (const row of rows) {
          if (row.dataset.branchRequestId === String(message.requestId)) {
            const cell = row.querySelector('.branch-cell-container');
            const context = row.dataset.branchContext || message.context;
            if (cell) {
              if (message.branches && message.branches.length > 0) {
                renderBranchSelect(cell, message.branches, context);
                log(\`已加载 \${message.branches.length} 个远程分支\`, 'success');
              } else {
                renderBranchInput(cell, context, 'main');
                log('无法获取远程分支，请手动输入', 'error');
              }
            }
            break;
          }
        }
      }

      if (message.type === 'repoBranchRefreshed') {
        const rows = document.querySelectorAll('#existingRepoBody tr[data-repo-path]');
        for (const row of rows) {
          if (row.getAttribute('data-repo-path') === message.repoPath) {
            const branchEl = row.querySelector('.repo-branch-text');
            if (branchEl) {
              branchEl.textContent = message.branch;
            }
            const cells = row.querySelectorAll('td');
            if (cells[1] && message.gitUrl) {
              cells[1].textContent = message.gitUrl;
            }
            break;
          }
        }
        log(\`已刷新分支: \${message.branch}\`, 'success');
      }

      if (message.type === 'appendComplete') {
        log(message.message || '追加完成', message.logType || 'success');
        if (selectedRequirementPath) {
          vscode.postMessage({ type: 'scanRequirement', requirementPath: selectedRequirementPath });
        }
      }

      if (message.type === 'templates') {
        renderTemplates(message.templates);
        log('已加载工程列表', 'info');
      }

      if (message.type === 'templateAdded') {
        loadTemplates();
        log(message.message, message.logType || 'success');
      }

      if (message.type === 'templateDeleted') {
        loadTemplates();
        log(message.message, message.logType || 'success');
      }

      if (message.type === 'templateUpdated') {
        loadTemplates();
        log(message.message, message.logType || 'success');
      }
    });

    // Load templates on page load
    loadTemplates();
  </script>
</body>
</html>`;
    }
    async handleMessage(message) {
        switch (message.type) {
            case 'browseDirectory': {
                const selectedUri = await vscode.window.showOpenDialog({
                    canSelectFiles: false,
                    canSelectFolders: true,
                    canSelectMany: false,
                    openLabel: '选择目录'
                });
                if (selectedUri && selectedUri[0]) {
                    this.panel?.webview.postMessage({
                        type: 'setDirectory',
                        path: selectedUri[0].fsPath,
                        target: message.target || 'create'
                    });
                }
                break;
            }
            case 'scanWorkspace': {
                const requirements = await projectService_1.ProjectService.scanWorkspace(message.workspacePath);
                this.panel?.webview.postMessage({
                    type: 'workspaceScanned',
                    requirements
                });
                break;
            }
            case 'scanRequirement': {
                const requirement = await projectService_1.ProjectService.scanRequirement(message.requirementPath);
                this.panel?.webview.postMessage({
                    type: 'requirementScanned',
                    requirement
                });
                break;
            }
            case 'refreshRepoBranch': {
                const repoPath = message.repoPath;
                const branch = await gitService_1.GitService.getCurrentBranch(repoPath);
                const gitUrl = await gitService_1.GitService.getRemoteUrl(repoPath);
                this.panel?.webview.postMessage({
                    type: 'repoBranchRefreshed',
                    repoPath,
                    branch: branch || '(未知分支)',
                    gitUrl: gitUrl || '(无远程地址)'
                });
                break;
            }
            case 'fetchRemoteBranches': {
                const gitUrl = message.gitUrl;
                const branches = await gitService_1.GitService.getRemoteBranches(gitUrl);
                this.panel?.webview.postMessage({
                    type: 'remoteBranchesLoaded',
                    gitUrl,
                    requestId: message.requestId,
                    context: message.context,
                    branches
                });
                break;
            }
            case 'appendRepositoriesToPath':
                await this.handleAppendRepositories(message.path, message.repositories);
                break;
            case 'openInIDE':
                await this.handleOpenInIDE(message.data.path, message.data.ide);
                break;
            case 'getTemplates':
                const templates = projectTemplateService_1.ProjectTemplateService.getTemplates();
                this.panel?.webview.postMessage({
                    type: 'templates',
                    templates: templates
                });
                break;
            case 'addTemplate':
                try {
                    const { name, gitUrl } = message.data;
                    projectTemplateService_1.ProjectTemplateService.addTemplate(name, gitUrl);
                    this.panel?.webview.postMessage({
                        type: 'templateAdded',
                        message: `已添加工程: ${name}`,
                        logType: 'success'
                    });
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '未知错误';
                    this.panel?.webview.postMessage({
                        type: 'log',
                        message: `添加工程失败: ${errorMessage}`,
                        logType: 'error'
                    });
                }
                break;
            case 'updateTemplate':
                try {
                    const { id, name, gitUrl } = message.data;
                    projectTemplateService_1.ProjectTemplateService.updateTemplate(id, { name, gitUrl });
                    this.panel?.webview.postMessage({
                        type: 'templateUpdated',
                        message: `已更新工程: ${name}`,
                        logType: 'success'
                    });
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '未知错误';
                    this.panel?.webview.postMessage({
                        type: 'log',
                        message: `更新工程失败: ${errorMessage}`,
                        logType: 'error'
                    });
                }
                break;
            case 'deleteTemplate':
                try {
                    const { id } = message.data;
                    projectTemplateService_1.ProjectTemplateService.deleteTemplate(id);
                    this.panel?.webview.postMessage({
                        type: 'templateDeleted',
                        message: '已删除工程',
                        logType: 'success'
                    });
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '未知错误';
                    this.panel?.webview.postMessage({
                        type: 'log',
                        message: `删除工程失败: ${errorMessage}`,
                        logType: 'error'
                    });
                }
                break;
            case 'createProject':
                await this.handleCreateProject(message.data);
                break;
        }
    }
    async handleAppendRepositories(requirementPath, repositories) {
        try {
            const result = await projectService_1.ProjectService.appendRepositoriesToPath(requirementPath, repositories, (msg) => {
                this.panel?.webview.postMessage({
                    type: 'log',
                    message: msg,
                    logType: 'progress'
                });
            });
            if (result.success) {
                this.panel?.webview.postMessage({
                    type: 'appendComplete',
                    message: result.message || '工程追加成功',
                    logType: 'success'
                });
            }
            else {
                this.panel?.webview.postMessage({
                    type: 'log',
                    message: result.error || '追加失败',
                    logType: 'error'
                });
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : '未知错误';
            this.panel?.webview.postMessage({
                type: 'log',
                message: errorMessage,
                logType: 'error'
            });
        }
    }
    async handleOpenInIDE(requirementPath, ide) {
        try {
            const isInstalled = await ideService_1.IDEService.checkAndNotifyIDE(ide);
            if (!isInstalled) {
                this.panel?.webview.postMessage({
                    type: 'log',
                    message: `${ide} 未安装，无法打开`,
                    logType: 'error'
                });
                return;
            }
            const result = await ideService_1.IDEService.launchIDE(ide, requirementPath);
            this.panel?.webview.postMessage({
                type: 'log',
                message: result
                    ? `已在 ${ide} 中打开: ${requirementPath}`
                    : `打开失败: ${requirementPath}`,
                logType: result ? 'success' : 'error'
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : '未知错误';
            this.panel?.webview.postMessage({
                type: 'log',
                message: errorMessage,
                logType: 'error'
            });
        }
    }
    async handleCreateProject(formData) {
        try {
            const data = {
                workspace: formData.workspace,
                projectName: formData.projectName,
                gitUrl: formData.gitUrl,
                branch: formData.branch,
                ide: formData.ide,
                repositories: formData.repositories
            };
            this.panel?.webview.postMessage({
                type: 'log',
                message: '正在创建工作区...',
                logType: 'progress'
            });
            const result = await projectService_1.ProjectService.createProject(data, (msg, progress) => {
                this.panel?.webview.postMessage({
                    type: 'log',
                    message: msg,
                    logType: 'progress'
                });
            });
            if (result.success) {
                this.panel?.webview.postMessage({
                    type: 'log',
                    message: result.message || '工作区创建成功！',
                    logType: 'success'
                });
                refreshProjectsTreeView();
            }
            else {
                this.panel?.webview.postMessage({
                    type: 'log',
                    message: result.error || '创建失败',
                    logType: 'error'
                });
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : '未知错误';
            this.panel?.webview.postMessage({
                type: 'log',
                message: errorMessage,
                logType: 'error'
            });
        }
    }
}
exports.FormView = FormView;
async function createProjectCommand(context) {
    projectTemplateService_1.ProjectTemplateService.setContext(context);
    if (!formView) {
        formView = new FormView(context.extensionUri);
    }
    await formView.show();
}
async function openProjectByIdCommand(projectId) {
    const openResult = await projectService_1.ProjectService.openProject(projectId);
    if (!openResult.success) {
        vscode.window.showErrorMessage(openResult.message);
    }
    else {
        refreshProjectsTreeView();
    }
}
async function refreshProjectsTreeView() {
    projectTreeDataProvider?.refresh();
}
async function listProjectsCommand() {
    const projects = await projectService_1.ProjectService.getAllProjects();
    if (projects.length === 0) {
        vscode.window.showInformationMessage('No projects created yet. Use "Multi-Project Creator: Create Project" to create one.');
        return;
    }
    const items = projects.map(project => ({
        label: `$(folder) ${project.name}`,
        description: `${project.ide} • ${project.branch}`,
        detail: `${project.workspace}/${project.name}`,
        project
    }));
    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a project to open',
        matchOnDescription: true,
        matchOnDetail: true
    });
    if (selected) {
        const actions = [
            { label: 'Open', action: 'open' },
            { label: 'Refresh', action: 'refresh' },
            { label: 'Delete from List', action: 'delete' },
            { label: 'Delete with Files', action: 'deleteAll' }
        ];
        const action = await vscode.window.showQuickPick(actions, {
            placeHolder: `What would you like to do with ${selected.project.name}?`
        });
        if (action) {
            switch (action.action) {
                case 'open':
                    const openResult = await projectService_1.ProjectService.openProject(selected.project.id);
                    if (!openResult.success) {
                        vscode.window.showErrorMessage(openResult.message);
                    }
                    break;
                case 'refresh':
                    const refreshResult = await projectService_1.ProjectService.refreshProject(selected.project.id);
                    if (refreshResult.success) {
                        vscode.window.showInformationMessage(refreshResult.message);
                    }
                    else {
                        vscode.window.showErrorMessage(refreshResult.message);
                    }
                    break;
                case 'delete':
                    const deleteResult = await projectService_1.ProjectService.deleteProjectFiles(selected.project.id, false);
                    if (deleteResult.success) {
                        vscode.window.showInformationMessage(deleteResult.message);
                        refreshProjectsTreeView();
                    }
                    else {
                        vscode.window.showErrorMessage(deleteResult.message);
                    }
                    break;
                case 'deleteAll':
                    const confirm = await vscode.window.showWarningMessage(`Are you sure you want to delete "${selected.project.name}" and all its files?`, { modal: true }, 'Delete', 'Cancel');
                    if (confirm === 'Delete') {
                        const deleteAllResult = await projectService_1.ProjectService.deleteProjectFiles(selected.project.id, true);
                        if (deleteAllResult.success) {
                            vscode.window.showInformationMessage(deleteAllResult.message);
                            refreshProjectsTreeView();
                        }
                        else {
                            vscode.window.showErrorMessage(deleteAllResult.message);
                        }
                    }
                    break;
            }
        }
    }
}
function registerCommands(context) {
    projectTemplateService_1.ProjectTemplateService.setContext(context);
    const createCommand = vscode.commands.registerCommand('multiProjectCreator.createProject', () => createProjectCommand(context));
    const listCommand = vscode.commands.registerCommand('multiProjectCreator.listProjects', () => listProjectsCommand());
    const openProjectByIdHandler = vscode.commands.registerCommand('multiProjectCreator.openProjectById', (projectId) => openProjectByIdCommand(projectId));
    // Register tree view
    projectTreeDataProvider = new projectTreeDataProvider_1.ProjectTreeDataProvider();
    vscode.window.registerTreeDataProvider('projectExplorer', projectTreeDataProvider);
    // Set up project change callback
    projectService_1.ProjectService.setOnProjectChangedCallback(refreshProjectsTreeView);
    context.subscriptions.push(createCommand, listCommand, openProjectByIdHandler);
}
//# sourceMappingURL=commands.js.map