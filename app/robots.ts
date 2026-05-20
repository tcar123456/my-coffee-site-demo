// Phase 9b — robots.txt (Next.js 16 file convention)
// 允許所有公開頁面、擋住會員/後台/結帳/api/auth callback

import type { MetadataRoute } from "next";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/account/",
          "/admin/",
          "/checkout/",
          "/api/",
          "/login",
          "/register",
        ],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  };
}
