import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import { Repository, OperationResult } from '../models/types';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

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

  /** 通过 git 命令解析真实 git 目录（兼容 submodule、worktree） */
  private static async resolveGitDir(repoPath: string): Promise<string | null> {
    try {
      const gitDir = await this.runGitCommand(repoPath, ['rev-parse', '--git-dir']);
      if (!gitDir) {
        return null;
      }
      return path.isAbsolute(gitDir) ? gitDir : path.resolve(repoPath, gitDir);
    } catch {
      return null;
    }
  }

  private static readBranchFromHeadFile(gitDir: string): string {
    try {
      const headFile = path.join(gitDir, 'HEAD');
      if (!fs.existsSync(headFile)) {
        return '';
      }

      const head = fs.readFileSync(headFile, 'utf-8').trim();
      if (head.startsWith('ref: refs/heads/')) {
        return head.replace('ref: refs/heads/', '');
      }
    } catch (error) {
      console.error('Error reading HEAD file:', error);
    }

    return '';
  }

  private static normalizeBranchName(name: string): string {
    const trimmed = name.trim();
    if (trimmed.startsWith('refs/heads/')) {
      return trimmed.replace('refs/heads/', '');
    }
    if (trimmed.startsWith('origin/')) {
      return trimmed.slice('origin/'.length);
    }
    return trimmed;
  }

  private static async runGitCommand(repoPath: string, args: string[]): Promise<string> {
    const { stdout } = await execFileAsync('git', args, {
      cwd: repoPath,
      maxBuffer: 1024 * 1024,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
    });
    return (stdout ?? '').toString().replace(/\r/g, '').trim();
  }

  static async getGitRoot(repoPath: string): Promise<string> {
    try {
      return await this.runGitCommand(repoPath, ['rev-parse', '--show-toplevel']);
    } catch {
      return repoPath;
    }
  }

  static async getCurrentBranch(repoPath: string): Promise<string> {
    let gitRoot: string;
    try {
      gitRoot = await this.getGitRoot(repoPath);
    } catch {
      return '';
    }

    const gitDir = await this.resolveGitDir(gitRoot);
    if (gitDir) {
      const fromHead = this.readBranchFromHeadFile(gitDir);
      if (fromHead) {
        return fromHead;
      }
    }

    try {
      const output = await this.runGitCommand(gitRoot, [
        'branch',
        '--list',
        '--format=%(HEAD):%(refname:short)'
      ]);
      for (const line of output.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('true:')) {
          const branch = trimmed.slice(5).trim();
          if (branch) {
            return branch;
          }
        }
      }
    } catch {
      // fall through
    }

    try {
      const branch = await this.runGitCommand(gitRoot, ['symbolic-ref', '-q', '--short', 'HEAD']);
      if (branch) {
        return branch;
      }
    } catch {
      // fall through
    }

    try {
      const branch = await this.runGitCommand(gitRoot, ['branch', '--show-current']);
      if (branch) {
        return branch;
      }
    } catch {
      // fall through
    }

    try {
      const abbreviated = await this.runGitCommand(gitRoot, ['rev-parse', '--abbrev-ref', 'HEAD']);
      if (abbreviated && abbreviated !== 'HEAD') {
        return this.normalizeBranchName(abbreviated);
      }
    } catch {
      // fall through
    }

    try {
      const sha = await this.runGitCommand(gitRoot, ['rev-parse', '--short', 'HEAD']);
      try {
        const describe = await this.runGitCommand(gitRoot, [
          'describe',
          '--tags',
          '--always',
          '--exact-match'
        ]);
        if (describe) {
          return `detached@${describe}`;
        }
      } catch {
        // fall through
      }
      return sha ? `detached@${sha}` : '(游离 HEAD)';
    } catch {
      return '';
    }
  }

  static async getRemoteUrl(repoPath: string): Promise<string> {
    try {
      const { stdout } = await execAsync('git remote get-url origin', { cwd: repoPath });
      return stdout.trim();
    } catch (error) {
      return '';
    }
  }

  static isGitRepository(dirPath: string): boolean {
    try {
      return fs.existsSync(path.join(dirPath, '.git'));
    } catch (error) {
      return false;
    }
  }
}
