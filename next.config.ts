import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  // Phase 6 — dev 環境用 cloudflared / ngrok tunnel 測 ECPay / LINE Pay callback 時，
  // Next.js 16 dev server 預設會擋外部 origin 的 server action 請求；這份白名單只在
  // dev 生效，production build 不會載入。
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "*.ngrok-free.app",
  ],
  // Phase 10 — Supabase Storage 公開 bucket 的圖片需透過 next/image 載入。
  // public URL 格式：https://<project-ref>.supabase.co/storage/v1/object/public/product-images/<path>
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
