import * as vscode from 'vscode';

export interface ProjectTemplate {
  id: string;
  name: string;
  gitUrl: string;
  description?: string;
  createdAt: number;
}

export class ProjectTemplateService {
  private static readonly TEMPLATES_KEY = 'multiProjectCreator.projectTemplates';
  private static context: vscode.ExtensionContext | undefined;

  static setContext(context: vscode.ExtensionContext): void {
    this.context = context;
  }

  static getTemplates(): ProjectTemplate[] {
    if (!this.context) {
      return [];
    }
    const templates = this.context.globalState.get<ProjectTemplate[]>(this.TEMPLATES_KEY, []);
    return templates;
  }

  static addTemplate(name: string, gitUrl: string, description?: string): ProjectTemplate {
    if (!this.context) {
      throw new Error('Extension context not initialized');
    }

    const templates = this.getTemplates();
    const newTemplate: ProjectTemplate = {
      id: this.generateId(),
      name,
      gitUrl,
      description,
      createdAt: Date.now()
    };

    templates.push(newTemplate);
    this.context.globalState.update(this.TEMPLATES_KEY, templates);

    return newTemplate;
  }

  static deleteTemplate(id: string): boolean {
    if (!this.context) {
      return false;
    }

    const templates = this.getTemplates();
    const index = templates.findIndex(t => t.id === id);

    if (index === -1) {
      return false;
    }

    templates.splice(index, 1);
    this.context.globalState.update(this.TEMPLATES_KEY, templates);

    return true;
  }

  static updateTemplate(id: string, updates: Partial<ProjectTemplate>): boolean {
    if (!this.context) {
      return false;
    }

    const templates = this.getTemplates();
    const template = templates.find(t => t.id === id);

    if (!template) {
      return false;
    }

    Object.assign(template, updates);
    this.context.globalState.update(this.TEMPLATES_KEY, templates);

    return true;
  }

  static getTemplateById(id: string): ProjectTemplate | undefined {
    const templates = this.getTemplates();
    return templates.find(t => t.id === id);
  }

  static getTemplateByName(name: string): ProjectTemplate | undefined {
    const templates = this.getTemplates();
    return templates.find(t => t.name === name);
  }

  private static generateId(): string {
    return `tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}