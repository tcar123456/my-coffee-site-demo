"use server";

// Phase 5b — 賣家後台商品 CRUD + 圖片管理 server actions
//
// 設計：
// - requireSeller 雙層 gate（proxy + action）
// - slug 唯一靠 DB unique；P2002 衝突轉成可讀錯誤訊息
// - delete 用硬刪除；若被 OrderItem / CartItem 鎖住（schema onDelete: Restrict）就 fallback 提示用「下架」
// - 圖片上傳：FormData 收 File，丟到 Supabase Storage 拿 publicUrl 寫 ProductImage 一筆
// - sortOrder：新增圖片放最後（取目前 max+1）；reorder 批次寫 sortOrder=index

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { Prisma as PrismaNs } from "@/generated/prisma/client";
import {
  productFormSchema,
  type ProductFormValues,
} from "@/lib/schemas/product";
import {
  uploadProductImage,
  deleteProductImage as deleteFromStorage,
  deleteAllProductImages,
  urlToStoragePath,
} from "@/lib/supabase-storage";

const PAGE_SIZE = 20;

export type AdminProductActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function requireSeller(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");
  if (session.user.role !== "SELLER") throw new Error("FORBIDDEN");
}

function revalidateProductViews(slug?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath("/admin/stock");
  revalidatePath("/products");
  if (slug) revalidatePath(`/products/${slug}`);
  revalidatePath("/", "layout");
}

// ─────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────

export type AdminProductListItem = {
  id: string;
  slug: string;
  name: string;
  origin: string;
  price: number;
  stock: number;
  isActive: boolean;
  badge: string | null;
  coverVariant: number | null;
  primaryImageUrl: string | null;
  imageCount: number;
};

export type AdminProductListResult = {
  rows: AdminProductListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function listProductsForAdmin(params: {
  filter?: "all" | "active" | "inactive";
  q?: string;
  page?: number;
}): Promise<AdminProductListResult> {
  await requireSeller();
  const page = Math.max(1, params.page ?? 1);
  const where: Prisma.ProductWhereInput = {};
  if (params.filter === "active") where.isActive = true;
  if (params.filter === "inactive") where.isActive = false;
  const q = params.q?.trim();
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
      { origin: { contains: q, mode: "insensitive" } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        slug: true,
        name: true,
        origin: true,
        price: true,
        stock: true,
        isActive: true,
        badge: true,
        coverVariant: true,
        images: {
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: { url: true },
        },
        _count: { select: { images: true } },
      },
    }),
  ]);

  return {
    rows: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      origin: r.origin,
      price: r.price,
      stock: r.stock,
      isActive: r.isActive,
      badge: r.badge,
      coverVariant: r.coverVariant,
      primaryImageUrl: r.images[0]?.url ?? null,
      imageCount: r._count.images,
    })),
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getProductForAdmin(id: string) {
  await requireSeller();
  return prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
    },
  });
}

// ─────────────────────────────────────────────────────────────
// CREATE / UPDATE / TOGGLE / DELETE
// ─────────────────────────────────────────────────────────────

function normalizeFormInput(input: ProductFormValues) {
  return {
    name: input.name,
    slug: input.slug,
    origin: input.origin,
    roastLevel: input.roastLevel as Prisma.ProductCreateInput["roastLevel"],
    processingMethod: input.processingMethod,
    flavorNotes: input.flavorNotes,
    description: input.description?.trim() || null,
    price: input.price,
    weightGram: input.weightGram,
    stock: input.stock,
    badge: input.badge?.trim() || null,
    coverVariant: input.coverVariant ?? null,
    isActive: input.isActive,
  };
}

function isUniqueSlugConflict(e: unknown): boolean {
  return (
    e instanceof PrismaNs.PrismaClientKnownRequestError &&
    e.code === "P2002" &&
    Array.isArray(e.meta?.target) &&
    (e.meta.target as string[]).includes("slug")
  );
}

export type CreateProductResult =
  | { ok: true; id: string; slug: string }
  | { ok: false; error: string };

export async function createProduct(input: ProductFormValues): Promise<CreateProductResult> {
  try {
    await requireSeller();
  } catch {
    return { ok: false, error: "權限不足。" };
  }
  const parsed = productFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "參數錯誤。" };
  }

  try {
    const product = await prisma.product.create({
      data: normalizeFormInput(parsed.data),
      select: { id: true, slug: true },
    });
    revalidateProductViews(product.slug);
    return { ok: true, id: product.id, slug: product.slug };
  } catch (e) {
    if (isUniqueSlugConflict(e)) {
      return { ok: false, error: "此 slug 已被使用，請改一個。" };
    }
    return { ok: false, error: "建立商品時發生錯誤。" };
  }
}

export async function updateProduct(
  id: string,
  input: ProductFormValues,
): Promise<AdminProductActionResult> {
  try {
    await requireSeller();
  } catch {
    return { ok: false, error: "權限不足。" };
  }
  const parsed = productFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "參數錯誤。" };
  }

  const existing = await prisma.product.findUnique({
    where: { id },
    select: { slug: true },
  });
  if (!existing) return { ok: false, error: "找不到此商品。" };

  try {
    const updated = await prisma.product.update({
      where: { id },
      data: normalizeFormInput(parsed.data),
      select: { slug: true },
    });
    revalidateProductViews(updated.slug);
    if (existing.slug !== updated.slug) {
      // 舊 slug 路徑也順手清掉
      revalidatePath(`/products/${existing.slug}`);
    }
    return { ok: true };
  } catch (e) {
    if (isUniqueSlugConflict(e)) {
      return { ok: false, error: "此 slug 已被使用，請改一個。" };
    }
    return { ok: false, error: "更新商品時發生錯誤。" };
  }
}

