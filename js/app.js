/* ==========================================
   App Module · 主程式、導覽、全域狀態
   ========================================== */

const App = {
  // ── Init ──────────────────────────────────
  init() {
    this.updateDateDisplay();
    this.updateCurrentProjectUI();
    this.updateApiStatusUI();
    this.updateToolStatusBars();
    Projects.render();
    Projects.renderRecent();
    this.loadSavedApiKey();
    this.loadSavedGoogleClientId();

    // Drag and drop for upload zones
    this.initDragDrop();
  },

  // ── Date display ──────────────────────────
  updateDateDisplay() {
    const el = document.getElementById('dateDisplay');
    if (!el) return;
    const now = new Date();
    el.textContent = now.toLocaleDateString('zh-TW', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
    });
  },

  // ── Current project UI ────────────────────
  updateCurrentProjectUI() {
    const project = Storage.getCurrentProject();
    const nameEl = document.getElementById('currentProjectName');
    if (project) {
      nameEl.textContent = project.name;
      nameEl.style.color = 'var(--gold)';
    } else {
      nameEl.textContent = '尚未選擇專案';
      nameEl.style.color = 'var(--ink-faint)';
    }
  },

  // ── API status indicator ──────────────────
  updateApiStatusUI() {
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    if (API.isConfigured()) {
      dot.className = 'status-dot connected';
      text.textContent = 'API 已設定';
    } else {
      dot.className = 'status-dot error';
      text.textContent = 'API 未設定';
    }
  },

  // ── Tool status bars ──────────────────────
  updateToolStatusBars() {
    const project = Storage.getCurrentProject();

    // Typo status
    const typoIndicator = document.getElementById('typoTableIndicator');
    if (typoIndicator) {
      if (project?.typoTable?.raw) {
        typoIndicator.className = 'typo-table-indicator loaded';
        typoIndicator.textContent = `✓ 已載入錯別字表「${project.typoTable.filename || ''}」，共 ${project.typoTable.parsed?.length || 0} 條規則`;
        typoIndicator.closest('.typo-status-bar').style.background = '#f0faf0';
        typoIndicator.closest('.typo-status-bar').style.borderColor = 'var(--sage)';
      } else {
        typoIndicator.className = 'typo-table-indicator';
        typoIndicator.textContent = '⚠ 尚未載入錯別字表，請先至「專案設定」上傳';
        typoIndicator.closest('.typo-status-bar').style.background = '#fff8e6';
        typoIndicator.closest('.typo-status-bar').style.borderColor = '#e8c97a';
      }
    }

    // Article sample status
    const articleIndicator = document.getElementById('articleSampleIndicator');
    if (articleIndicator) {
      if (project?.articleSample?.raw) {
        articleIndicator.className = 'article-sample-indicator loaded';
        articleIndicator.textContent = `✓ 已載入文章格式範例「${project.articleSample.filename || ''}」`;
        articleIndicator.closest('.article-status-bar').style.background = '#f0faf0';
        articleIndicator.closest('.article-status-bar').style.borderColor = 'var(--sage)';
      } else {
        articleIndicator.className = 'article-sample-indicator';
        articleIndicator.textContent = '⚠ 尚未載入文章格式範例，AI 將依通用旅遊書格式修潤';
        articleIndicator.closest('.article-status-bar').style.background = '#fff8e6';
        articleIndicator.closest('.article-status-bar').style.borderColor = '#e8c97a';
      }
    }
  },

  // ── Toast notification ────────────────────
  showToast(message, duration = 2500) {
    const existing = document.getElementById('toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'toast';
    toast.textContent = message;
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '32px',
      right: '32px',
      background: 'var(--ink)',
      color: 'var(--gold)',
      padding: '12px 20px',
      borderRadius: '4px',
      fontSize: '13px',
      fontFamily: "'Noto Sans TC', sans-serif",
      boxShadow: 'var(--shadow-lg)',
      zIndex: '500',
      animation: 'toastIn 0.3s ease',
      border: '1px solid rgba(201,168,76,0.3)',
    });

    // Add animation keyframes if not present
    if (!document.getElementById('toastStyle')) {
      const style = document.createElement('style');
      style.id = 'toastStyle';
      style.textContent = '@keyframes toastIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }';
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // ── Load saved settings ───────────────────
  loadSavedApiKey() {
    const key = Storage.getApiKey();
    if (key) {
      const input = document.getElementById('apiKeyInput');
      if (input) input.value = key;
    }
  },

  loadSavedGoogleClientId() {
    const id = Storage.getGoogleClientId();
    if (id) {
      const input = document.getElementById('googleClientIdInput');
      if (input) input.value = id;
    }
  },

  // ── Drag and drop ─────────────────────────
  initDragDrop() {
    const zones = document.querySelectorAll('.upload-zone');
    zones.forEach(zone => {
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.style.borderColor = 'var(--gold)';
        zone.style.background = '#fdf9f0';
      });
      zone.addEventListener('dragleave', () => {
        zone.style.borderColor = '';
        zone.style.background = '';
      });
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.style.borderColor = '';
        zone.style.background = '';
        const input = zone.querySelector('input[type="file"]');
        if (input && e.dataTransfer.files.length) {
          // Trigger the same handler
          const dt = new DataTransfer();
          dt.items.add(e.dataTransfer.files[0]);
          input.files = dt.files;
          input.dispatchEvent(new Event('change'));
        }
      });
    });
  },
};

// ══════════════════════════════════════════════
// Page navigation
// ══════════════════════════════════════════════
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`page-${pageId}`);
  if (target) target.classList.add('active');

  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === pageId);
  });

  // Update tool status bars when navigating to tool pages
  if (['typo', 'article'].includes(pageId)) {
    App.updateToolStatusBars();
  }

  // Scroll to top
  document.querySelector('.main-content').scrollTop = 0;
}

// ══════════════════════════════════════════════
// Settings actions
// ══════════════════════════════════════════════
function saveApiKey() {
  const key = document.getElementById('apiKeyInput').value.trim();
  if (!key) { alert('請輸入 API 金鑰'); return; }
  Storage.setApiKey(key);
  App.updateApiStatusUI();
  document.getElementById('apiKeyStatus').textContent = '✓ API 金鑰已儲存';
  document.getElementById('apiKeyStatus').style.color = 'var(--sage)';
  App.showToast('API 金鑰已儲存');
}

function saveGoogleClientId() {
  const id = document.getElementById('googleClientIdInput').value.trim();
  Storage.setGoogleClientId(id);
  document.getElementById('googleClientIdStatus').textContent = id ? '✓ Google Client ID 已儲存' : '已清除';
  document.getElementById('googleClientIdStatus').style.color = 'var(--sage)';
  App.showToast('Google Client ID 已儲存');
}

function clearAllData() {
  if (confirm('確定要清除所有本機資料嗎？\n包含所有專案、設定與 API 金鑰，此操作無法復原。')) {
    Storage.clearAll();
    location.reload();
  }
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.style.display = 'none';
  }
});

// ══════════════════════════════════════════════
// Bootstrap
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
