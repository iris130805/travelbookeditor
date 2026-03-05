/* ==========================================
   API Module · Claude API 串接
   ========================================== */

const API = {
  MODEL: 'claude-sonnet-4-20250514',
  ENDPOINT: 'https://api.anthropic.com/v1/messages',

  getKey() {
    return Storage.getApiKey();
  },

  isConfigured() {
    return !!this.getKey();
  },

  // ── Core call (non-streaming) ─────────────
  async call(systemPrompt, userMessage, maxTokens = 4000) {
    const key = this.getKey();
    if (!key) throw new Error('API 金鑰未設定，請至「API 設定」頁面輸入金鑰');

    const response = await fetch(this.ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: this.MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg = err?.error?.message || `HTTP ${response.status}`;
      throw new Error(`API 錯誤：${msg}`);
    }

    const data = await response.json();
    return data.content.map(b => b.text || '').join('');
  },

  // ── Streaming call ────────────────────────
  async stream(systemPrompt, userMessage, onChunk, maxTokens = 4000) {
    const key = this.getKey();
    if (!key) throw new Error('API 金鑰未設定，請至「API 設定」頁面輸入金鑰');

    const response = await fetch(this.ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: this.MODEL,
        max_tokens: maxTokens,
        stream: true,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`API 錯誤：${err?.error?.message || response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') continue;
        try {
          const evt = JSON.parse(raw);
          if (evt.type === 'content_block_delta' && evt.delta?.text) {
            onChunk(evt.delta.text);
          }
        } catch { /* ignore parse errors */ }
      }
    }
  },

  // ══════════════════════════════════════════
  // Feature: 新書資料產生器
  // ══════════════════════════════════════════
  async generateNewbookData(bookContent, options, sampleTemplate) {
    const { genSellingPoints, genTargetReaders, genFeatures, genFollowSample } = options;

    const tasks = [];
    if (genSellingPoints) tasks.push('書籍賣點（3～5 點，每點簡潔有力，突出本書獨特之處）');
    if (genTargetReaders) tasks.push('目標讀者分析（描述核心讀者輪廓、購書動機）');
    if (genFeatures) tasks.push('特色列點（5～8 點，具體說明本書的編輯特色與實用亮點）');

    let systemPrompt = `你是一位資深旅遊書編輯，專門撰寫新書資料（封底文案、書籍介紹）。
你的文字精準、吸睛，能快速抓住讀者目光。
請用繁體中文撰寫，語氣專業但不失溫度。
輸出格式清晰，各項目用標題分隔。`;

    if (genFollowSample && sampleTemplate) {
      systemPrompt += `\n\n【格式範例】\n請嚴格依照以下範例的格式、版面結構與文字風格撰寫，但內容完全依據提供的書稿：\n${sampleTemplate}`;
    }

    const userMsg = `請根據以下書稿內容，撰寫新書資料：

【需要產生的項目】
${tasks.map((t, i) => `${i + 1}. ${t}`).join('\n')}

【書稿內容】
${bookContent}

請直接輸出新書資料，不需要前言或解釋。`;

    return userMsg ? { systemPrompt, userMsg } : null;
  },

  // ══════════════════════════════════════════
  // Feature: 錯別字修訂
  // ══════════════════════════════════════════
  buildTypoPrompts(articleContent, typoTable, mode) {
    const modeDesc = {
      highlight: '在錯誤字詞後用【→正確】格式標示，保留原文其餘部分不變',
      auto: '直接輸出已全部修正完畢的文章，不加任何標記',
      report: '輸出錯誤報告：列出每個錯誤的位置（引用前後文）、錯誤字、建議修正字，最後附上修正後全文',
    };

    const systemPrompt = `你是一位專業的旅遊書文字編輯，負責依照錯別字修訂表修訂文章。
修訂方式：${modeDesc[mode]}

請務必：
1. 只修訂表中明確列出的錯別字對應
2. 不擅自更動文章其他內容或風格
3. 繁體中文輸出
4. 若文中無需修訂處，請說明「本文未發現修訂表中的錯別字」`;

    const userMsg = `【錯別字修訂表】
${typoTable}

【待修訂文章】
${articleContent}`;

    return { systemPrompt, userMsg };
  },

  // ══════════════════════════════════════════
  // Feature: 文章編輯潤稿
  // ══════════════════════════════════════════
  buildArticlePrompts(articleContent, articleSample, levels, extraInstructions) {
    const levelLabels = {
      editH1: '大標（H1）',
      editH2: '中標（H2）',
      editH3: '小標（H3）',
      editData: 'Data 資訊框',
      editCaption: '圖說（Caption）',
    };
    const selectedLevels = Object.entries(levels)
      .filter(([, v]) => v)
      .map(([k]) => levelLabels[k])
      .join('、');

    let systemPrompt = `你是一位旅遊書資深文字編輯，專精文章結構整理與修潤。
請對以下文章進行編輯潤稿，聚焦於：${selectedLevels}。

編輯原則：
1. 保留原文的核心資訊與事實
2. 依照範例風格調整語氣與節奏
3. 各層級標題要簡潔有力，正文流暢易讀
4. Data 框內資訊保持精確、格式整齊
5. 圖說要生動，點出圖片重點
6. 繁體中文輸出`;

    if (articleSample) {
      systemPrompt += `\n\n【格式與風格範例】\n請嚴格參考以下範例的編排格式、標題風格與整體文字調性：\n\n${articleSample}`;
    }

    if (extraInstructions) {
      systemPrompt += `\n\n【額外編輯指示】\n${extraInstructions}`;
    }

    const userMsg = `請對以下文章進行完整的編輯潤稿，輸出修潤後的完整文章。在文章開頭加上「【潤稿版本】」標示，並在最後附上「【編輯說明】」簡述主要修改重點（3～5 點）：

${articleContent}`;

    return { systemPrompt, userMsg };
  },
};
