"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Validator = void 0;
class Validator {
    static validateProjectName(name) {
        if (!name || name.trim() === '') {
            return { field: 'projectName', message: 'Project name is required' };
        }
        const pattern = /^[a-zA-Z0-9_]+$/;
        if (!pattern.test(name)) {
            return {
                field: 'projectName',
                message: 'Project name must contain only letters, numbers, and underscores'
            };
        }
        if (name.length > 100) {
            return { field: 'projectName', message: 'Project name is too long (max 100 characters)' };
        }
        return null;
    }
    static validateGitUrl(url) {
        if (!url || url.trim() === '') {
            return { field: 'gitUrl', message: 'Git URL is required' };
        }
        const gitPattern = /^(https?:\/\/|git@)/;
        if (!gitPattern.test(url)) {
            return {
                field: 'gitUrl',
                message: 'Invalid Git URL format. Must start with https://, http://, or git@'
            };
        }
        if (url.endsWith('.git')) {
            return null;
        }
        return null;
    }
    static validateWorkspace(path) {
        if (!path || path.trim() === '') {
            return { field: 'workspace', message: 'Workspace directory is required' };
        }
        if (!path.startsWith('/') && !path.match(/^[A-Za-z]:\\/)) {
            return {
                field: 'workspace',
                message: 'Workspace must be an absolute path'
            };
        }
        return null;
    }
    static validateBranch(branch) {
        if (!branch || branch.trim() === '') {
            return { field: 'branch', message: 'Branch name is required' };
        }
        const branchPattern = /^[a-zA-Z0-9_\-\.\/]+$/;
        if (!branchPattern.test(branch)) {
            return {
                field: 'branch',
                message: 'Invalid branch name. Only letters, numbers, hyphens, underscores, dots, and slashes allowed'
            };
        }
        return null;
    }
    static validateForm(formData) {
        const errors = [];
        const projectNameError = this.validateProjectName(formData.projectName);
        if (projectNameError)
            errors.push(projectNameError);
        const workspaceError = this.validateWorkspace(formData.workspace);
        if (workspaceError)
            errors.push(workspaceError);
        const branchError = this.validateBranch(formData.branch);
        if (branchError)
            errors.push(branchError);
        if (formData.repositories.length === 0) {
            const gitUrlError = this.validateGitUrl(formData.gitUrl);
            if (gitUrlError)
                errors.push(gitUrlError);
        }
        return errors;
    }
}
exports.Validator = Validator;
//# sourceMappingURL=validator.js.map