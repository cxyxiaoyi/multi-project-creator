import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Repository, OperationResult } from '../models/types';

const execAsync = promisify(exec);

export class GitService {
  static async ensureDirectoryExists(dirPath: string): Promise<OperationResult> {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      return { success: true, message: `Directory ensured: ${dirPath}` };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message: `Failed to create directory`, error: errorMessage };
    }
  }

  static async cloneRepository(
    gitUrl: string,
    targetPath: string,
    branch: string,
    onProgress?: (message: string) => void
  ): Promise<OperationResult> {
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onProgress?.(`Error: ${errorMessage}`);
      
      if (errorMessage.includes('already exists')) {
        onProgress?.(`Repository already exists, checking branch...`);
        return this.switchBranch(targetPath, branch, onProgress);
      }
      
      return { success: false, message: 'Clone failed', error: errorMessage };
    }
  }

  static async switchBranch(
    repoPath: string,
    branch: string,
    onProgress?: (message: string) => void
  ): Promise<OperationResult> {
    try {
      onProgress?.(`Switching to branch: ${branch}`);

      const { stdout: fetchStdout } = await execAsync('git fetch origin', { cwd: repoPath });
      
      try {
        await execAsync(`git checkout ${branch}`, { cwd: repoPath });
        onProgress?.(`Switched to existing branch: ${branch}`);
        return { success: true, message: `Switched to branch ${branch}` };
      } catch (checkoutError) {
        onProgress?.(`Branch ${branch} doesn't exist, creating it...`);
        await execAsync(`git checkout -b ${branch}`, { cwd: repoPath });
        onProgress?.(`Created and switched to new branch: ${branch}`);
        return { success: true, message: `Created and switched to branch ${branch}` };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message: 'Failed to switch branch', error: errorMessage };
    }
  }

  static async checkBranchExists(repoPath: string, branch: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync('git branch -a', { cwd: repoPath });
      return stdout.includes(branch) || stdout.includes(`remotes/origin/${branch}`);
    } catch (error) {
      return false;
    }
  }

  static async createBranch(repoPath: string, branch: string): Promise<OperationResult> {
    try {
      await execAsync(`git checkout -b ${branch}`, { cwd: repoPath });
      return { success: true, message: `Created branch ${branch}` };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message: 'Failed to create branch', error: errorMessage };
    }
  }

  static extractRepoName(gitUrl: string): string {
    const match = gitUrl.match(/\/([^\/]+?)(?:\.git)?$/);
    return match ? match[1] : 'repository';
  }

  static async validateGitUrl(gitUrl: string): Promise<boolean> {
    try {
      await execAsync(`git ls-remote --exit-code ${gitUrl}`, { timeout: 10000 });
      return true;
    } catch (error) {
      return false;
    }
  }

  static async getRemoteBranches(gitUrl: string): Promise<string[]> {
    try {
      const { stdout } = await execAsync(`git ls-remote --heads ${gitUrl}`, { timeout: 10000 });
      const branches: string[] = [];
      
      stdout.split('\n').forEach(line => {
        const match = line.match(/refs\/heads\/(.+)$/);
        if (match) {
          branches.push(match[1]);
        }
      });
      
      return branches;
    } catch (error) {
      return [];
    }
  }

  static async initializeRepository(repoPath: string): Promise<OperationResult> {
    try {
      if (!fs.existsSync(path.join(repoPath, '.git'))) {
        await execAsync('git init', { cwd: repoPath });
      }
      return { success: true, message: 'Repository initialized' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message: 'Failed to initialize repository', error: errorMessage };
    }
  }

  static async pullLatest(repoPath: string, branch: string): Promise<OperationResult> {
    try {
      await execAsync(`git pull origin ${branch}`, { cwd: repoPath, timeout: 60000 });
      return { success: true, message: 'Pulled latest changes' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message: 'Failed to pull', error: errorMessage };
    }
  }

  static async getCurrentBranch(repoPath: string): Promise<string> {
    try {
      const { stdout } = await execAsync('git branch --show-current', { cwd: repoPath });
      return stdout.trim();
    } catch (error) {
      return '';
    }
  }
}
