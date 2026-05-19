import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  // Phase 6 — 開發階段用 cloudflared / ngrok tunnel 測 ECPay / LINE Pay callback
  // 必須白名單外部 origin，否則 Next.js 16 dev server 會擋 server action 請求
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "*.ngrok-free.app",
  ],
};

export default nextConfig;
