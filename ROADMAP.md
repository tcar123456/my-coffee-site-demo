# my-coffee-site 開發進度規劃

> 最後更新：2026-05-10
> 本文件為開發里程碑規劃。時程估算為推測，實際進度依個人開發節奏調整。

## 目前狀態（Phase 0–2 ✅ 已完成）

### Phase 0：骨架
- [x] Next.js 16 + React 19 + TS5 + Tailwind 4 骨架
- [x] 三個 route group：`(shop)` / `(member)` / `(admin)`，各自的 layout
- [x] 6 條路由從 `_design-reference/` HTML 轉成 React：`/`、`/products`、`/cart`、`/brand`、`/account`、`/admin`
- [x] 共用元件：`Masthead`、`PromoBar`、`Footer`、`AdminMasthead`、`ui/Button`
- [x] Tailwind v4 design tokens 寫在 `app/globals.css` 的 `@theme`
- [x] 字體改用 Google Fonts CDN（規避 Turbopack on Windows 的 CJK 字體記憶體問題）

### Phase 1：資料層基礎（詳見 PHASE_1.md）
- [x] Supabase PostgreSQL 建立（aws-1-ap-southeast-2）
- [x] Prisma 7.8.0 + adapter-pg + prisma.config.ts 新架構
- [x] Schema：`User` / `Product` / `ProductImage` + `Role` / `RoastLevel` enum
- [x] Migration `init` 跑成功
- [x] Seed 8 筆商品（用 slug upsert，可重跑）
- [x] `/products` 改為 server component 從 DB fetch
- [x] 新增 `/products/[slug]` 商品詳細頁
- [x] 列表卡片包成 Link 連到詳細頁
- [x] `pnpm build` 通過（9 條路由）

---

### Phase 2：身份驗證與授權（詳見 PHASE_2.md）
- [x] Auth.js v5（`next-auth@5.0.0-beta.31`）+ bcryptjs + zod
- [x] Credentials provider（email + password）+ JWT session
- [x] Schema migration `add_auth_models`：User 加 password / emailVerified / image，新增 Account / Session / VerificationToken
- [x] Split config：`lib/auth.config.ts`（edge-safe，含 jwt / session / authorized callbacks）+ `lib/auth.ts`（Credentials + bcrypt）
- [x] `proxy.ts` 守門：`/account/*` 需登入、`/admin/*` 需 `SELLER` role（Next.js 16 把 `middleware` 改名 `proxy`）
- [x] 登入頁 / 註冊頁 / SignOut（沿用 editorial design tokens）
- [x] `/account` 頁顯示真實 session 資料；Masthead 接 session 顯示登入狀態
- [x] Seed 加 customer + seller demo 帳號（`customer@coffee.local` / `seller@coffee.local`）
- [x] HTTP-level 走訪驗收：守門、登入登出、role 區分全綠

**目前狀態**：登入授權層完整，下一階段做購物流程互動化。

**Phase 2 不做（保留紀錄供未來補上，詳見 PHASE_2.md「延後/暫不做」）**：
- Google OAuth 實際串接（登入 / 註冊頁僅放 disabled placeholder 按鈕）
- 忘記密碼 / 寄信 / 密碼重設流程

---

## Phase 3：購物流程互動化（預計 1–2 週）

- [ ] **shadcn/ui 安裝**（從 Phase 1 延後過來），裝齊 Button / Input / Form / Select / Dialog
- [ ] 自製 `ui/Button.tsx` 客製成 shadcn Button 的 variants（保留 design tokens）
- [ ] 購物車 state：用 Zustand 或 React Context 管理客戶端狀態
- [ ] 訪客購物車存 `localStorage`，登入後 merge 到 DB `Cart`
- [ ] **新增 schema**：`Cart` / `CartItem`（多一次 migration）
- [ ] `/products` 篩選 / 排序接上 URL search params（`?roast=medium&origin=ethiopia`）
- [ ] 加入購物車 / 改數量 / 移除 → API route + optimistic update
- [ ] 結帳流程：地址表單 → 配送方式 → 付款方式 → 確認頁
- [ ] **離島地址驗證**：金門 / 澎湖 / 連江郵遞區號擋下（CLAUDE.md 業務限制）
- [ ] 庫存扣減用 Prisma transaction（避免併發超賣）
- [ ] **新增 schema**：`Order` / `OrderItem` / `Address` + 訂單狀態 enum

