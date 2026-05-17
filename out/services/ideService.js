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
exports.IDEService = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class IDEService {
    static getIDEConfig(ideType) {
        return this.ideConfigs.find(config => config.name === ideType);
    }
    static async isIDEInstalled(ideType) {
        const config = this.getIDEConfig(ideType);
        if (!config) {
            return false;
        }
        try {
            if (process.platform === 'darwin') {
                return fs.existsSync(config.macOSPath);
            }
            else if (process.platform === 'win32') {
                return fs.existsSync(config.windowsPath);
            }
            else {
                const { stdout } = await execAsync(`which ${config.appName}`);
                return stdout.trim().length > 0;
            }
        }
        catch (error) {
            return false;
        }
    }
    static async checkAndNotifyIDE(ideType) {
        const isInstalled = await this.isIDEInstalled(ideType);
        if (!isInstalled) {
            const config = this.getIDEConfig(ideType);
            const message = `${ideType} is not installed on your system. Please install it first or choose a different IDE.`;
            vscode.window.showWarningMessage(message).then(selection => {
                if (selection === 'OK') {
                    vscode.window.showInformationMessage(`To install ${ideType}, please visit the official website and download the installer.`);
                }
            });
            return false;
        }
        return true;
    }
    static async launchIDE(ideType, workspacePath) {
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
            }
            else if (process.platform === 'win32') {
                await execAsync(`"${config.windowsPath}" "${workspacePath}"`);
            }
            else {
                await execAsync(`${config.appName} "${workspacePath}"`);
            }
            vscode.window.showInformationMessage(`Successfully opened ${workspacePath} in ${ideType}`);
            return true;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to launch ${ideType}: ${errorMessage}`);
            return false;
        }
    }
    static async getInstalledIDEs() {
        const installedIDEs = [];
        for (const ideType of ['VSCode', 'Cursor', 'Qoder', 'Kiro', 'IDEA']) {
            const isInstalled = await this.isIDEInstalled(ideType);
            if (isInstalled) {
                installedIDEs.push(ideType);
            }
        }
        return installedIDEs;
    }
    static getAllIDETypes() {
        return ['VSCode', 'Cursor', 'Qoder', 'Kiro', 'IDEA'];
    }
    static getIDECategory(ideType) {
        const config = this.getIDEConfig(ideType);
        return config?.category || 'vscode-like';
    }
}
exports.IDEService = IDEService;
IDEService.ideConfigs = [
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
//# sourceMappingURL=ideService.js.map