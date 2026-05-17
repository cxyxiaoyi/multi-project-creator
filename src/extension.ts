import * as vscode from 'vscode';
import { registerCommands } from './commands/commands';
import { ProjectService } from './services/projectService';

export function activate(context: vscode.ExtensionContext): void {
  console.log('Multi-Project Creator extension is now active!');
  
  ProjectService.setGlobalState(context.globalState);
  
  registerCommands(context);
  
  vscode.window.showInformationMessage(
    'Multi-Project Creator: Use "Multi-Project Creator: Create Project" command to create a new project workspace.'
  );
}

export function deactivate(): void {
  console.log('Multi-Project Creator extension is deactivated.');
}
