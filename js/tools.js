/* ==========================================
   Tools Module · 三大編輯功能
   ========================================== */

// ══════════════════════════════════════════════
// Shared file upload for tools
// ══════════════════════════════════════════════
let toolFileContents = {
  newbook: '',
  typo: '',
  article: '',
};

async function handleNewbookFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const text = await readFileAsText(file);
    toolFileContents.newbook = text;
    document.getElementById('newbookUploadStatus').innerHTML =
      `<span style="color:var(--sage)">✓ 已讀取「${file.name}」（${text.length.toLocaleString()} 字）</span>`;
  } catch (err) {
    document.getElementById('newbookUploadStatus').innerHTML =
      `<span style="color:var(--terracotta)">✗ 讀取失敗：${err.message}</span>`;
  }
}

async function handleTypoFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const text = await readFileAsText(file);
    toolFileContents.typo = text;
    document.getElementById('typoUploadStatus').innerHTML =
      `<span style="color:var(--sage)">✓ 已讀取「${file.name}」（${text.length.toLocaleString()} 字）</span>`;
  } catch (err) {
    document.getElementById('typoUploadStatus').innerHTML =
      `<span style="color:var(--terracotta)">✗ 讀取失敗：${err.message}</span>`;
  }
}

async function handleArticleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const text = await readFileAsText(file);
    toolFileContents.article = text;
    document.getElementById('articleUploadStatus').innerHTML =
      `<span style="color:var(--sage)">✓ 已讀取「${file.name}」（${text.length.toLocaleString()} 字）</span>`;
  } catch (err) {
    document.getElementById('articleUploadStatus').innerHTML =
      `<span style="color:var(--terracotta)">✗ 讀取失敗：${err.message}</span>`;
  }
}

// ══════════════════════════════════════════════
// Tab switching
// ══════════════════════════════════════════════
function switchTab(tool, tab) {
  const tabBtns = document.querySelectorAll(`#page-${tool} .tab-btn`);
  const tabContents = document.querySelectorAll(`#page-${tool} .tab-content`);
  tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('onclick').includes(`'${tab}'`));
  });
  tabContents.forEach(content => {
    content.classList.toggle('active', content.id === `${tool}-${tab}`);
  });
}

// ══════════════════════════════════════════════
// Get content for current tool
// ══════════════════════════════════════════════
function getToolContent(tool) {
  const uploadTab = document.getElementById(`${tool}-upload`);
  const isUploadActive = uploadTab && uploadTab.classList.contains('active');
  if (isUploadActive) {
    return toolFileContents[tool];
  }
  const pasteArea = document.getElementById(`${tool}PasteText`);
  return pasteArea ? pasteArea.value.trim() : '';
}

// ══════════════════════════════════════════════
// FEATURE 1：新書資料產生器
// ══════════════════════════════════════════════
async function runNewbookGeneration() {
  if (!API.isConfigured()) {
    alert('請先至「API 設定」頁面輸入 Claude API 金鑰');
    showPage('settings');
    return;
  }

  const content = getToolContent('newbook');
  if (!content) {
    alert('請上傳書稿或貼上文字內容');
    return;
  }

  const options = {
    genSellingPoints: document.getElementById('genSellingPoints').checked,
    genTargetReaders: document.getElementById('genTargetReaders').checked,
    genFeatures: document.getElementById('genFeatures').checked,
    genFollowSample: document.getElementById('genFollowSample').checked,
  };

  if (!options.genSellingPoints && !options.genTargetReaders && !options.genFeatures) {
    alert('請至少勾選一個產生項目');
    return;
  }

  const project = Storage.getCurrentProject();
  const sampleTemplate = (options.genFollowSample && project?.newbookSample?.raw) || null;

  const { systemPrompt, userMsg } = await API.generateNewbookData(content, options, sampleTemplate);

  const outputEl = document.getElementById('newbookOutput');
  outputEl.innerHTML = '<span class="streaming-cursor"></span>';
  document.getElementById('newbookOutputActions').style.display = 'none';
  document.getElementById('newbookRunBtn').disabled = true;

  showLoading('AI 分析書稿中，正在產生新書資料…');

  let result = '';
  try {
    await API.stream(systemPrompt, userMsg, (chunk) => {
      result += chunk;
      outputEl.textContent = result;
    }, 4000);

    outputEl.textContent = result;
    document.getElementById('newbookOutputActions').style.display = 'flex';
    App.showToast('新書資料產生完成！');
  } catch (err) {
    outputEl.innerHTML = `<span style="color:var(--terracotta)">✗ 錯誤：${err.message}</span>`;
  } finally {
    hideLoading();
    document.getElementById('newbookRunBtn').disabled = false;
  }
}

