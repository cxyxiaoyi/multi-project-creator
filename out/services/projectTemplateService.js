"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectTemplateService = void 0;
class ProjectTemplateService {
    static setContext(context) {
        this.context = context;
    }
    static getTemplates() {
        if (!this.context) {
            return [];
        }
        const templates = this.context.globalState.get(this.TEMPLATES_KEY, []);
        return templates;
    }
    static addTemplate(name, gitUrl, description) {
        if (!this.context) {
            throw new Error('Extension context not initialized');
        }
        const templates = this.getTemplates();
        const newTemplate = {
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
    static deleteTemplate(id) {
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
    static updateTemplate(id, updates) {
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
    static getTemplateById(id) {
        const templates = this.getTemplates();
        return templates.find(t => t.id === id);
    }
    static getTemplateByName(name) {
        const templates = this.getTemplates();
        return templates.find(t => t.name === name);
    }
    static generateId() {
        return `tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
}
exports.ProjectTemplateService = ProjectTemplateService;
ProjectTemplateService.TEMPLATES_KEY = 'multiProjectCreator.projectTemplates';
//# sourceMappingURL=projectTemplateService.js.map