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
const projectService_1 = require("../services/projectService");
const projectTreeDataProvider_1 = require("../views/projectTreeDataProvider");
const projectTemplateService_1 = require("../services/projectTemplateService");
let formView;
let projectTreeDataProvider;
class FormView {
    constructor(extensionUri) {
        this.extensionUri = extensionUri;
    }
    async show() {
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.One);
            return;
        }
        this.panel = vscode.window.createWebviewPanel('multiProjectCreatorForm', '多工作区创建工具', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        // Get saved templates
        const templates = projectTemplateService_1.ProjectTemplateService.getTemplates();
        this.panel.webview.html = this.getWebviewContent(templates);
        this.panel.webview.onDidReceiveMessage(async (message) => {
            await this.handleMessage(message);
        });
        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });
    }
    getWebviewContent(templates) {
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
  </style>
</head>
<body>
  <div class="container">
    <!-- Main Form -->
    <h2>创建工作区</h2>

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

    <!-- Select Project Template -->
    <div class="form-group">
      <label for="projectSelect">选择工程:</label>
      <div class="input-row">
        <select id="projectSelect">
          <option value="">-- 选择已保存的工程 --</option>
          ${templateOptions}
        </select>
        <button class="btn btn-secondary" id="useTemplate">使用选中工程</button>
      </div>
    </div>

    <!-- Repository List -->
    <div class="repo-section">
      <label>Git 仓库列表</label>
      <table class="repo-table" id="repoTable">
        <thead>
          <tr>
            <th style="width: 60%;">仓库 URL</th>
            <th style="width: 30%;">分支名</th>
            <th style="width: 10%;" class="actions">操作</th>
          </tr>
        </thead>
        <tbody id="repoBody">
          <tr>
            <td><input type="text" class="repo-url" placeholder="https://github.com/username/repo.git"></td>
            <td><input type="text" class="repo-branch" placeholder="main" value="main"></td>
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

      // Update select options in main form
      const select = document.getElementById('projectSelect');
      const currentValue = select.value;
      select.innerHTML = '<option value="">-- 选择已保存的工程 --</option>' +
        templates.map(t => \`<option value="\${t.gitUrl}">\${t.name}</option>\`).join('');
      select.value = currentValue;
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
      const repoBody = document.getElementById('repoBody');
      const newRow = document.createElement('tr');
      newRow.innerHTML = \`
        <td><input type="text" class="repo-url" placeholder="https://github.com/username/repo.git"></td>
        <td><input type="text" class="repo-branch" placeholder="main" value="main"></td>
        <td class="actions">
          <button class="btn btn-sm btn-danger delete-repo">删除</button>
        </td>
      \`;
      repoBody.appendChild(newRow);
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

    // Browse Directory
    document.getElementById('browsePath').addEventListener('click', () => {
      vscode.postMessage({ type: 'browseDirectory' });
    });

    // Use Template
    document.getElementById('useTemplate').addEventListener('click', () => {
      const select = document.getElementById('projectSelect');
      const selectedUrl = select.value;

      if (!selectedUrl) {
        log('请先选择一个工程', 'error');
        return;
      }

      const firstRepoUrl = document.querySelector('.repo-url');
      if (firstRepoUrl) {
        firstRepoUrl.value = selectedUrl;
        log(\`已加载工程: \${selectedUrl}\`, 'info');
      }
    });

    // Clear Form
    document.getElementById('clearForm').addEventListener('click', () => {
      document.getElementById('workspaceName').value = '';
      document.getElementById('workspacePath').value = '';
      document.getElementById('projectSelect').value = '';

      const repoBody = document.getElementById('repoBody');
      repoBody.innerHTML = \`
        <tr>
          <td><input type="text" class="repo-url" placeholder="https://github.com/username/repo.git"></td>
          <td><input type="text" class="repo-branch" placeholder="main" value="main"></td>
          <td class="actions">
            <button class="btn btn-sm btn-danger delete-repo">删除</button>
          </td>
        </tr>
      \`;

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
        const url = row.querySelector('.repo-url').value.trim();
        const branch = row.querySelector('.repo-branch').value.trim();
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

      if (message.type === 'setDirectory') {
        document.getElementById('workspacePath').value = message.path;
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
            case 'browseDirectory':
                const selectedUri = await vscode.window.showOpenDialog({
                    canSelectFiles: false,
                    canSelectFolders: true,
                    canSelectMany: false,
                    openLabel: '选择目录'
                });
                if (selectedUri && selectedUri[0]) {
                    this.panel?.webview.postMessage({
                        type: 'setDirectory',
                        path: selectedUri[0].fsPath
                    });
                }
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