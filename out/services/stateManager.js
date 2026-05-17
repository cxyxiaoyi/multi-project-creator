"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stateManager = void 0;
class StateManager {
    constructor() {
        this.projects = new Map();
        this.projectsKey = 'multiProjectCreator.projects';
    }
    async update(key, value) {
        if (key === this.projectsKey) {
            const projectList = value;
            this.projects.clear();
            projectList.forEach(p => this.projects.set(p.id, p));
        }
    }
    get(key, defaultValue) {
        if (key === this.projectsKey) {
            const projectArray = Array.from(this.projects.values());
            return projectArray || defaultValue;
        }
        return defaultValue;
    }
}
exports.stateManager = new StateManager();
//# sourceMappingURL=stateManager.js.map