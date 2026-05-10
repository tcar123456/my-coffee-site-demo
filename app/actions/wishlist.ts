"use server";

// Phase 4 — Wishlist server actions
// (userId, productId) 三元唯一；toggle 模式 = 存在則刪、不存在則建。

import { revalidatePath } from "next/cache";
import { Prisma } from "../../generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type WishlistActionResult =
  | { ok: true }
  | { ok: false; error: string };

export type WishlistToggleResult =
  | { ok: true; inWishlist: boolean }
  | { ok: false; error: string };

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");
  return session.user.id;
}

function revalidateAll() {
  revalidatePath("/account");
  revalidatePath("/account/wishlist");
  revalidatePath("/cart");
}

export async function listWishlist() {
  const userId = await requireUserId();
  return prisma.wishlistItem.findMany({
    where: { userId },
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function toggleWishlist(productId: string): Promise<WishlistToggleResult> {
  const userId = await requireUserId();
  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId, productId } },
    select: { id: true },
  });

  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    revalidateAll();
    return { ok: true, inWishlist: false };
  }

  try {
    await prisma.wishlistItem.create({ data: { userId, productId } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      // 並發競爭：其他 tab 同時加 → 視為已存在，不報錯
      revalidateAll();
      return { ok: true, inWishlist: true };
    }
    throw e;
  }
  revalidateAll();
  return { ok: true, inWishlist: true };
}

export async function addToWishlist(productId: string): Promise<WishlistActionResult> {
  const userId = await requireUserId();
  try {
    await prisma.wishlistItem.create({ data: { userId, productId } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      revalidateAll();
      return { ok: true };
    }
    throw e;
  }
  revalidateAll();
  return { ok: true };
}

export async function removeFromWishlist(productId: string): Promise<WishlistActionResult> {
  const userId = await requireUserId();
  await prisma.wishlistItem.deleteMany({ where: { userId, productId } });
  revalidateAll();
  return { ok: true };
}
