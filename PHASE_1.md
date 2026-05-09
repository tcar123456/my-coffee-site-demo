# Phase 1：資料層基礎 ✅ 已完成

> 最後更新：2026-05-10
> 狀態：完成（`pnpm build` 通過、9 條路由全數正常 build）
> 目標：把 `/products` 與商品詳細頁的資料從硬編碼抽出來，接上 Supabase PostgreSQL。

## 完成摘要

- ✅ Supabase（aws-1-ap-southeast-2 / Sydney）PostgreSQL 建立
- ✅ Prisma 7.8.0 安裝 + 新架構（adapter-pg、prisma.config.ts、prisma-client generator）
- ✅ Schema 三張表 + 兩個 enum：`User`、`Product`、`ProductImage` / `Role`、`RoastLevel`
- ✅ Migration 跑成功（`20260509201420_init`）
- ✅ Seed 8 筆商品進 DB，可重跑（用 slug upsert）
- ✅ `/products` 改為 server component 從 DB fetch
- ✅ 新增 `/products/[slug]` 商品詳細頁
- ✅ 列表卡片包成 Link 連到詳細頁

`pnpm build` 結果：
```
○ /  /account  /admin  /brand  /cart  /products    （static prerender）
ƒ /products/[slug]                                   （dynamic SSR）
```

---

## 範圍調整（與最初規劃不同的地方）

### 1. shadcn/ui 延後到 Phase 3 ✅ 維持

ROADMAP 原本把 shadcn/ui 安裝放在 Phase 1，實際發現：

- 現有 `components/ui/Button.tsx` 是針對設計稿 tokens 客製的（`text-accent` / `border-accent` / mono uppercase + 0.16em letter-spacing），shadcn 預設 Button 換上去設計會跑掉
- 真正會大量用到 shadcn 是 Phase 3 結帳表單時（Form / Input / Select / Dialog）
- Phase 1 重點是資料層，混進 UI 重構會分散注意力

### 2. Prisma 7 比預期更大改版（實際踩到的）

最初規劃是用 Prisma 6 的常見 pattern，實際 `pnpm add prisma` 拉到 7.8.0，三件事跟訓練資料常見的舊版完全不同：

| Prisma 6 (舊) | Prisma 7 (實際) |
|---|---|
| schema datasource 寫 `url` / `directUrl` | **schema 不再支援**，必須移到 `prisma.config.ts` |
| `new PrismaClient()` 自動讀 env | **必須傳 adapter**（如 `PrismaPg`），不再從 env 自動連線 |
| seed 設定在 `package.json.prisma.seed` | 改在 `prisma.config.ts.migrations.seed` |
| generator output 預設 `node_modules/.prisma/client` | 預設 `app/generated/prisma`（會被 Next.js 編譯到，**要改路徑**） |

因此實際多裝了 4 個套件：`@prisma/adapter-pg`、`pg`、`@types/pg`、`dotenv`。

### 3. 商品圖片暫時用 `bean-cover` 漸層 ✅ 維持

不接 Supabase Storage、也不放 `public/products/*.jpg`，列表頁與詳細頁都用既有的 CSS radial gradient (`bean-cover--alt-N`) 當視覺。Storage upload 等 Phase 5 賣家後台 CRUD 再接。

---

## 子任務（實際執行步驟）

### 1. 建立 Supabase 專案 ✅

- [x] supabase.com 註冊 / 登入
- [x] 建立新專案，地區選 **AWS Sydney (ap-southeast-2)**
- [x] 設定強密碼
- [x] 從 Database settings 取得兩條連線字串：
  - **Transaction (port 6543)** → `DATABASE_URL`（runtime 走 pooler）
  - **Session (port 5432)** → `DIRECT_URL`（CLI 跑 migrate）

### 2. 環境變數 ✅

