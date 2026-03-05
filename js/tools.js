/* ==========================================
   Projects Module · 專案管理
   ========================================== */

const Projects = {

  // ── Render projects grid ──────────────────
  render() {
    const projects = Storage.getAllProjects();
    const grid = document.getElementById('projectsGrid');
    const empty = document.getElementById('projectsEmpty');
    const currentId = Storage.getCurrentProjectId();

    grid.innerHTML = '';

    if (projects.length === 0) {
      empty.style.display = 'block';
      grid.style.display = 'none';
      return;
    }

    empty.style.display = 'none';
    grid.style.display = 'grid';

    projects.forEach(p => {
      const isActive = p.id === currentId;
      const card = document.createElement('div');
      card.className = 'project-card' + (isActive ? ' active-project' : '');
      card.innerHTML = `
        <div class="project-card-header">
          <div class="project-card-name">${escHtml(p.name)}</div>
          ${isActive ? '<span class="project-card-badge">使用中</span>' : ''}
        </div>
        ${p.series ? `<div class="project-card-meta">📚 ${escHtml(p.series)}</div>` : ''}
        ${p.editor ? `<div class="project-card-meta">✏️ ${escHtml(p.editor)}</div>` : ''}
        <div class="project-card-date">建立於 ${formatDate(p.createdAt)} · 更新 ${formatDate(p.updatedAt)}</div>
        <div class="project-card-status">
          <span class="status-chip ${p.typoTable ? 'set' : ''}">
            ${p.typoTable ? '✓' : '○'} 錯別字表
          </span>
          <span class="status-chip ${p.articleSample ? 'set' : ''}">
            ${p.articleSample ? '✓' : '○'} 文章範例
          </span>
          <span class="status-chip ${p.newbookSample ? 'set' : ''}">
            ${p.newbookSample ? '✓' : '○'} 新書資料範例
          </span>
        </div>
        <div class="project-card-actions">
          ${!isActive ? `<button class="btn-primary" onclick="Projects.selectProject('${p.id}')">選用此專案</button>` : ''}
          <button class="btn-outline" onclick="Projects.openSettings('${p.id}')">⚙ 設定</button>
          <button class="btn-outline" onclick="Projects.confirmDelete('${p.id}', '${escHtml(p.name)}')">刪除</button>
        </div>
      `;
      grid.appendChild(card);
    });
  },

  // ── Render recent projects on dashboard ───
  renderRecent() {
    const projects = Storage.getAllProjects().slice(0, 5);
    const container = document.getElementById('recentProjectsList');
    if (!projects.length) {
      container.innerHTML = '<p style="color:var(--ink-faint);font-size:13px">尚無專案，點擊「進入專案管理」建立第一本書</p>';
      return;
    }
    const currentId = Storage.getCurrentProjectId();
    container.innerHTML = projects.map(p => `
      <div class="recent-project-item" onclick="Projects.selectProject('${p.id}')">
        <div>
          <div class="recent-project-item-name">${escHtml(p.name)} ${p.id === currentId ? '<span class="project-card-badge" style="font-size:9px">使用中</span>' : ''}</div>
          <div class="recent-project-item-meta">${p.editor ? p.editor + ' · ' : ''}更新 ${formatDate(p.updatedAt)}</div>
        </div>
        <span style="color:var(--border-strong);font-size:18px">→</span>
      </div>
    `).join('');
  },

  // ── Select active project ─────────────────
  selectProject(id) {
    Storage.setCurrentProjectId(id);
    App.updateCurrentProjectUI();
    this.render();
    this.renderRecent();
    showPage('dashboard');
    App.showToast('專案已切換');
  },

  // ── Open project settings ─────────────────
  openSettings(id) {
    Storage.setCurrentProjectId(id);
    App.updateCurrentProjectUI();
    const project = Storage.getProject(id);
    document.getElementById('projectSettingsTitle').textContent = `${project.name}｜專案設定`;
    // Update upload statuses
    updateUploadStatus('typoTableStatus', project.typoTable, '錯別字表已載入');
    updateUploadStatus('articleSampleStatus', project.articleSample, '文章格式範例已載入');
    updateUploadStatus('newbookSampleStatus', project.newbookSample, '新書資料範例已載入');
    showPage('project-settings');
  },

  // ── Delete project ────────────────────────
  confirmDelete(id, name) {
    if (confirm(`確定要刪除專案「${name}」嗎？\n此操作無法復原，所有設定資料將一併刪除。`)) {
      Storage.deleteProject(id);
      App.updateCurrentProjectUI();
      this.render();
      this.renderRecent();
      App.showToast('專案已刪除');
    }
  },
};