export async function toggleProductActive(id: string): Promise<AdminProductActionResult> {
  try {
    await requireSeller();
  } catch {
    return { ok: false, error: "權限不足。" };
  }
  const product = await prisma.product.findUnique({
    where: { id },
    select: { isActive: true, slug: true },
  });
  if (!product) return { ok: false, error: "找不到此商品。" };

  await prisma.product.update({
    where: { id },
    data: { isActive: !product.isActive },
  });
  revalidateProductViews(product.slug);
  return { ok: true };
}

export async function deleteProduct(id: string): Promise<AdminProductActionResult> {
  try {
    await requireSeller();
  } catch {
    return { ok: false, error: "權限不足。" };
  }

  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      slug: true,
      _count: { select: { orderItems: true, cartItems: true } },
    },
  });
  if (!product) return { ok: false, error: "找不到此商品。" };

  if (product._count.orderItems > 0) {
    return {
      ok: false,
      error: `此商品已有 ${product._count.orderItems} 筆訂單記錄，無法永久刪除。請改用「下架」（停用）。`,
    };
  }
  if (product._count.cartItems > 0) {
    return {
      ok: false,
      error: `此商品仍在 ${product._count.cartItems} 個顧客的購物車中，無法永久刪除。請改用「下架」。`,
    };
  }

  // Storage 圖片先批次刪掉（即使失敗也繼續刪 DB，避免半殘）
  try {
    await deleteAllProductImages(id);
  } catch {
    // 容忍 Storage 失敗（環境未設定 / network 等），不阻擋 DB delete
  }

  await prisma.product.delete({ where: { id } });
  revalidateProductViews(product.slug);
  return { ok: true };
}

export async function deleteProductAndRedirect(id: string): Promise<AdminProductActionResult | never> {
  const result = await deleteProduct(id);
  if (!result.ok) return result;
  redirect("/admin/products");
}

// ─────────────────────────────────────────────────────────────
// IMAGE UPLOAD / DELETE / REORDER
// ─────────────────────────────────────────────────────────────

export type ImageActionResult =
  | { ok: true; imageId?: string; url?: string }
  | { ok: false; error: string };

/**
 * 從 FormData 收圖片並上傳。FormData 用法：client 端用 <form action={uploadProductImageAction}> +
 * <input type="file" name="file"> + <input type="hidden" name="productId">，
 * 或者用 useTransition + fetch FormData 都行。
 */
export async function uploadProductImageAction(formData: FormData): Promise<ImageActionResult> {
  try {
    await requireSeller();
  } catch {
    return { ok: false, error: "權限不足。" };
  }

  const productId = formData.get("productId");
  const file = formData.get("file");
  if (typeof productId !== "string" || !productId) {
    return { ok: false, error: "缺少 productId。" };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "請選擇要上傳的圖檔。" };
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { slug: true },
  });
  if (!product) return { ok: false, error: "找不到此商品。" };

  // 上傳到 Storage
  const upload = await uploadProductImage({ productId, file });
  if (!upload.ok) return upload;

  // 取 max sortOrder 寫新一筆
  const maxRow = await prisma.productImage.findFirst({
    where: { productId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const nextSortOrder = (maxRow?.sortOrder ?? -1) + 1;

  const image = await prisma.productImage.create({
    data: {
      productId,
      url: upload.publicUrl,
      alt: null,
      sortOrder: nextSortOrder,
    },
  });

  revalidateProductViews(product.slug);
  return { ok: true, imageId: image.id, url: upload.publicUrl };
}

export async function deleteProductImageAction(imageId: string): Promise<AdminProductActionResult> {
  try {
    await requireSeller();
  } catch {
    return { ok: false, error: "權限不足。" };
  }

  const image = await prisma.productImage.findUnique({
    where: { id: imageId },
    select: { url: true, product: { select: { slug: true } } },
  });
  if (!image) return { ok: false, error: "找不到此圖片。" };

  // 先嘗試刪 Storage，再刪 DB；Storage 失敗就回報但 DB 不動（避免幽靈檔案）
  const path = urlToStoragePath(image.url);
  if (path) {
    const storageResult = await deleteFromStorage(path);
    if (!storageResult.ok) {
      return { ok: false, error: `Storage 刪除失敗：${storageResult.error}` };
    }
  }
  await prisma.productImage.delete({ where: { id: imageId } });

  revalidateProductViews(image.product.slug);
  return { ok: true };
}

export async function reorderProductImagesAction(input: {
  productId: string;
  imageIds: string[];
}): Promise<AdminProductActionResult> {
  try {
    await requireSeller();
  } catch {
    return { ok: false, error: "權限不足。" };
  }

  const { productId, imageIds } = input;
  if (!Array.isArray(imageIds) || imageIds.length === 0) {
    return { ok: false, error: "參數錯誤。" };
  }

  // 驗證這些 imageId 都屬於 productId
  const existing = await prisma.productImage.findMany({
    where: { productId },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((i) => i.id));
  if (imageIds.some((id) => !existingIds.has(id))) {
    return { ok: false, error: "圖片不屬於此商品。" };
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { slug: true },
  });
  if (!product) return { ok: false, error: "找不到此商品。" };

  // 批次寫 sortOrder（在 transaction 內保證一致性）
  await prisma.$transaction(
    imageIds.map((id, index) =>
      prisma.productImage.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );

  revalidateProductViews(product.slug);
  return { ok: true };
}
