// Phase 9b — sitemap.xml (Next.js 16 file convention)
// 公開路由 + 從 DB 撈所有 active product 動態 entry

import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${APP_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${APP_URL}/products`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${APP_URL}/brand`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${APP_URL}/policy/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${APP_URL}/policy/refund`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${APP_URL}/policy/seven-day-right`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  // 動態：所有 active products
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    });
    const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
      url: `${APP_URL}/products/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    }));
    return [...staticRoutes, ...productRoutes];
  } catch {
    // DB 失敗時仍回靜態路由（避免 sitemap 完全 404）
    return staticRoutes;
  }
}
