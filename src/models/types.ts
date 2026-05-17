export interface ProjectConfig {
  id: string;
  name: string;
  workspace: string;
  branch: string;
  ide: IDEType;
  gitUrl: string;
  repositories: Repository[];
  createdAt: string;
  status: 'creating' | 'ready' | 'error';
  error?: string;
}

export interface Repository {
  id: string;
  name: string;
  gitUrl: string;
  localPath: string;
  branch: string;
  status: 'pending' | 'cloning' | 'cloned' | 'switching' | 'ready' | 'error';
  error?: string;
}

export type IDEType = 'VSCode' | 'Cursor' | 'Qoder' | 'Kiro' | 'IDEA';

export type IDECategory = 'vscode-like' | 'idea-like';

export interface IDEConfig {
  name: string;
  macOSPath: string;
  windowsPath: string;
  appName: string;
  category: IDECategory;
}

export interface FormData {
  workspace: string;
  projectName: string;
  branch: string;
  gitUrl: string;
  ide: IDEType;
  repositories: string[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface OperationResult {
  success: boolean;
  message: string;
  error?: string;
}
