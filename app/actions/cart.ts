"use server";

// Phase 3a — Cart server actions（僅供登入用戶使用；訪客走 zustand store）
// 同 (productId, grind, pkg) 三元組視為同品項，qty 加總。

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isValidGrind, isValidPkg } from "@/lib/cart-options";

const MAX_QTY = 99;

const cartItemInputSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().int().min(1).max(MAX_QTY),
  grind: z
    .string()
    .nullish()
    .transform((v) => v ?? undefined)
    .refine((v) => v === undefined || isValidGrind(v), "invalid grind"),
  pkg: z
    .string()
    .nullish()
    .transform((v) => v ?? undefined)
    .refine((v) => v === undefined || isValidPkg(v), "invalid pkg"),
});

export type CartActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("UNAUTHENTICATED");
  }
  return session.user.id;
}

async function getOrCreateCart(userId: string) {
  return prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

export async function addToCart(input: {
  productId: string;
  qty: number;
  grind?: string;
  pkg?: string;
}): Promise<CartActionResult> {
  const userId = await requireUserId();
  const parsed = cartItemInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "輸入格式錯誤。" };
  }
  const { productId, qty, grind, pkg } = parsed.data;

  // 商品存在 + isActive + stock>0 才允許加入
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, isActive: true, stock: true },
  });
  if (!product || !product.isActive) {
    return { ok: false, error: "商品已下架。" };
  }
  if (product.stock <= 0) {
    return { ok: false, error: "此商品已售完。" };
  }

  const cart = await getOrCreateCart(userId);

  // 因為 Prisma 的 unique 含 nullable 欄位（grind/pkg）行為不一致，
  // 直接以 findFirst + upsert-like 邏輯處理較穩。
  const existing = await prisma.cartItem.findFirst({
    where: {
      cartId: cart.id,
      productId,
      grind: grind ?? null,
      pkg: pkg ?? null,
    },
  });

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { qty: Math.min(MAX_QTY, existing.qty + qty) },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        qty,
        grind: grind ?? null,
        pkg: pkg ?? null,
      },
    });
  }

  revalidatePath("/cart");
  revalidatePath("/", "layout"); // Masthead badge 需要刷新
  return { ok: true };
}

export async function updateCartItemQty(
  itemId: string,
  qty: number,
): Promise<CartActionResult> {
  const userId = await requireUserId();
  if (!Number.isInteger(qty) || qty < 0 || qty > MAX_QTY) {
    return { ok: false, error: "數量無效。" };
  }

  // 確認 item 屬於用戶的 cart
  const item = await prisma.cartItem.findUnique({
    where: { id: itemId },
    select: { id: true, cart: { select: { userId: true } } },
  });
  if (!item || item.cart.userId !== userId) {
    return { ok: false, error: "找不到此品項。" };
  }

  if (qty === 0) {
    await prisma.cartItem.delete({ where: { id: itemId } });
  } else {
    await prisma.cartItem.update({ where: { id: itemId }, data: { qty } });
  }

  revalidatePath("/cart");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeCartItem(itemId: string): Promise<CartActionResult> {
  return updateCartItemQty(itemId, 0);
}

const guestItemSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().int().min(1).max(MAX_QTY),
  grind: z.string().optional(),
  pkg: z.string().optional(),
});

export async function mergeGuestCart(
  guestItems: unknown,
): Promise<CartActionResult> {
  const userId = await requireUserId();

  const parsed = z.array(guestItemSchema).max(50).safeParse(guestItems);
  if (!parsed.success) {
    return { ok: false, error: "資料格式錯誤。" };
  }

  // 過濾無效 grind/pkg
  const items = parsed.data
    .map((i) => ({
      productId: i.productId,
      qty: i.qty,
      grind: i.grind && isValidGrind(i.grind) ? i.grind : undefined,
      pkg: i.pkg && isValidPkg(i.pkg) ? i.pkg : undefined,
    }))
    .filter((i) => i.qty > 0);

  if (items.length === 0) return { ok: true };

  // 過濾掉已下架 / 不存在的商品
  const productIds = [...new Set(items.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    select: { id: true },
  });
  const validIds = new Set(products.map((p) => p.id));

  const cart = await getOrCreateCart(userId);

  // 對每個有效 guest item 做 merge（同 key qty 加總）
  for (const i of items) {
    if (!validIds.has(i.productId)) continue;

    const existing = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: i.productId,
        grind: i.grind ?? null,
        pkg: i.pkg ?? null,
      },
    });

    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { qty: Math.min(MAX_QTY, existing.qty + i.qty) },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: i.productId,
          qty: i.qty,
          grind: i.grind ?? null,
          pkg: i.pkg ?? null,
        },
      });
    }
  }

  revalidatePath("/cart");
  revalidatePath("/", "layout");
  return { ok: true };
}

// 訪客 cart 渲染所需：依 productIds 撈商品（給 GuestCartView 用）
export async function getProductsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  return prisma.product.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      slug: true,
      name: true,
      origin: true,
      price: true,
      stock: true,
      isActive: true,
      coverVariant: true,
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { url: true, alt: true },
      },
    },
  });
}