---

## Phase 4：會員中心串接（預計 3–5 天）

- [ ] 訂單列表 / 訂單詳情頁
- [ ] 收件地址 CRUD
- [ ] 願望清單（**新增 schema** `WishlistItem` join table）
- [ ] 訂閱方案管理（mockup 已有 UI，先做假流程不接金流）

---

## Phase 5：賣家後台功能（預計 1–2 週）

- [ ] 訂單管理：列表、狀態變更、出貨單列印
- [ ] 庫存管理：補貨、低庫存警告（mockup 已有 stock alerts UI）
- [ ] 商品 CRUD + **圖片上傳到 Supabase Storage**（取代目前的 `bean-cover` 漸層 mockup）
- [ ] 報表：用 Recharts 或 Tremor 做營收 / 商品銷量 / 客戶分析
- [ ] CSV 匯出
- [ ] **`/products` 加 `revalidatePath` 機制**：賣家改商品後立刻反映到前台（目前是 build-time static prerender）

---

## Phase 6：金流整合（沙盒）（預計 1 週）

CLAUDE.md 標註「金流物流暫緩，後期處理」，所以排在後面。

- [ ] ECPay 信用卡 sandbox：建立訂單 → 導向 ECPay → callback 驗章 → 更新訂單狀態
- [ ] LINE Pay sandbox：同上流程
- [ ] 轉帳 / 貨到付款：純流程設計，不需第三方 API
- [ ] **callback 驗章與訂單狀態機要寫測試**（CLAUDE.md 開發約定）
- [ ] 用 ngrok 或 Vercel preview URL 測 callback

---

## Phase 7：物流整合（沙盒）（預計 3–5 天）

- [ ] 綠界物流 API：超商取貨建單、宅配建單
- [ ] 物流狀態 webhook 同步到訂單

---

## Phase 8：法規頁面與細節（預計 2–3 天）

- [ ] 隱私權政策頁
- [ ] 退款政策頁
- [ ] 消保法 7 日鑑賞期條款說明
- [ ] 頁尾 LINE 官方帳號 Add Friend Button + QR Code（不串 API，純連結）
- [ ] SEO：metadata、sitemap.xml、robots.txt、OG image
- [ ] 404 / 500 / loading / error boundary 頁面
- [ ] a11y 檢查（鍵盤導航、ARIA、色彩對比）

---

## Phase 9：部署與展示（預計 2–3 天）

- [ ] Vercel 部署 + 環境變數
- [ ] Supabase production DB（目前的 DB 也可直接拿來用）
- [ ] domain 設定（自選或用 vercel.app subdomain）
- [ ] README 補上專案截圖、demo 帳號（買家 + 賣家）、技術說明
- [ ] 作品集說明文件：列出技術決策的取捨（為什麼選 Next.js 全端而不是 Shopify、為什麼 Tailwind 4、為什麼 Prisma 7 + adapter-pg 等）

---

## 跨階段持續做的事

- 重要邏輯寫測試（金流 callback、庫存扣減、訂單狀態機）
- 開新 PR 前跑 `pnpm lint` 與 `pnpm build`
- TypeScript 不寫 `any`，DB 操作不寫裸 SQL（CLAUDE.md 開發約定）
- Schema 改動每次走 `prisma migrate dev --name <描述>` 產生新 migration

---

## 不在範圍內的事項（明確排除）

- 真實商家申請（綠界正式特店、LINE Pay 正式商家）
- 金門 / 澎湖 / 連江出貨（業務限制已列）
- 實體店 POS 整合
- 多語系 i18n（先做繁中即可，作品集主要受眾是台灣）
- 行動 App
- 客服即時對話功能（用 LINE 官方帳號取代）
