# Phase 2：身份驗證與授權

> 最後更新：2026-05-10
> 狀態：✅ 完成並通過驗收（build 通過 11 條路由 + Proxy；HTTP-level 走訪測試 customer / seller / 訪客三種狀態守門、登入登出、頁面渲染全綠）
> 目標：把 `/account` 從硬編碼 mockup 換成真實登入用戶資料；`/admin/*` 用 `SELLER` role 守門。

## Demo 帳號（seed 已寫入）

| 角色 | Email | 密碼 |
|---|---|---|
| 顧客 | `customer@coffee.local` | `Coffee123` |
| 賣家 | `seller@coffee.local` | `Seller123` |

## 實作中的調整（與規劃不同）

1. **`middleware.ts` → `proxy.ts`**：Next.js 16 把檔名慣例從 `middleware` 改為 `proxy`（舊名仍可用但會 deprecation warning）。直接跟上新慣例。
2. **API route handler 寫法**：v5 docs 建議的 `export { GET, POST } from "@/lib/auth"` 在 Turbopack 會 build 失敗（解析不到動態 export），改用 `import { handlers } from ...; export const { GET, POST } = handlers;`。
3. **`@types/bcryptjs` 不裝**：bcryptjs 3.x 已內建 type definitions，`@types/bcryptjs` 標記 deprecated。
4. **【重要】jwt + session callback 必須住在 `auth.config.ts`，不是 `auth.ts`**：原本規劃把 `jwt` / `session` 放在 `auth.ts`、只把 `authorized` 放在 edge-safe config。實測發現 seller 帳號被 proxy 擋下進不了 `/admin`——因為 proxy 的 NextAuth 實例是用 `authConfig` 建的，沒有 session callback，session.user.role 永遠是 undefined，`authorized` 拿不到 role。修正：把 `jwt` 和 `session` callback 都放到 `auth.config.ts`（這兩個 callback 純資料 shape、沒 import bcrypt/Prisma，是 edge-safe 的）。`auth.ts` 只剩 Credentials provider 與 authorize()。

## 範圍摘要

| 項目 | Phase 2 處理 |
|---|---|
| Credentials（email + password）登入 | ✅ 做 |
| 註冊流程 | ✅ 做 |
| middleware 守門（`/account/*`、`/admin/*`） | ✅ 做 |
| `/account` 顯示真實 session 資料 | ✅ 做 |
| SignOut | ✅ 做 |
| Google OAuth 按鈕 UI | ✅ placeholder（disabled + 「即將推出」），不接邏輯 |
| Google OAuth 實際串接 | ⏸️ 延後（見下方紀錄） |
| 忘記密碼 / 寄信 / 密碼重設 | ⏸️ 延後（見下方紀錄） |
| Email 驗證 | ⏸️ 不做 |

---

## 技術決策

| 項目 | 選擇 | 理由 |
|---|---|---|
| Auth 套件 | **Auth.js v5**（`next-auth@beta`） | ROADMAP 指定；v5 是 stable 版本（API 與 v4 不同） |
| Session 策略 | **JWT**（不用 DB session） | Prisma 7 + `pg` 在 edge middleware 跑不動，DB session 在 middleware 查不了；JWT stateless 才能在 middleware 直接讀 |
| Provider | **Credentials only** | Google placeholder 不接邏輯 |
| 密碼雜湊 | **bcryptjs**（純 JS） | Vercel 部署不會卡 native binding |
| Adapter | **Phase 2 不裝** | Credentials + JWT 不需要 adapter；schema 先建好，Google 啟用時再裝 `@auth/prisma-adapter` 即可 |
| 設定切分 | **split config pattern**：`auth.config.ts`（edge-safe，給 middleware）+ `auth.ts`（給 server，含 Credentials provider 與 bcrypt） | Auth.js v5 官方推薦做法，繞過 edge runtime 限制 |
| Form 驗證 | `zod` | 註冊 / 登入表單欄位驗證 |

---

## Schema 變動（一次 migration）

Migration 名稱：`add_auth_models`

`User` 加欄位：
- `password String?` — credentials 用，OAuth 用戶為 null
- `emailVerified DateTime?` — Auth.js 標準欄位
- `image String?` — Auth.js 標準欄位

新增 model（Auth.js 標準 schema）：

