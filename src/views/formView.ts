import * as vscode from 'vscode';
import * as path from 'path';
import { FormData, IDEType, ValidationError } from '../models/types';
import { Validator } from '../utils/validator';
import { ProjectService } from '../services/projectService';

export class FormView {
  private panel: vscode.WebviewPanel | undefined;
  private extensionUri: vscode.Uri;

  constructor(extensionUri: vscode.Uri) {
    this.extensionUri = extensionUri;
  }

  async show(): Promise<void> {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'multiProjectCreatorForm',
      'Multi-Project Creator',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.extensionUri]
      }
    );

    this.panel.webview.html = this.getWebviewContent();
    
    this.panel.webview.onDidReceiveMessage(async (message) => {
      await this.handleMessage(message);
    });

    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });
  }

  private getWebviewContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Multi-Project Creator</title>
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
      max-width: 800px;
      margin: 0 auto;
    }
    
    h1 {
      font-size: 24px;
      margin-bottom: 20px;
      color: var(--vscode-textLink-foreground);
    }
    
    .form-group {
      margin-bottom: 16px;
    }
    
    label {
      display: block;
      font-weight: 600;
      margin-bottom: 6px;
      color: var(--vscode-foreground);
    }
    
    label .required {
      color: #f14c4c;
    }
    
    input, select, textarea {
      width: 100%;
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
    
    input.error, select.error, textarea.error {
      border-color: #f14c4c;
    }
    
    .error-message {
      color: #f14c4c;
      font-size: 12px;
      margin-top: 4px;
    }
    
    .help-text {
      color: var(--vscode-foreground);
      opacity: 0.7;
      font-size: 12px;
      margin-top: 4px;
    }
    
    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: background-color 0.2s;
    }
    
    .btn-primary {
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    
    .btn-primary:hover {
      background-color: var(--vscode-button-hoverBackground);
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
      gap: 10px;
      margin-top: 24px;
    }
    
    .progress-container {
      margin-top: 20px;
      display: none;
    }
    
    .progress-bar {
      width: 100%;
      height: 20px;
      background-color: var(--vscode-progressBar-background);
      border-radius: 4px;
      overflow: hidden;
    }
    
    .progress-fill {
      height: 100%;
      background-color: var(--vscode-progressBar-foreground);
      width: 0%;
      transition: width 0.3s;
    }
    
    .progress-text {
      margin-top: 8px;
      font-size: 14px;
      color: var(--vscode-foreground);
    }
    
    .repository-item {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
      align-items: center;
    }
    
    .repository-item input {
      flex: 1;
    }
    
    .btn-remove {
      background-color: #f14c4c;
      color: white;
      padding: 6px 12px;
    }
    
    .add-repo-btn {
      margin-top: 8px;
    }
    
    .ide-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 10px;
      margin-top: 10px;
    }
    
    .ide-option {
      border: 2px solid var(--vscode-input-border);
      border-radius: 8px;
      padding: 16px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .ide-option:hover {
      border-color: var(--vscode-focusBorder);
    }
    
    .ide-option.selected {
      border-color: var(--vscode-textLink-foreground);
      background-color: var(--vscode-textLink-foreground);
      background-opacity: 0.1;
    }
    
    .ide-icon {
      font-size: 32px;
      margin-bottom: 8px;
    }
    
    .ide-name {
      font-weight: 600;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔧 Multi-Project Creator</h1>
    
    <form id="projectForm">
      <div class="form-group">
        <label for="workspace">Local Workspace Directory <span class="required">*</span></label>
        <input type="text" id="workspace" name="workspace" placeholder="/Users/yourname/projects" required>
        <div class="help-text">Absolute path where project folders will be created</div>
        <div class="error-message" id="workspace-error"></div>
      </div>

      <div class="form-group">
        <label for="projectName">Project Name <span class="required">*</span></label>
        <input type="text" id="projectName" name="projectName" placeholder="feature_login_v2" required>
        <div class="help-text">Use English letters, numbers, and underscores only</div>
        <div class="error-message" id="projectName-error"></div>
      </div>

      <div class="form-group">
        <label for="gitUrl">Main Git Repository URL <span class="required">*</span></label>
        <input type="text" id="gitUrl" name="gitUrl" placeholder="https://github.com/username/repo.git" required>
        <div class="error-message" id="gitUrl-error"></div>
      </div>

      <div class="form-group">
        <label for="branch">Development Branch <span class="required">*</span></label>
        <input type="text" id="branch" name="branch" placeholder="feature/login-v2" required>
        <div class="help-text">Branch name to clone or create</div>
        <div class="error-message" id="branch-error"></div>
      </div>

      <div class="form-group">
        <label>IDE to Open With <span class="required">*</span></label>
        <div class="ide-grid" id="ideGrid">
          <div class="ide-option selected" data-ide="VSCode">
            <div class="ide-icon">💻</div>
            <div class="ide-name">VSCode</div>
          </div>
          <div class="ide-option" data-ide="Cursor">
            <div class="ide-icon">🎯</div>
            <div class="ide-name">Cursor</div>
          </div>
          <div class="ide-option" data-ide="Qoder">
            <div class="ide-icon">🚀</div>
            <div class="ide-name">Qoder</div>
          </div>
          <div class="ide-option" data-ide="Kiro">
            <div class="ide-icon">⚡</div>
            <div class="ide-name">Kiro</div>
          </div>
          <div class="ide-option" data-ide="IDEA">
            <div class="ide-icon">💎</div>
            <div class="ide-name">IDEA</div>
          </div>
        </div>
        <input type="hidden" id="ide" name="ide" value="VSCode">
        <div class="error-message" id="ide-error"></div>
      </div>

      <div class="form-group">
        <label>Additional Repositories</label>
        <div id="repositoryList">
        </div>
        <button type="button" class="btn btn-secondary add-repo-btn" id="addRepository">+ Add Repository</button>
        <div class="help-text">Add more repositories to clone into the same project folder</div>
      </div>

      <div class="button-group">
        <button type="submit" class="btn btn-primary" id="submitBtn">Create Project</button>
        <button type="button" class="btn btn-secondary" id="cancelBtn">Cancel</button>
      </div>

      <div class="progress-container" id="progressContainer">
        <div class="progress-bar">
          <div class="progress-fill" id="progressFill"></div>
        </div>
        <div class="progress-text" id="progressText">Initializing...</div>
      </div>
    </form>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    let selectedIDE = 'VSCode';
    
    document.querySelectorAll('.ide-option').forEach(option => {
      option.addEventListener('click', () => {
        document.querySelectorAll('.ide-option').forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        selectedIDE = option.dataset.ide;
        document.getElementById('ide').value = selectedIDE;
      });
    });

    document.getElementById('addRepository').addEventListener('click', () => {
      const repoList = document.getElementById('repositoryList');
      const repoItem = document.createElement('div');
      repoItem.className = 'repository-item';
      repoItem.innerHTML = \`
        <input type="text" class="additional-repo" placeholder="https://github.com/username/repo2.git">
        <button type="button" class="btn btn-remove" onclick="this.parentElement.remove()">Remove</button>
      \`;
      repoList.appendChild(repoItem);
    });

    function clearErrors() {
      document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
      document.querySelectorAll('input.error').forEach(el => el.classList.remove('error'));
    }

    function showError(field, message) {
      const errorEl = document.getElementById(\`\${field}-error\`);
      const inputEl = document.getElementById(field);
      if (errorEl) errorEl.textContent = message;
      if (inputEl) inputEl.classList.add('error');
    }

    document.getElementById('projectForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors();

      const formData = {
        workspace: document.getElementById('workspace').value.trim(),
        projectName: document.getElementById('projectName').value.trim(),
        gitUrl: document.getElementById('gitUrl').value.trim(),
        branch: document.getElementById('branch').value.trim(),
        ide: selectedIDE,
        repositories: Array.from(document.querySelectorAll('.additional-repo'))
          .map(input => input.value.trim())
          .filter(url => url.length > 0)
      };

      vscode.postMessage({ type: 'submit', data: formData });
    });

    document.getElementById('cancelBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'cancel' });
    });

    window.addEventListener('message', (event) => {
      const message = event.data;
      
      if (message.type === 'progress') {
        document.getElementById('progressContainer').style.display = 'block';
        document.getElementById('progressFill').style.width = message.progress + '%';
        document.getElementById('progressText').textContent = message.message;
      }
      
      if (message.type === 'success') {
        document.getElementById('progressFill').style.width = '100%';
        document.getElementById('progressText').textContent = message.message;
        setTimeout(() => {
          vscode.postMessage({ type: 'close' });
        }, 1500);
      }
      
      if (message.type === 'error') {
        document.getElementById('progressContainer').style.display = 'none';
        if (message.field) {
          showError(message.field, message.message);
        } else {
          vscode.showErrorMessage(message.message);
        }
      }
    });
  </script>
</body>
</html>`;
  }

  private async handleMessage(message: any): Promise<void> {
    switch (message.type) {
      case 'submit':
        await this.handleSubmit(message.data);
        break;
      case 'cancel':
        this.panel?.dispose();
        break;
      case 'close':
        this.panel?.dispose();
        break;
    }
  }

  private async handleSubmit(data: FormData): Promise<void> {
    const errors = Validator.validateForm(data);
    
    if (errors.length > 0) {
      errors.forEach(error => {
        this.panel?.webview.postMessage({
          type: 'error',
          field: error.field,
          message: error.message
        });
      });
      return;
    }

    try {
      const result = await ProjectService.createProject(data, (progressMessage, progressValue) => {
        this.panel?.webview.postMessage({
          type: 'progress',
          message: progressMessage,
          progress: progressValue || 0
        });
      });

      if (result.success) {
        this.panel?.webview.postMessage({
          type: 'success',
          message: result.message || 'Project created successfully!'
        });
      } else {
        this.panel?.webview.postMessage({
          type: 'error',
          message: result.error || 'Failed to create project'
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.panel?.webview.postMessage({
        type: 'error',
        message: errorMessage
      });
    }
  }
}
