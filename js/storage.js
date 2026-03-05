/* ==========================================
   Storage Module · 本機資料儲存管理
   ========================================== */

const Storage = {
  // Keys
  KEYS: {
    PROJECTS: 'tbs_projects',
    CURRENT_PROJECT: 'tbs_current_project',
    API_KEY: 'tbs_api_key',
    GOOGLE_CLIENT_ID: 'tbs_google_client_id',
  },

  // ── Projects ──────────────────────────────
  getAllProjects() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.PROJECTS) || '[]');
    } catch { return []; }
  },

  saveAllProjects(projects) {
    localStorage.setItem(this.KEYS.PROJECTS, JSON.stringify(projects));
  },

  getProject(id) {
    return this.getAllProjects().find(p => p.id === id) || null;
  },

  createProject(data) {
    const projects = this.getAllProjects();
    const project = {
      id: 'proj_' + Date.now(),
      name: data.name,
      series: data.series || '',
      editor: data.editor || '',
      note: data.note || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Project database
      typoTable: null,       // { raw: string, parsed: [{wrong, correct}] }
      articleSample: null,   // { raw: string }
      newbookSample: null,   // { raw: string }
    };
    projects.unshift(project);
    this.saveAllProjects(projects);
    return project;
  },

  updateProject(id, updates) {
    const projects = this.getAllProjects();
    const idx = projects.findIndex(p => p.id === id);
    if (idx === -1) return null;
    projects[idx] = { ...projects[idx], ...updates, updatedAt: new Date().toISOString() };
    this.saveAllProjects(projects);
    return projects[idx];
  },

  deleteProject(id) {
    const projects = this.getAllProjects().filter(p => p.id !== id);
    this.saveAllProjects(projects);
    if (this.getCurrentProjectId() === id) {
      this.setCurrentProjectId(null);
    }
  },

  // ── Current Project ───────────────────────
  getCurrentProjectId() {
    return localStorage.getItem(this.KEYS.CURRENT_PROJECT) || null;
  },

  setCurrentProjectId(id) {
    if (id) localStorage.setItem(this.KEYS.CURRENT_PROJECT, id);
    else localStorage.removeItem(this.KEYS.CURRENT_PROJECT);
  },

  getCurrentProject() {
    const id = this.getCurrentProjectId();
    return id ? this.getProject(id) : null;
  },

  // ── API Keys ──────────────────────────────
  getApiKey() {
    return localStorage.getItem(this.KEYS.API_KEY) || '';
  },

  setApiKey(key) {
    localStorage.setItem(this.KEYS.API_KEY, key);
  },

  getGoogleClientId() {
    return localStorage.getItem(this.KEYS.GOOGLE_CLIENT_ID) || '';
  },

  setGoogleClientId(id) {
    localStorage.setItem(this.KEYS.GOOGLE_CLIENT_ID, id);
  },

  // ── Export / Import ───────────────────────
  exportProject(id) {
    const project = this.getProject(id);
    if (!project) return null;
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}_備份_${new Date().toLocaleDateString('zh-TW').replace(/\//g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importProject(jsonData) {
    const data = JSON.parse(jsonData);
    // Re-assign new ID to avoid collision
    const project = { ...data, id: 'proj_' + Date.now(), updatedAt: new Date().toISOString() };
    const projects = this.getAllProjects();
    projects.unshift(project);
    this.saveAllProjects(projects);
    return project;
  },

  // ── Clear All ─────────────────────────────
  clearAll() {
    Object.values(this.KEYS).forEach(k => localStorage.removeItem(k));
  }
};
