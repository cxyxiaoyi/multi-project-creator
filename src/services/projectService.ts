import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ProjectConfig, Repository, FormData, OperationResult } from '../models/types';
import { GitService } from './gitService';
import { IDEService } from './ideService';

function generateId(): string {
  return 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

export class ProjectService {
  private static readonly PROJECTS_KEY = 'multiProjectCreator.projects';
  private static globalState: vscode.Memento | null = null;
  private static onProjectChangedCallback: (() => void) | null = null;

  static setGlobalState(state: vscode.Memento): void {
    this.globalState = state;
  }

  static setOnProjectChangedCallback(callback: () => void): void {
    this.onProjectChangedCallback = callback;
  }

  private static notifyProjectChanged(): void {
    if (this.onProjectChangedCallback) {
      this.onProjectChangedCallback();
    }
  }

  static getGlobalState(): vscode.Memento {
    if (!this.globalState) {
      throw new Error('Global state not initialized. Call setGlobalState first.');
    }
    return this.globalState;
  }

  static async saveProject(project: ProjectConfig): Promise<void> {
    const projects = await this.getAllProjects();
    const existingIndex = projects.findIndex(p => p.id === project.id);
    
    if (existingIndex >= 0) {
      projects[existingIndex] = project;
    } else {
      projects.push(project);
    }
    
    await this.getGlobalState().update(this.PROJECTS_KEY, projects);
    this.notifyProjectChanged();
  }

  static async getAllProjects(): Promise<ProjectConfig[]> {
    const projects = this.getGlobalState().get<ProjectConfig[]>(this.PROJECTS_KEY, []);
    return projects || [];
  }

  static async getProject(id: string): Promise<ProjectConfig | undefined> {
    const projects = await this.getAllProjects();
    return projects.find(p => p.id === id);
  }

  static async deleteProject(id: string): Promise<void> {
    const projects = await this.getAllProjects();
    const filteredProjects = projects.filter(p => p.id !== id);
    await this.getGlobalState().update(this.PROJECTS_KEY, filteredProjects);
    this.notifyProjectChanged();
  }

  static async createProject(
    formData: FormData,
    onProgress?: (message: string, progress?: number) => void
  ): Promise<ProjectResult> {
    const projectId = generateId();
    const projectPath = path.join(formData.workspace, formData.projectName);
    
    const project: ProjectConfig = {
      id: projectId,
      name: formData.projectName,
      workspace: formData.workspace,
      branch: formData.branch,
      ide: formData.ide,
      gitUrl: formData.gitUrl,
      repositories: [],
      createdAt: new Date().toISOString(),
      status: 'creating'
    };

    try {
      await this.saveProject(project);
      onProgress?.(`Creating project: ${formData.projectName}`, 5);

      const dirResult = await GitService.ensureDirectoryExists(projectPath);
      if (!dirResult.success) {
        project.status = 'error';
        project.error = dirResult.error;
        await this.saveProject(project);
        return { success: false, project, error: dirResult.error || 'Failed to create directory' };
      }
      
      onProgress?.(`Created project directory: ${projectPath}`, 10);

      const repositories: Repository[] = [];
      const allGitUrls = [formData.gitUrl, ...formData.repositories.filter(r => r.trim() !== '')];
      const totalRepos = allGitUrls.length;
      
      for (let i = 0; i < allGitUrls.length; i++) {
        const gitUrl = allGitUrls[i].trim();
        if (!gitUrl) continue;
        
        const repoId = generateId();
        const repoName = GitService.extractRepoName(gitUrl);
        const repoPath = projectPath;
        
        const repo: Repository = {
          id: repoId,
          name: repoName,
          gitUrl: gitUrl,
          localPath: repoPath,
          branch: formData.branch,
          status: 'cloning'
        };
        
        repositories.push(repo);
        project.repositories = repositories;
        await this.saveProject(project);
        
        const baseProgress = 10 + (i / totalRepos) * 60;
        
        const cloneResult = await GitService.cloneRepository(
          gitUrl,
          repoPath,
          formData.branch,
          (message) => {
            const progress = baseProgress + (message.includes('Successfully') ? 5 : 0);
            onProgress?.(message, Math.min(progress, 70 + (i / totalRepos) * 10));
          }
        );
        
        if (cloneResult.success) {
          repo.status = 'ready';
          onProgress?.(`Repository ${repoName} ready`, 70 + ((i + 1) / totalRepos) * 10);
        } else {
          repo.status = 'error';
          repo.error = cloneResult.error;
          project.status = 'error';
          project.error = `Failed to clone ${repoName}: ${cloneResult.error}`;
          await this.saveProject(project);
          return { success: false, project, error: project.error };
        }
        
        await this.saveProject(project);
      }
      
      onProgress?.('Checking IDE installation...', 80);
      const isIDEInstalled = await IDEService.checkAndNotifyIDE(formData.ide);
      
      if (!isIDEInstalled) {
        project.status = 'ready';
        project.error = `Project created but ${formData.ide} is not installed`;
        await this.saveProject(project);
        return { 
          success: true, 
          project, 
          warning: `${formData.ide} is not installed. Project created but cannot be opened automatically.` 
        };
      }
      
      onProgress?.(`Launching ${formData.ide}...`, 90);
      const launchResult = await IDEService.launchIDE(formData.ide, projectPath);
      
      if (!launchResult) {
        project.status = 'ready';
        project.error = 'Project created but failed to launch IDE';
        await this.saveProject(project);
        return { success: false, project, error: 'Failed to launch IDE' };
      }
      
      project.status = 'ready';
      await this.saveProject(project);
      
      onProgress?.('Project created successfully!', 100);
      
      return { 
        success: true, 
        project,
        message: `Project ${formData.projectName} created and opened in ${formData.ide}`
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      project.status = 'error';
      project.error = errorMessage;
      await this.saveProject(project);
      
      return { success: false, project, error: errorMessage };
    }
  }

  static async openProject(projectId: string): Promise<OperationResult> {
    const project = await this.getProject(projectId);
    
    if (!project) {
      return { success: false, message: 'Project not found' };
    }
    
    const projectPath = path.join(project.workspace, project.name);
    
    if (!fs.existsSync(projectPath)) {
      return { success: false, message: 'Project directory does not exist' };
    }
    
    const isIDEInstalled = await IDEService.checkAndNotifyIDE(project.ide);
    
    if (!isIDEInstalled) {
      return { 
        success: false, 
        message: `${project.ide} is not installed`,
        error: 'IDE not installed'
      };
    }
    
    const result = await IDEService.launchIDE(project.ide, projectPath);
    
    return { 
      success: result, 
      message: result ? `Opened ${project.name} in ${project.ide}` : 'Failed to open project'
    };
  }

  static async refreshProject(projectId: string): Promise<OperationResult> {
    const project = await this.getProject(projectId);
    
    if (!project) {
      return { success: false, message: 'Project not found' };
    }
    
    for (const repo of project.repositories) {
      const result = await GitService.pullLatest(repo.localPath, repo.branch);
      if (!result.success) {
        return { success: false, message: `Failed to refresh ${repo.name}`, error: result.error };
      }
    }
    
    return { success: true, message: `Project ${project.name} refreshed successfully` };
  }

  static async deleteProjectFiles(projectId: string, deleteFiles: boolean = false): Promise<OperationResult> {
    const project = await this.getProject(projectId);
    
    if (!project) {
      return { success: false, message: 'Project not found' };
    }
    
    const projectPath = path.join(project.workspace, project.name);
    
    if (deleteFiles && fs.existsSync(projectPath)) {
      try {
        fs.rmSync(projectPath, { recursive: true, force: true });
        await this.deleteProject(projectId);
        return { success: true, message: `Project and files deleted: ${project.name}` };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, message: 'Failed to delete files', error: errorMessage };
      }
    } else {
      await this.deleteProject(projectId);
      return { success: true, message: `Project removed from list: ${project.name}` };
    }
  }
}

export interface ProjectResult {
  success: boolean;
  project: ProjectConfig;
  message?: string;
  warning?: string;
  error?: string;
}
