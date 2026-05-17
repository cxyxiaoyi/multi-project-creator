import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { IDEType, IDEConfig, IDECategory } from '../models/types';

const execAsync = promisify(exec);

export class IDEService {
  private static ideConfigs: IDEConfig[] = [
    {
      name: 'VSCode',
      macOSPath: '/Applications/Visual Studio Code.app',
      windowsPath: 'C:\\Program Files\\Microsoft VS Code\\Code.exe',
      appName: 'Code',
      category: 'vscode-like'
    },
    {
      name: 'Cursor',
      macOSPath: '/Applications/Cursor.app',
      windowsPath: 'C:\\Users\\AppData\\Local\\Programs\\Cursor\\Cursor.exe',
      appName: 'Cursor',
      category: 'vscode-like'
    },
    {
      name: 'Qoder',
      macOSPath: '/Applications/Qoder.app',
      windowsPath: 'C:\\Program Files\\Qoder\\Qoder.exe',
      appName: 'Qoder',
      category: 'vscode-like'
    },
    {
      name: 'Kiro',
      macOSPath: '/Applications/Kiro.app',
      windowsPath: 'C:\\Program Files\\Kiro\\Kiro.exe',
      appName: 'Kiro',
      category: 'vscode-like'
    },
    {
      name: 'IDEA',
      macOSPath: '/Applications/IntelliJ IDEA.app',
      windowsPath: 'C:\\Program Files\\JetBrains\\IntelliJ IDEA\\bin\\idea64.exe',
      appName: 'idea',
      category: 'idea-like'
    }
  ];

  static getIDEConfig(ideType: IDEType): IDEConfig | undefined {
    return this.ideConfigs.find(config => config.name === ideType);
  }

  static async isIDEInstalled(ideType: IDEType): Promise<boolean> {
    const config = this.getIDEConfig(ideType);
    if (!config) {
      return false;
    }

    try {
      if (process.platform === 'darwin') {
        return fs.existsSync(config.macOSPath);
      } else if (process.platform === 'win32') {
        return fs.existsSync(config.windowsPath);
      } else {
        const { stdout } = await execAsync(`which ${config.appName}`);
        return stdout.trim().length > 0;
      }
    } catch (error) {
      return false;
    }
  }

  static async checkAndNotifyIDE(ideType: IDEType): Promise<boolean> {
    const isInstalled = await this.isIDEInstalled(ideType);
    
    if (!isInstalled) {
      const config = this.getIDEConfig(ideType);
      const message = `${ideType} is not installed on your system. Please install it first or choose a different IDE.`;
      
      vscode.window.showWarningMessage(message).then(selection => {
        if (selection === 'OK') {
          vscode.window.showInformationMessage(
            `To install ${ideType}, please visit the official website and download the installer.`
          );
        }
      });
      
      return false;
    }
    
    return true;
  }

  static async launchIDE(ideType: IDEType, workspacePath: string): Promise<boolean> {
    const config = this.getIDEConfig(ideType);
    if (!config) {
      vscode.window.showErrorMessage(`Unknown IDE type: ${ideType}`);
      return false;
    }

    const isInstalled = await this.isIDEInstalled(ideType);
    if (!isInstalled) {
      vscode.window.showErrorMessage(`${ideType} is not installed. Cannot launch workspace.`);
      return false;
    }

    try {
      if (process.platform === 'darwin') {
        await execAsync(`open -a "${config.appName}" "${workspacePath}"`);
      } else if (process.platform === 'win32') {
        await execAsync(`"${config.windowsPath}" "${workspacePath}"`);
      } else {
        await execAsync(`${config.appName} "${workspacePath}"`);
      }
      
      vscode.window.showInformationMessage(`Successfully opened ${workspacePath} in ${ideType}`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to launch ${ideType}: ${errorMessage}`);
      return false;
    }
  }

  static async getInstalledIDEs(): Promise<IDEType[]> {
    const installedIDEs: IDEType[] = [];
    
    for (const ideType of ['VSCode', 'Cursor', 'Qoder', 'Kiro', 'IDEA'] as IDEType[]) {
      const isInstalled = await this.isIDEInstalled(ideType);
      if (isInstalled) {
        installedIDEs.push(ideType);
      }
    }
    
    return installedIDEs;
  }

  static getAllIDETypes(): IDEType[] {
    return ['VSCode', 'Cursor', 'Qoder', 'Kiro', 'IDEA'];
  }

  static getIDECategory(ideType: IDEType): IDECategory {
    const config = this.getIDEConfig(ideType);
    return config?.category || 'vscode-like';
  }
}
