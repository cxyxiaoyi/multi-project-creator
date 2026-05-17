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
exports.GitService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class GitService {
    static async ensureDirectoryExists(dirPath) {
        try {
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
            return { success: true, message: `Directory ensured: ${dirPath}` };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, message: `Failed to create directory`, error: errorMessage };
        }
    }
    static async cloneRepository(gitUrl, targetPath, branch, onProgress) {
        try {
            if (!fs.existsSync(targetPath)) {
                fs.mkdirSync(targetPath, { recursive: true });
            }
            const repoName = this.extractRepoName(gitUrl);
            const clonePath = path.join(targetPath, repoName);
            onProgress?.(`Cloning ${gitUrl} into ${clonePath}...`);
            const branchOption = branch ? `--branch ${branch}` : '';
            const command = `git clone ${branchOption} ${gitUrl} "${clonePath}"`;
            const { stdout, stderr } = await execAsync(command, {
                maxBuffer: 1024 * 1024 * 100,
                cwd: targetPath
            });
            if (stderr && !stderr.includes('warning')) {
                console.log('Git stderr:', stderr);
            }
            if (!fs.existsSync(clonePath)) {
                return { success: false, message: 'Clone failed - directory not created', error: stderr };
            }
            onProgress?.(`Successfully cloned ${repoName}`);
            return { success: true, message: `Successfully cloned to ${clonePath}` };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            onProgress?.(`Error: ${errorMessage}`);
            if (errorMessage.includes('already exists')) {
                onProgress?.(`Repository already exists, checking branch...`);
                return this.switchBranch(targetPath, branch, onProgress);
            }
            return { success: false, message: 'Clone failed', error: errorMessage };
        }
    }
    static async switchBranch(repoPath, branch, onProgress) {
        try {
            onProgress?.(`Switching to branch: ${branch}`);
            const { stdout: fetchStdout } = await execAsync('git fetch origin', { cwd: repoPath });
            try {
                await execAsync(`git checkout ${branch}`, { cwd: repoPath });
                onProgress?.(`Switched to existing branch: ${branch}`);
                return { success: true, message: `Switched to branch ${branch}` };
            }
            catch (checkoutError) {
                onProgress?.(`Branch ${branch} doesn't exist, creating it...`);
                await execAsync(`git checkout -b ${branch}`, { cwd: repoPath });
                onProgress?.(`Created and switched to new branch: ${branch}`);
                return { success: true, message: `Created and switched to branch ${branch}` };
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, message: 'Failed to switch branch', error: errorMessage };
        }
    }
    static async checkBranchExists(repoPath, branch) {
        try {
            const { stdout } = await execAsync('git branch -a', { cwd: repoPath });
            return stdout.includes(branch) || stdout.includes(`remotes/origin/${branch}`);
        }
        catch (error) {
            return false;
        }
    }
    static async createBranch(repoPath, branch) {
        try {
            await execAsync(`git checkout -b ${branch}`, { cwd: repoPath });
            return { success: true, message: `Created branch ${branch}` };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, message: 'Failed to create branch', error: errorMessage };
        }
    }
    static extractRepoName(gitUrl) {
        const match = gitUrl.match(/\/([^\/]+?)(?:\.git)?$/);
        return match ? match[1] : 'repository';
    }
    static async validateGitUrl(gitUrl) {
        try {
            await execAsync(`git ls-remote --exit-code ${gitUrl}`, { timeout: 10000 });
            return true;
        }
        catch (error) {
            return false;
        }
    }
    static async getRemoteBranches(gitUrl) {
        try {
            const { stdout } = await execAsync(`git ls-remote --heads ${gitUrl}`, { timeout: 10000 });
            const branches = [];
            stdout.split('\n').forEach(line => {
                const match = line.match(/refs\/heads\/(.+)$/);
                if (match) {
                    branches.push(match[1]);
                }
            });
            return branches;
        }
        catch (error) {
            return [];
        }
    }
    static async initializeRepository(repoPath) {
        try {
            if (!fs.existsSync(path.join(repoPath, '.git'))) {
                await execAsync('git init', { cwd: repoPath });
            }
            return { success: true, message: 'Repository initialized' };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, message: 'Failed to initialize repository', error: errorMessage };
        }
    }
    static async pullLatest(repoPath, branch) {
        try {
            await execAsync(`git pull origin ${branch}`, { cwd: repoPath, timeout: 60000 });
            return { success: true, message: 'Pulled latest changes' };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, message: 'Failed to pull', error: errorMessage };
        }
    }
    static async getCurrentBranch(repoPath) {
        try {
            const { stdout } = await execAsync('git branch --show-current', { cwd: repoPath });
            return stdout.trim();
        }
        catch (error) {
            return '';
        }
    }
}
exports.GitService = GitService;
//# sourceMappingURL=gitService.js.map