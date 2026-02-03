# 倪師斗數

企業決策支援系統 - 結合紫微斗數、易經八卦、風水格局

## 功能

1. **識人系統** - 紫微斗數分析，人事招募決策
2. **卜卦系統** - 易經八卦，企業發展決策
3. **風水系統** - 辦公室格局分析

## 設定步驟

### 1. 安裝套件

```bash
pip install -r requirements.txt
```

### 2. 設定 Google Drive API

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案或選擇現有專案
3. 啟用 Google Drive API
4. 建立 OAuth 2.0 憑證（桌面應用程式）
5. 下載 JSON 並放到 `credentials/google_credentials.json`

### 3. 設定環境變數

複製 `.env.example` 為 `.env` 並填入：

```bash
cp .env.example .env
```

編輯 `.env`：
- `OPENAI_API_KEY` - OpenAI API 金鑰

### 4. 同步倪海廈資料

```bash
python scripts/gdrive_sync.py
```

### 5. 建立知識庫

```bash
python scripts/build_knowledge_base.py
```

## 資料夾結構

```
倪師斗數/
├── backend/           # 後端 API
├── frontend/          # 前端網頁
├── knowledge/         # 知識庫
│   ├── raw/          # 原始資料
│   └── processed/    # 處理後的向量資料
├── data/             # 企業資料
├── scripts/          # 工具腳本
└── credentials/      # API 憑證
```
