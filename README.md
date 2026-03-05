# 旅途編輯台 · Travel Editorial Studio

> 專為旅遊書編輯者打造的 AI 輔助編輯工作平台

## 功能介紹

### 📁 專案管理系統
- 為每本書建立獨立專案，保存各書的設定資料庫
- 支援專案匯出（JSON）與匯入備份
- 多專案切換，編輯工作有條不紊

### ✦ 新書資料產生器
- 上傳完整書稿（.txt 或 .docx），AI 自動分析
- 產生：書籍賣點 / 目標讀者分析 / 特色列點
- 可上傳新書資料範例，AI 依格式輸出

### ◎ 錯別字修訂
- 每個專案可設定專屬錯別字修訂表
- 三種修訂模式：標示錯誤 / 自動修正 / 錯誤報告
- 支援 .txt 與 .docx 格式

### ◆ 文章編輯潤稿
- 分層處理：大標、中標、小標、Data、圖說
- 上傳格式範例，AI 依風格修潤
- 可附加額外編輯指示

---

## 部署到 GitHub Pages

### Step 1：Fork 或上傳此專案
將整個資料夾上傳到你的 GitHub Repository。

### Step 2：啟用 GitHub Pages
1. 進入 Repository → Settings → Pages
2. Source 選擇 `main` branch，目錄選 `/ (root)`
3. 儲存，等待幾分鐘後取得網址

### Step 3：設定 API 金鑰
進入網站後，點擊左側「API 設定」，輸入你的 Anthropic API 金鑰。

> ⚠️ **注意**：API 金鑰僅存於瀏覽器本機（localStorage），不會上傳到任何伺服器。

---

## 取得 Claude API 金鑰

1. 前往 [console.anthropic.com](https://console.anthropic.com)
2. 登入 Anthropic 帳號
3. 至「API Keys」建立新金鑰
4. 複製後貼入網站「API 設定」

---

## 技術架構

| 項目 | 技術 |
|------|------|
| 前端框架 | 純 HTML5 + CSS3 + Vanilla JS |
| AI 引擎 | Claude claude-sonnet-4-20250514 (Anthropic) |
| Word 解析 | mammoth.js |
| 資料儲存 | localStorage（本機瀏覽器） |
| 部署 | GitHub Pages（靜態） |

---

## 錯別字表格式範例

```
錯誤字→正確字
豎琴→豎琴
蕃茄→番茄
著作→著作
```

每行一條規則，以 `→`、`：`、`:` 分隔均可。

---

## 版本記錄

- v1.0.0 · 初始版本，包含三大編輯功能與專案管理系統