```prisma
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

User 加 relation：

```prisma
model User {
  // ...既有欄位
  emailVerified DateTime?
  image         String?
  password      String?

  accounts Account[]
  sessions Session[]
}
```

**設計決策**：
- 雖然 Phase 2 用 JWT、不裝 adapter、Account / Session / VerificationToken 三張表會是空的，但**先建好** schema 讓 Google OAuth / 寄信驗證未來啟用時不用再 migrate。Empty tables 在 Supabase Dashboard 看起來怪但無害。
- `password` 是非 Auth.js 標準欄位，是給 credentials authorize() 自己查的。

---

## 子任務（執行順序）

### 1. 套件安裝

```powershell
pnpm add next-auth@beta bcryptjs zod
pnpm add -D @types/bcryptjs
```

- 暫不裝 `@auth/prisma-adapter`
- `next-auth@beta` 即 v5（撰寫此文件時尚未脫 beta）

### 2. 環境變數

`.env.local` 加：
```
AUTH_SECRET="..." # 用 pnpm dlx auth secret 產生
```

`.env.example` 同步更新（讓未來部署 / 別人 clone 知道要設哪些 key）。

### 3. Schema migration

```powershell
pnpm dlx prisma migrate dev --name add_auth_models
```

驗證 Supabase 看到 4 張表（User 加欄位 + Account / Session / VerificationToken）。

### 4. Auth core 設定

**`lib/auth.config.ts`**（edge-safe，**不能 import bcrypt 或 Prisma**）：
- `providers: []`（Credentials provider 在 `auth.ts` 加）
- `pages: { signIn: "/login" }`
- `callbacks.authorized({ auth, request })` — 給 middleware 用：
  - `/admin/*` → `auth?.user?.role === "SELLER"`
  - `/account/*` → `!!auth?.user`
  - 其他 → `true`

**`lib/auth.ts`**（給 server component / route handler 用）：
- import `auth.config.ts` 並 spread
- 加 `Credentials({ authorize })`：
  - 收 `{ email, password }`
  - `prisma.user.findUnique({ where: { email } })`
  - `bcrypt.compare(password, user.password)`
  - 回傳 `{ id, email, name, role }` 或 null
- `session: { strategy: "jwt" }`
- callbacks：
  - `jwt({ token, user })`：第一次登入時把 `user.id` / `user.role` 寫進 token
  - `session({ session, token })`：把 token.id / token.role 寫進 `session.user`
- export `{ handlers, signIn, signOut, auth }`

### 5. NextAuth route handler

`app/api/auth/[...nextauth]/route.ts`：
```ts
export { GET, POST } from "@/lib/auth";
```

### 6. Middleware

`middleware.ts`（top-level）：
```ts
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/account/:path*", "/admin/:path*"],
};
```

### 7. Type augmentation

`types/next-auth.d.ts`：擴充 `Session["user"]` 加 `id` / `role`，擴充 `JWT` 加 `id` / `role`。

### 8. 註冊功能

新增 route group `app/(auth)/`，layout 共用 minimal masthead（不一定要有 PromoBar）。

`app/(auth)/register/actions.ts`（server action）：
- zod 驗證 email + password（≥8 字 + 至少 1 數字）
- 檢查 email 唯一（findUnique）
- `bcrypt.hash(password, 10)`
- `prisma.user.create({ data: { email, password: hashed, role: CUSTOMER } })`
- 呼叫 `signIn("credentials", { email, password, redirectTo: "/account" })`
- 失敗回 `{ error: "..." }` 給 useActionState 顯示

`app/(auth)/register/page.tsx`：
- client component（要 `useActionState`）
- editorial design tokens（沿用 `bg-bg` / `text-fg` / `font-serif` / `border-border`）
- 表單欄位：email / password / confirm password
- Google placeholder 按鈕：`<button disabled>` + 標籤「即將推出 / Coming Soon」
- 「已有帳號？登入」link 到 `/login`

### 9. 登入頁

`app/(auth)/login/page.tsx` + `actions.ts`：
- 表單呼叫 `signIn("credentials", { email, password, redirectTo: "/account" })`
- Google placeholder 按鈕（同上 disabled）
- 「忘記密碼？」**link 暫不放**（避免引導到不存在的頁面）—— 等 Phase 2.5 / 8 補上時再加
- 「還沒有帳號？註冊」link 到 `/register`

### 10. SignOut

`components/SignOutButton.tsx`：
- client component
- form action 呼叫 server action：`"use server"; await signOut({ redirectTo: "/" })`
- 放位置：
  - `Masthead` 已登入時顯示（替換目前的「會員中心」連結？或並列）
  - `/account` 頁右上角

### 11. `/account` 頁改寫

`app/(member)/account/page.tsx`：
- 改回 server component（目前已是）
- `const session = await auth();`
- middleware 已擋未登入，但仍 defensive：`if (!session?.user) redirect("/login")`
- 顯示 `session.user.name ?? session.user.email`
- 訂閱卡 / 訂單列表 / 願望清單仍維持 mockup（資料層接 Phase 3+）

### 12. Masthead 顯示登入狀態

`components/Masthead.tsx`（目前是 client component）：
- 改成接收 `session` prop（從 server component 傳入），或拆成 server wrapper + client interactive 部分
- 未登入：顯示「登入」連結到 `/login`
- 已登入：顯示「會員中心」+ SignOut

### 13. Seed 加 demo 帳號

`prisma/seed.ts` 多 upsert 兩個帳號：
- `customer@coffee.local` / `Coffee123` → CUSTOMER
- `seller@coffee.local` / `Seller123` → SELLER

`README.md` 加上 demo credentials（作品集用途，明確標註非真實環境）。

### 14. Build + 手動驗收

```powershell
pnpm build
pnpm dev
```

走訪驗收見「驗收標準」區塊。

---

## 驗收標準

- [ ] `pnpm dlx prisma migrate dev --name add_auth_models` 成功
- [ ] `pnpm build` 通過，路由列表新增 `/login`、`/register`、`/api/auth/[...nextauth]`
- [ ] 訪客存取 `/account` 被導到 `/login`
- [ ] 訪客存取 `/admin` 被導到 `/login`
- [ ] 註冊後自動登入並回到 `/account`，看到自己的 email
- [ ] customer 帳號存取 `/admin/*` 被擋下（redirect 或 403）
- [ ] seller 帳號可正常進 `/admin/*`
- [ ] SignOut 清除 session，再點 `/account` 又被導去 `/login`
- [ ] Google placeholder 按鈕顯示 disabled，hover 不會誤導
- [ ] TypeScript / ESLint clean
- [ ] `.env.local` 沒進 git，`.env.example` 列出新 key

---

## 延後 / 暫不做（保留紀錄供未來補上）

### A. Google OAuth 實際串接

**Phase 2 留下的伏筆**：
- 登入 / 註冊頁已有 Google 按鈕 UI（disabled）
- Schema 已含 `Account` / `Session` table

**未來啟用步驟**：
1. GCP Console 建立 OAuth 2.0 Client（test mode 即可，不用送審）
2. 設 redirect URI：`http://localhost:3000/api/auth/callback/google`、`https://<prod-domain>/api/auth/callback/google`
3. `.env.local` 加 `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`
4. `pnpm add @auth/prisma-adapter`
5. `lib/auth.ts` 加：
   ```ts
   import Google from "next-auth/providers/google";
   import { PrismaAdapter } from "@auth/prisma-adapter";
   // ...
   adapter: PrismaAdapter(prisma),
   providers: [Credentials({...}), Google],
   ```
6. 登入頁 Google 按鈕從 disabled 改 active，onClick 呼叫 `signIn("google")`
7. `.env.example` 同步更新

**已知風險（推測）**：`@auth/prisma-adapter` 對 Prisma 7 + adapter-pg 的相容性官方文件目前沒明確標註，啟用時可能踩坑。Fallback 選項：(a) 寫 thin custom adapter；(b) 先確認 Prisma 7 client API 與 6 是否真有 breaking change；(c) 等官方支援。

### B. 忘記密碼流程

**Phase 2 沒做的部分**：
- `/forgot-password` 頁
- `/reset-password?token=...` 頁
- 寄送 reset email
- token 產生與失效機制

**未來啟用步驟**：
1. 選定 email 服務（Resend free tier 100 封/日是首選；或 SMTP）
2. `pnpm add resend`
3. 設 `RESEND_API_KEY`
4. 新增 server action：產生 token、存 `VerificationToken` table（schema 已建好）、寄信
5. reset 頁驗 token、bcrypt hash 新密碼、更新 `User.password`、刪 token
6. 登入頁加「忘記密碼？」link
7. 寫測試（token 過期、token 已使用、token 不存在）

**建議排程**：併入 Phase 8（法規與細節），或視需要新增 Phase 2.5。

### C. 其他未做項目

| 項目 | 為什麼不做 |
|---|---|
| Email 驗證強制 | 作品集環境太重；註冊後直接視為 verified |
| 2FA / passkeys | 不在範圍 |
| 多裝置 session 撤銷 | JWT stateless 不支援；要時切 DB session |
| Magic link 登入 | 需要寄信，先不做 |

---

## 風險 / 不確定性（標註推測）

1. **【推測】Auth.js v5 + Next.js 16 整體相容性**：v5 仍是 beta，Next.js 16 是新 release，動工前先看 next-auth GitHub 最近 issue 列表（搜 "Next.js 16"）。
2. **【推測】Auth.js v5 + Prisma 7 adapter 相容性**：Phase 2 不踩到（不裝 adapter），但延後項目 A 會踩到。
3. **Edge runtime 限制（事實，不是推測）**：middleware 跑在 edge runtime，**不能** import `lib/auth.ts`（裡面 import bcrypt 與 Prisma 都不是 edge-safe）。必須只 import `lib/auth.config.ts`。違反這條會 build 失敗或 runtime error。
4. **server action `signIn()` 的 redirect 行為**：v5 的 `signIn` 在 server action 中拋 `NEXT_REDIRECT`，需用 `try/catch` rethrow 否則會被當成 error 處理。實做時注意。

---

## Phase 2 對 Phase 3 留下的伏筆

- `session.user.id` 在 server component 可取得 → Phase 3 `Cart` schema 直接用 `userId` 關聯
- `lib/auth.ts` / `lib/auth.config.ts` 結構完整，加 OAuth provider 只是擴充
- `middleware.ts` role-based 守門框架已有，新增受保護路由只需加 matcher
- 兩個 demo 帳號（customer + seller）固定存在，方便手動測試流程
