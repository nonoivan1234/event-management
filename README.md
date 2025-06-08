---
title: Event Hub - 校園活動與盃賽管理系統

---

# Event Hub - 校園活動與盃賽管理系統

本系統為一套專為校園活動與學生盃賽設計的活動報名與管理平台，旨在解決資訊分散、流程繁瑣、無法複用等痛點，系統採用 Next.js 作為前端框架，Supabase 作為後端資料庫與帳號認證服務，致力於提升主辦與參與雙方的整體體驗與流程效率。

![Demo](img.png)

## 📌 系統功能簡介

### 🧾 活動建立與管理
- **建立活動**：主辦者可自訂標題、介紹、截止日期等，活動首頁以卡片形式顯示
- **報名表單客製化**：支援個人與自訂欄位，參與者依表單需求填寫資料
- **報名狀態與限制**：系統可偵測是否已報名，避免重複填寫
- **無需登入也可報名**：降低使用門檻，支援訪客報名即註冊
- **一鍵複製活動**：快速複用歷屆活動表單與設定
- **報名名單檢視與下載**：主辦者可即時檢視報名資訊並匯出 CSV 檔案

### 🧑‍💼 帳號權限與通知
- **多層級權限**：
  - **創辦人** 可刪除活動
  - **主辦人** 可編輯、通知、隱藏、修改報名資料
  - **協辦人** 可複製活動與匯出報名名單
- **個人檔案**：提供註冊、登入功能，可修改姓名、電話、學號
- **LINE 帳號綁定**：可接收 LINE Bot 推播的活動提醒
- **Email 與 LINE Bot 通知**：支援活動截止、群發或個別通知

### 🔍 搜尋與介面體驗
- **活動搜尋與篩選**：支援以名稱、分類、報名狀態快速查找
- **頁面通知鈴鐺**：即時提醒參與者重要活動訊息
- **夜間模式**：支援夜間模式配色，提升瀏覽舒適度
- **介面優化設計**：支援介紹換行、修復 mac 中文輸入 bug

### 📤 分享與邀請功能
- **快速分享連結**：一鍵複製活動網址以供社群分享
- **用戶邀請機制**：可搜尋已註冊用戶或寄送邀請給尚未註冊者


## 🏗️ 系統技術架構

| 模組 | 技術 |
|------|------|
| 前端 | Next.js 13 + Tailwind CSS + ShadCN UI |
| 後端 | Supabase（PostgreSQL + Auth + RLS） |
| CI/CD | GitHub Actions + Vercel 自動化部署 |


## 🧩 使用者角色與需求

### 主辦者
- 集中管理活動資料，支援歷屆模板複用
- 欲具備通知、權限、報名名單彙整等功能
- 希望報名過程無須手動核對、可自動通知

### 報名者
- 統一入口完成報名，省去跨平台麻煩
- 希望可儲存個資、自動填入、收到活動提醒
- 發現類似活動、擴展參與可能性

## 🗺️ User Story Mapping
![圖片 1](https://hackmd.io/_uploads/HJpDEj-7ll.png)
![圖片 2](https://hackmd.io/_uploads/HkNuEsbXxl.png)

## 🧭 BPMN 流程設計
![圖片 3](https://hackmd.io/_uploads/Ska_Vjbmee.png)


## 🎨 UI Wireframes / Prototypes

- Low-fidelity Wireframe: [Google Slides](https://docs.google.com/presentation/d/1IckYR2fwwjBb4FbgvfEIIiAOCfBqgaKcQ4BCkdFKR8k/)
- UI Prototype: 
![圖片 4](https://hackmd.io/_uploads/SkgtNsZmgl.png)
![圖片 5](https://hackmd.io/_uploads/BJQY4jZXge.png)
![圖片 6](https://hackmd.io/_uploads/ryLFNoWQll.png)
![圖片 7](https://hackmd.io/_uploads/B1cFEiZ7ee.png)

## 🧪 使用者驗證

訪談多位曾主辦校內大小型活動的主辦人與實施問卷調查後，總結報名流程的痛點（如資料分散、人工通知、無法複用表單等）。
- 回收 44 份有效問卷，85% 希望有統一報名與提醒平台。
![圖片 8](https://hackmd.io/_uploads/BJiDV1mQlg.png)

- 超過 95% 主辦者仰賴歷屆表單，期待具備「複製歷屆活動」功能。
![圖片 9](https://hackmd.io/_uploads/rkQ9NJmXex.png)

- 僅 22% 使用者認為交接完善，顯示資訊傳承與管理仍有缺口。
![圖片 10](https://hackmd.io/_uploads/S1jKN1Qmll.png)


本專案之系統功能（如自動通知、複製活動、免登入報名等）即根據上述痛點與需求分析進行設計與優化。

## 🛠️ 技術實作說明

### 1. Supabase 後端服務

- 使用 **Supabase Auth** 實作 Email 密碼登入、註冊與身份驗證機制，支援使用者狀態監聽與登入持續性。
- 採用 **PostgreSQL** 為資料庫核心。
- 資料表透過 **RLS** 控制資料存取權限，例如：
  - 僅活動建立者可檢視與管理其活動資料。
  - 一般使用者僅能編輯/檢視自己的報名紀錄。
- 前端使用 `@supabase/ssr` 套件進行資料 CRUD 操作，實現即時資料查詢與回傳。

### 2. Next.js 前端框架

- 採用 **Next.js 13 App Router** 架構，支援 Server Components 與動態路由。
- 路由架構採模組化設計，如：
  - `/event/[event_id]`：動態顯示活動內容與報名表單。
  - `/profile`：個人頁面。
- 所有資料操作透過 Supabase JS SDK 於前端執行，無需自建 API Routes，簡化開發流程。

### 3. UI 設計與互動體驗

- 採用 **Tailwind CSS** 實現響應式樣式與一致設計語言。
- 整合 **ShadCN UI** 與 **Radix UI**，製作表單、按鈕、篩選器等互動元件。
- 實作 **Dark Mode**，可根據系統或使用者偏好自動切換主題。
- 針對部分平台輸入體驗（如 macOS 中文輸入）進行優化，提升使用流暢度。

### 4. CI/CD 與佈署（DevOps）


- 整合 **Vercel** 平台自動部署，支援以下功能：
  - 自動化部署 GitHub 開發分支與正式分支。
  - 每次 PR 皆產出預覽網址，便於開發與測試。
- 使用 `.env` 管理多個環境變數（開發／預覽／正式）。
- 可依需求擴充 Vercel Analytics、Sentry、LogRocket 等觀測與追蹤工具。

## 📂 專案結構簡述

```
event-hub/
├── src/
│   ├── app/           # App Router pages
│   ├── components/    # UI Components
│   ├── lib/           # Supabase client setup
├── .github/workflows/ # GitHub Actions CI
├── public/
├── .env               # Environment config
├── next.config.js
├── tailwind.config.js
└── package.json
```

## 🧑‍💻 本地開發步驟

```bash
# Clone the project
git clone https://github.com/nonoivan1234/event-management.git
cd event-management/event-hub

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Fill in the required Supabase keys

# Run the app
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 📢 Contributing
If you have any issues or suggestions, feel free email me at nonoivan0627@gmail.com or open an issue on GitHub.