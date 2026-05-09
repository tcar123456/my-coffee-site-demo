# my-coffee-site

小型咖啡豆電商網站（作品集/練習用途，非真實營運商家）。

## 專案範圍

### 功能模組
- **前台**：首頁（含促銷橫幅）、商品頁、購物車、品牌介紹
- **會員中心**
- **賣家後台**：需客製化報表、庫存管理、訂單流程
- **聯絡資訊**：LINE 官方帳號（頁尾放 Add Friend Button + QR Code，不串 API）

### 業務限制
- 僅限台灣本島出貨（離島：金門、澎湖、連江需在地址驗證時擋下）
- 無實體店面
- 金流：LINE Pay、信用卡、轉帳、貨到付款
- 物流：便利超商取貨、宅配到府

### 法規要求
頁面需包含：隱私權政策、退款政策、消保法 7 日鑑賞期條款。

## 技術棧（實際安裝版本）

| 層級 | 版本 / 選擇 |
|---|---|
| 框架 | Next.js **16.2.6**（App Router、Turbopack 預設）+ TypeScript 5 |
| React | 19.2.4 |
| 樣式 | Tailwind CSS **4.3**（@theme in CSS，**不再用 tailwind.config.ts**） |
| 字體 | Noto Serif TC（serif）+ Noto Sans TC（sans），透過 `<link>` 從 Google Fonts CDN 載入（不用 `next/font/google`，避免 Turbopack 在 Windows 上處理 CJK 字體時記憶體爆掉） |
| 元件庫 | shadcn/ui（尚未安裝） |
| 資料庫 | PostgreSQL（Supabase 或 Neon，尚未建立） |
| ORM | Prisma（尚未安裝） |
| 驗證 | Auth.js（NextAuth），role 區分一般會員與賣家（尚未安裝） |
| 金流 | 綠界 ECPay + LINE Pay Sandbox（後期處理） |
| 物流 | 綠界物流 API（後期處理） |
| 圖表 | Recharts 或 Tremor（後台報表用，尚未安裝） |
| 部署 | Vercel + Supabase |

**重要差異**：
- **Next.js 16** 與訓練資料中的版本可能有 breaking changes，動工前請先看 `node_modules/next/dist/docs/`，並注意 `AGENTS.md` 的提醒。
- **Tailwind 4** 採 CSS-first 設計：design tokens 寫在 `app/globals.css` 的 `@theme` 區塊，不再使用 `tailwind.config.ts`。
- **金流物流暫緩**：先把其他模組做好，金流/物流串接放到後期處理。

## 專案結構（已建立）

```
app/
  (shop)/                  # 前台 route group（共用 Masthead + PromoBar + Footer）
    layout.tsx             # 掛載 Masthead / PromoBar / Footer
    page.tsx               # 首頁
    products/page.tsx      # 商品列表（filter rail + 8 商品 grid + sold-out 狀態）
    cart/page.tsx          # 購物車（step indicator + 明細 + summary + cross-sell）
    brand/page.tsx         # 品牌介紹（editorial 長文 + 6 章節 + author bio）
  (member)/                # 會員區（Masthead + Footer，無 PromoBar）
    layout.tsx
    account/page.tsx       # 會員中心（subscription 卡 + orders + addresses + wishlist）
  (admin)/                 # 賣家後台（AdminMasthead，無 Footer）
    layout.tsx             # 註：production access 走 middleware（Auth.js 尚未裝）
    admin/page.tsx         # KPI + inline SVG charts + orders 表 + stock alerts
  api/                     # API routes（待建）
  layout.tsx               # 全站 root layout，<head> 載入 Google Fonts CDN
  globals.css              # Tailwind v4 @theme 設計 tokens + bean-cover 變體 (alt-1~5)
components/
  Masthead.tsx             # 公開 masthead（client component，usePathname 高亮）
  PromoBar.tsx             # 促銷橫幅
  Footer.tsx
  AdminMasthead.tsx        # 賣家後台 masthead（含 role tag、search、operator info）
  ui/Button.tsx            # variant: primary | default | ghost；href→Link 或 button
_design-reference/         # 9 個 HTML 設計稿（已加入 .gitignore，僅本地參考）
public/
next.config.ts             # 已設定 turbopack.root 避免 workspace 偵測警告
```

**待建（未來新增）**：`lib/{ecpay,linepay,shipping}/`、`prisma/`、middleware.ts。

## 設計稿 → React 轉換流程

`_design-reference/` 內含「暮焙 MUBEI」editorial × dark charcoal 風格設計稿（6 個對應路由的 HTML 已全數轉成 React）。已建立的轉換 convention：

1. **Server component 預設** — 只在需要 state/effect/handler 時才加 `"use client"`（目前只有 `Masthead` 為 client）
2. **設計 tokens 走 Tailwind utilities** — `bg-bg` / `bg-surface` / `text-accent` / `text-fg-2` / `border-border` / `font-serif` / `font-mono`
3. **Layout 變數用 arbitrary value** — `px-[var(--gutter)]`、`max-w-[var(--max)]`、`text-[clamp(...)]`
4. **複雜漸層放 `globals.css`** — 像 `bean-cover` / `hero-art` / `img-block` 這類 radial gradient 寫成全域 class，TSX 引用即可（避免每次都用一大串 arbitrary value）
5. **不過度抽元件** — page-local 的 helper（`SectionHead`、`SumRow`、`Step`…）保留在 page.tsx 同檔內。元件出現在 2+ 頁時才 promote 到 `components/`
6. **Visual mockup 用 `defaultValue`/`defaultChecked`** — 還沒接 state 的表單元素直接寫死，page 仍可 SSR

平行轉換多頁時可派 subagent（general-purpose），brief 必含：
- 必讀範本（home + products 為基準）
- 硬規則：不准動 `globals.css`（race condition）、server component 預設、不過度抽元件
- 報告格式：簡述 + 想加但沒加的 globals.css 補丁清單

## 開發約定

- 使用 TypeScript，避免 `any`
- 資料庫操作走 Prisma，避免裸 SQL
- 後台路由用 middleware 驗證 role，不在每個 page 內重複檢查
- 金流相關程式碼（callback 驗章、訂單狀態機）需有測試
- 庫存扣減使用資料庫 transaction，避免併發超賣

## 環境

- Windows 11 + PowerShell
- 套件管理工具：**pnpm 10.33.2**（已採用）

## 常用指令

```powershell
pnpm dev      # 開發伺服器（Turbopack，預設 http://localhost:3000）
pnpm build    # 正式建置
pnpm start    # 啟動正式建置
pnpm lint     # ESLint
```

## 開發狀態

✅ 專案骨架已建立（Next.js 16 + Tailwind 4 + 路由分區 + design tokens 整合）
✅ 6 條路由全數從 `_design-reference/` 轉成 React（/、/products、/cart、/brand、/account、/admin）
✅ 三個 route group 各有自己的 layout（shop / member / admin），共用元件抽到 `components/`
✅ 字體載入改用 Google Fonts CDN（規避 Turbopack on Windows 處理 CJK 字體會死機的問題）
🚧 篩選 / 排序 / 數量 / 表單等互動還是視覺 mockup（用 `defaultValue` SSR 渲染，待接 state）
🚧 shadcn/ui、Prisma、Auth.js、middleware（admin role 守門）、ECPay / LINE Pay / 物流 API 尚未安裝