// ── Create project (called from modal) ───────
function createProject() {
  const name = document.getElementById('newProjectName').value.trim();
  if (!name) {
    alert('請輸入書名');
    return;
  }
  const project = Storage.createProject({
    name,
    series: document.getElementById('newProjectSeries').value.trim(),
    editor: document.getElementById('newProjectEditor').value.trim(),
    note: document.getElementById('newProjectNote').value.trim(),
  });
  Storage.setCurrentProjectId(project.id);
  closeModal('newProjectModal');
  App.updateCurrentProjectUI();
  Projects.render();
  Projects.renderRecent();

  // Clear form
  ['newProjectName','newProjectSeries','newProjectEditor','newProjectNote'].forEach(id => {
    document.getElementById(id).value = '';
  });

  // Immediately go to settings
  Projects.openSettings(project.id);
  App.showToast('專案建立成功！請上傳相關資料庫');
}

function openNewProjectModal() {
  document.getElementById('newProjectModal').style.display = 'flex';
  setTimeout(() => document.getElementById('newProjectName').focus(), 100);
}

// ── File upload handlers for project settings ─
async function handleTypoTableUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const raw = await readFileAsText(file);
  const parsed = parseTypoTable(raw);
  const id = Storage.getCurrentProjectId();
  if (!id) { alert('請先選擇專案'); return; }
  Storage.updateProject(id, { typoTable: { raw, parsed, filename: file.name } });
  updateUploadStatus('typoTableStatus', true, `✓ 已載入「${file.name}」，共 ${parsed.length} 條修訂規則`);
  App.updateToolStatusBars();
  App.showToast('錯別字表已更新');
}

async function handleArticleSampleUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const raw = await readFileAsText(file);
  const id = Storage.getCurrentProjectId();
  if (!id) { alert('請先選擇專案'); return; }
  Storage.updateProject(id, { articleSample: { raw, filename: file.name } });
  updateUploadStatus('articleSampleStatus', true, `✓ 已載入「${file.name}」`);
  App.updateToolStatusBars();
  App.showToast('文章格式範例已更新');
}

async function handleNewbookSampleUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const raw = await readFileAsText(file);
  const id = Storage.getCurrentProjectId();
  if (!id) { alert('請先選擇專案'); return; }
  Storage.updateProject(id, { newbookSample: { raw, filename: file.name } });
  updateUploadStatus('newbookSampleStatus', true, `✓ 已載入「${file.name}」`);
  App.showToast('新書資料範例已更新');
}

function exportProject() {
  const id = Storage.getCurrentProjectId();
  if (!id) { alert('請先選擇專案'); return; }
  Storage.exportProject(id);
}

function importProject(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const project = Storage.importProject(e.target.result);
      Storage.setCurrentProjectId(project.id);
      App.updateCurrentProjectUI();
      Projects.render();
      App.showToast(`已匯入專案：${project.name}`);
      showPage('projects');
    } catch (err) {
      alert('匯入失敗：' + err.message);
    }
  };
  reader.readAsText(file);
}

// ── Helpers ──────────────────────────────────
function parseTypoTable(raw) {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const rules = [];
  for (const line of lines) {
    const sep = line.includes('→') ? '→' : line.includes('：') ? '：' : line.includes(':') ? ':' : null;
    if (!sep) continue;
    const [wrong, correct] = line.split(sep).map(s => s.trim());
    if (wrong && correct) rules.push({ wrong, correct });
  }
  return rules;
}

async function readFileAsText(file) {
  if (file.name.endsWith('.docx')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const result = await mammoth.extractRawText({ arrayBuffer: e.target.result });
          resolve(result.value);
        } catch (err) { reject(err); }
      };
      reader.readAsArrayBuffer(file);
    });
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file, 'UTF-8');
  });
}

function updateUploadStatus(elementId, hasData, message) {
  const el = document.getElementById(elementId);
  if (!el) return;
  if (hasData) {
    el.style.color = 'var(--sage)';
    el.textContent = message || '已載入';
  } else {
    el.style.color = 'var(--ink-faint)';
    el.textContent = '';
  }
}

function formatDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