- [x] `.env.local` 在專案根目錄建立（`.env*` 已在 `.gitignore`）：
  ```
  DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres"
  DIRECT_URL="postgresql://postgres.<ref>:<password>@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"
  ```

### 3. 安裝 Prisma 與相依 ✅

```powershell
pnpm add -D prisma tsx dotenv
pnpm add @prisma/client @prisma/adapter-pg pg
pnpm add -D @types/pg
pnpm dlx prisma init --datasource-provider postgresql
```

- [x] `pnpm.onlyBuiltDependencies` 在 `package.json` 設好（pnpm 10 才會跑 `@prisma/engines` postinstall）

### 4. 設定檔（Prisma 7 新架構）✅

**`prisma/schema.prisma`** — datasource 只剩 provider，url 移到 prisma.config.ts：
```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}
datasource db {
  provider = "postgresql"
}
```

**`prisma.config.ts`** — 載入 .env.local + 設定 url + seed command：
```ts
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";
dotenv.config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DIRECT_URL"], // CLI 走 session mode 5432
  },
});
```

**`.gitignore`** 加 `/generated/`（Prisma client 產物，不進 git）。

### 5. 定義 Schema ✅

- [x] `User`（含 Role enum，預留 Phase 2 Auth.js）
- [x] `Product`（slug / origin / roastLevel / processingMethod / flavorNotes / description? / price / weightGram / stock / badge? / coverVariant? / isActive）
- [x] `ProductImage`（productId / url / alt? / sortOrder）
- [x] `RoastLevel` enum：LIGHT / MEDIUM_LIGHT / MEDIUM / MEDIUM_DARK / DARK
- [x] `Role` enum：CUSTOMER / SELLER

**設計決策**：
- `price` 用 `Int`（新台幣整數，避免 floating-point）
- `origin` 不拆「英文 / 中文」，直接存「ETHIOPIA · 衣索比亞」整串
- `processingMethod` 用 `String` 不做 enum（咖啡處理法種類多且會增加）
- `coverVariant` 是過渡欄位，等真圖到位可下掉

### 6. 第一次 migration ✅

```powershell
pnpm dlx prisma migrate dev --name init
```

- [x] `prisma/migrations/20260509201420_init/migration.sql` 產生
- [x] Supabase 上 `User` / `Product` / `ProductImage` 三張表建立成功

### 7. Prisma Client singleton（lib/prisma.ts）✅

Prisma 7 不再支援 `new PrismaClient()` 直接呼叫，必須傳 adapter：

```ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

注意 import path：`../generated/prisma/client`（不是 `@prisma/client`）。

### 8. Seed Script ✅

`prisma/seed.ts` — 8 筆商品，用 `prisma.product.upsert` 以 `slug` 為 key 確保可重跑：

```powershell
pnpm dlx prisma db seed
```

- [x] 8 筆商品全部進 DB（包含 1 筆 stock=0 的售完商品）

### 9. 改寫 `/products` 頁為 server component fetch ✅

`app/(shop)/products/page.tsx`：

- [x] 移除頂端硬編碼 `const products: Product[] = [...]`
- [x] 改為 `await prisma.product.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } })`
- [x] DB 欄位對應：
  - `p.no` → 由 index 計算（`String(i + 1).padStart(2, "0")`）
  - `p.roast` (中文) → 從 `roastLevel` enum 透過 `roastLabel` map 轉
  - `p.weight` → `${p.weightGram}g`
  - `p.soldOut` → `p.stock === 0`
  - `p.notes` → `p.flavorNotes`
- [x] filterGroups 暫時保留硬編碼（Phase 3 才接篩選邏輯）

### 10. 商品詳細頁 `/products/[slug]` ✅

`app/(shop)/products/[slug]/page.tsx`：

- [x] Server component，async `params: Promise<{ slug: string }>`（Next.js 15+ 必須 await）
- [x] `prisma.product.findUnique({ where: { slug }, include: { images: { orderBy: { sortOrder: "asc" } } } })`
- [x] 找不到呼叫 `notFound()`
- [x] 設計沿用 design tokens（`bg-bg` / `text-fg` / `font-serif` / `bean-cover`），editorial 兩欄佈局
- [x] 包含：breadcrumb / 大圖 / 商品名 / 風味 / spec list（烘焙度 / 處理法 / 規格 / 庫存）/ 價格 / 加入購物車按鈕（**未接 onClick**，Phase 3 才接）/ description fallback

### 11. 列表卡片包 Link → 詳細頁 ✅

把 `<article>` 替換為 `<Link href={`/products/${p.slug}`}>`，整張卡點下去就導到詳細頁。售完商品也可點進去看（標籤改成「通知我 →」）。

### 12. Build 驗收 ✅

```
✓ Compiled successfully in 1806ms
✓ Generating static pages (9/9)
○ /  /account  /admin  /brand  /cart  /products
ƒ /products/[slug]
```

---

## 實際踩到的坑（給未來的自己參考）

1. **pnpm 10 build script approval**：Prisma 引擎下載需要 postinstall script，pnpm 10 預設會擋。要在 `package.json` 加 `pnpm.onlyBuiltDependencies: ["@prisma/client", "@prisma/engines", "esbuild", "prisma"]`。

2. **Prisma 7 schema 拒絕 `url` / `directUrl`**：寫了會直接驗證失敗（P1012）。必須移到 `prisma.config.ts`。

3. **prisma.config.ts 不接 `directUrl` 屬性**：TypeScript 會報 TS2353。直連 url 改放 `prisma.config.ts.datasource.url`，pooler 連線字串給 lib/prisma.ts 的 adapter 用。

4. **seed 設定移位**：`package.json.prisma.seed` 在 Prisma 7 不再讀取，改放 `prisma.config.ts.migrations.seed`。Prisma CLI 會給清楚的錯誤訊息提醒。

5. **dotenv 載入 .env.local**：`prisma init` 預設產生的 `import "dotenv/config"` 只讀 `.env`，不讀 `.env.local`。要改成 `dotenv.config({ path: ".env.local" })`。

6. **Generator output 不能放在 app/**：Prisma 7 預設輸出 `app/generated/prisma`，會被 Next.js 當 route 檔案編譯。改到 `../generated/prisma`（top-level，gitignored）。

---

## 驗收標準

- [x] Supabase Dashboard 看到 `User` / `Product` / `ProductImage` 三張表，`Product` 有 8 筆 seed 資料
- [x] `pnpm build` 9 條路由全數成功
- [x] TypeScript / ESLint clean
- [x] `prisma/migrations/` 進 git，`.env.local` 不進 git
- [x] `/products/[slug]` 動態路由正常
- [ ] **使用者實際驗證**：`pnpm dev` 開瀏覽器確認 `/products` 與 `/products/{slug}` 視覺正常、404 路由正確處理（建議跑一次 dev server 確認）

---

## Phase 1 對 Phase 2 留下的伏筆

- `User` 表 schema 已建好，含 `Role` enum（CUSTOMER / SELLER），Phase 2 Auth.js 直接接
- 「為什麼有 User 表卻沒人」是預期狀態——Auth.js 註冊流程才會有 row 進去
- 如果 Phase 2 要在 User schema 加欄位（例如 emailVerified、image），會多一次 migration，是正常流程

---

## 不在 Phase 1 範圍（延後到後續 phase）

- shadcn/ui 安裝（Phase 3）
- 篩選 / 排序 / 分頁邏輯（Phase 3）
- 加入購物車 onClick state（Phase 3）
- Supabase Storage 圖片上傳（Phase 5）
- Auth.js / 登入註冊（Phase 2）
- Cart / Order / Address / Wishlist schema（對應 phase 加 migration）
- 後台商品 CRUD（Phase 5）
- `/products` production revalidation 策略（目前是 build-time static prerender）