// ══════════════════════════════════════════════
// FEATURE 2：錯別字修訂
// ══════════════════════════════════════════════
async function runTypoCheck() {
  if (!API.isConfigured()) {
    alert('請先至「API 設定」頁面輸入 Claude API 金鑰');
    showPage('settings');
    return;
  }

  const content = getToolContent('typo');
  if (!content) {
    alert('請上傳文章或貼上文字內容');
    return;
  }

  const project = Storage.getCurrentProject();
  if (!project?.typoTable?.raw) {
    if (!confirm('目前專案尚未載入錯別字表，將由 AI 依語境判斷常見錯別字。是否繼續？')) return;
  }

  const typoTableText = project?.typoTable?.raw || '（未提供錯別字修訂表，請依繁體中文常見錯別字規範判斷）';
  const mode = document.querySelector('input[name="typoMode"]:checked')?.value || 'highlight';

  const { systemPrompt, userMsg } = API.buildTypoPrompts(content, typoTableText, mode);

  const outputEl = document.getElementById('typoOutput');
  outputEl.innerHTML = '<span class="streaming-cursor"></span>';
  document.getElementById('typoOutputActions').style.display = 'none';
  document.getElementById('typoRunBtn').disabled = true;

  showLoading('AI 掃描中，正在比對錯別字修訂表…');

  let result = '';
  try {
    await API.stream(systemPrompt, userMsg, (chunk) => {
      result += chunk;
      outputEl.textContent = result;
    }, 4000);

    outputEl.textContent = result;
    document.getElementById('typoOutputActions').style.display = 'flex';
    App.showToast('錯別字修訂完成！');
  } catch (err) {
    outputEl.innerHTML = `<span style="color:var(--terracotta)">✗ 錯誤：${err.message}</span>`;
  } finally {
    hideLoading();
    document.getElementById('typoRunBtn').disabled = false;
  }
}

// ══════════════════════════════════════════════
// FEATURE 3：文章編輯潤稿
// ══════════════════════════════════════════════
async function runArticleEdit() {
  if (!API.isConfigured()) {
    alert('請先至「API 設定」頁面輸入 Claude API 金鑰');
    showPage('settings');
    return;
  }

  const content = getToolContent('article');
  if (!content) {
    alert('請上傳文章或貼上文字內容');
    return;
  }

  const project = Storage.getCurrentProject();
  const articleSample = project?.articleSample?.raw || null;

  const levels = {
    editH1: document.getElementById('editH1').checked,
    editH2: document.getElementById('editH2').checked,
    editH3: document.getElementById('editH3').checked,
    editData: document.getElementById('editData').checked,
    editCaption: document.getElementById('editCaption').checked,
  };

  if (!Object.values(levels).some(Boolean)) {
    alert('請至少勾選一個文章層級');
    return;
  }

  const extraInstructions = document.getElementById('articleExtraInstructions').value.trim();
  const { systemPrompt, userMsg } = API.buildArticlePrompts(content, articleSample, levels, extraInstructions);

  const outputEl = document.getElementById('articleOutput');
  outputEl.innerHTML = '<span class="streaming-cursor"></span>';
  document.getElementById('articleOutputActions').style.display = 'none';
  document.getElementById('articleRunBtn').disabled = true;

  showLoading('AI 潤稿中，正在依照格式範例修潤文章…');

  let result = '';
  try {
    await API.stream(systemPrompt, userMsg, (chunk) => {
      result += chunk;
      outputEl.textContent = result;
    }, 4000);

    outputEl.textContent = result;
    document.getElementById('articleOutputActions').style.display = 'flex';
    App.showToast('文章潤稿完成！');
  } catch (err) {
    outputEl.innerHTML = `<span style="color:var(--terracotta)">✗ 錯誤：${err.message}</span>`;
  } finally {
    hideLoading();
    document.getElementById('articleRunBtn').disabled = false;
  }
}

// ══════════════════════════════════════════════
// Output utilities
// ══════════════════════════════════════════════
function copyOutput(elementId) {
  const text = document.getElementById(elementId).textContent;
  navigator.clipboard.writeText(text).then(() => App.showToast('已複製到剪貼簿'));
}

function downloadOutput(elementId, filename) {
  const text = document.getElementById(elementId).textContent;
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════
// Loading overlay
// ══════════════════════════════════════════════
function showLoading(text) {
  document.getElementById('loadingText').textContent = text || 'AI 處理中，請稍候…';
  document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loadingOverlay').style.display = 'none';
}
