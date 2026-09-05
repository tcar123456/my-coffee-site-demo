# 暮焙 MUBEI · 咖啡豆電商

咖啡豆網路商店。顧客端從逛單品、加購物車、結帳付款到看會員等級；店家端從接單、改狀態、調庫存、發優惠碼到印出貨單。

**狀態**：個人 Demo 專案，非真實商店。金流與物流走 ECPay / LINE Pay 的 sandbox。

---

## 技術棧

Next.js 16（App Router）· TypeScript · PostgreSQL（Supabase）+ Prisma 7 · Auth.js v5 · Tailwind v4 · Zustand · Zod · Recharts · ECPay · LINE Pay

## 功能範圍

**顧客端**：商品列表與單品頁、購物車、會員註冊登入、地址簿、結帳（超商取貨 / 宅配）、ECPay 信用卡與 LINE Pay 付款、訂單查詢、願望清單、定期訂購、會員等級。

**店家端**：訂單管理與狀態流轉、出貨單列印、商品與圖片管理、庫存調整、優惠碼、營收報表。

## 設計重點

**訂單狀態集中在單一狀態機。** 所有狀態流轉走 `lib/order-state.ts`，付款成功後的副作用（扣庫存、累計消費、升等、記錄優惠碼使用）集中在 `lib/order-paid-effects.ts`。金流的 return 與 result 兩條 callback 都可能先到，把副作用收在一處才能做成冪等。

**金流抽象成統一介面。** `lib/payments/` 下 ECPay 與 LINE Pay 各自實作同一組 `initiatePayment` / `confirmPayment`，checkout 流程不需要知道用的是哪一家。未設定 LINE Pay 憑證時會明確拋錯並讓 UI 改顯示「請選其他付款方式」，而不是靜默失敗。

**middleware 只放 edge-safe 的邏輯。** `proxy.ts` 只 import `auth.config.ts`，不碰帶有 bcrypt 與 Prisma 的 `lib/auth.ts`——後者無法在 edge runtime 執行。認證設定因此拆成兩層。

**Service role key 刻意不加 `NEXT_PUBLIC_` 前綴。** Supabase Storage 的上傳走 server action，key 只存在伺服器端。

## 開始開發

需求：Node 20+、pnpm、一個 Supabase 專案。

```bash
pnpm install
cp .env.example .env.local     # 填 DATABASE_URL / DIRECT_URL / AUTH_SECRET / SUPABASE_*
pnpm prisma migrate deploy
pnpm dev                       # http://localhost:3000
```

金流未設定時會自動 fallback 到 ECPay 官方公開測試帳號，可直接跑完整個結帳流程。callback 需要對外網址，本機可用 cloudflared 或 ngrok。

## 已知限制

- 金流與物流皆為 sandbox，未串接正式特店
- 沒有自動化測試
- 沒有寄信功能（忘記密碼、訂單通知皆未實作）
- 定期訂購只有資料模型與管理介面，沒有自動扣款排程
