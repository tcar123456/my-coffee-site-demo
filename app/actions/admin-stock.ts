"use server";

// Phase 5a — 賣家後台庫存補貨 server action
// 直接覆蓋為新值（非 delta）— UI 用「目前 X 包 → 改為 Y 包」的直覺式表單。
// revalidate /products 與 /products/[slug] 讓前台 build-time prerender 即時失效。

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const adjustSchema = z.object({
  productId: z.string().min(1),
  nextStock: z.number().int().min(0).max(99_999),
});

export type StockActionResult =
  | { ok: true; productSlug: string; nextStock: number }
  | { ok: false; error: string };

async function requireSeller(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");
  if (session.user.role !== "SELLER") throw new Error("FORBIDDEN");
}

export async function adjustStock(input: {
  productId: string;
  nextStock: number;
}): Promise<StockActionResult> {
  try {
    await requireSeller();
  } catch {
    return { ok: false, error: "權限不足。" };
  }

  const parsed = adjustSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "參數錯誤（庫存須為 0~99999 整數）。" };
  }
  const { productId, nextStock } = parsed.data;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { slug: true },
  });
  if (!product) return { ok: false, error: "找不到此商品。" };

  await prisma.product.update({
    where: { id: productId },
    data: { stock: nextStock },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/stock");
  revalidatePath("/products");
  revalidatePath(`/products/${product.slug}`);
  revalidatePath("/", "layout");

  return { ok: true, productSlug: product.slug, nextStock };
}

/**
 * 後台庫存頁列表。沒有 paging（目前只有 8 款商品）。
 * level: 'out' = 售完；'low' = stock < 20；'all' = 所有
 */
export async function listProductsForStock(level: "all" | "out" | "low" = "all") {
  await requireSeller();
  const stockFilter =
    level === "out" ? { stock: 0 } : level === "low" ? { stock: { lt: 20 } } : {};
  return prisma.product.findMany({
    where: { isActive: true, ...stockFilter },
    orderBy: [{ stock: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      origin: true,
      stock: true,
      coverVariant: true,
      price: true,
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { url: true, alt: true },
      },
    },
  });
}
