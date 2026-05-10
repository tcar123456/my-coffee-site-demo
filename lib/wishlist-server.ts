// Phase 4 — server-only helper（不是 'use server'，給 server component 直接 import）

import { prisma } from "@/lib/prisma";

export async function getWishlistedProductIds(
  userId: string | null | undefined,
): Promise<Set<string>> {
  if (!userId) return new Set();
  const rows = await prisma.wishlistItem.findMany({
    where: { userId },
    select: { productId: true },
  });
  return new Set(rows.map((r) => r.productId));
}
