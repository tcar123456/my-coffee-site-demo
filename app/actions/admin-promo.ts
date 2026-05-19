"use server";

// Phase 5c — 賣家後台優惠碼 CRUD server actions
// 不真刪：toggleActive 而非 delete（usedCount 統計要保留）
// P2002 catch：code unique 衝突轉成可讀訊息
// Phase 7a 兌換邏輯（PromoCodeUsage 寫入 + usedCount 遞增）不在這裡

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { Prisma as PrismaNs } from "@/generated/prisma/client";
import {
  promoCodeFormSchema,
  type PromoCodeFormValues,
} from "@/lib/schemas/promo-code";

const PAGE_SIZE = 20;

export type PromoActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function requireSeller(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");
  if (session.user.role !== "SELLER") throw new Error("FORBIDDEN");
}

function revalidatePromoViews() {
  revalidatePath("/admin");
  revalidatePath("/admin/promo");
}

function isCodeConflict(e: unknown): boolean {
  return (
    e instanceof PrismaNs.PrismaClientKnownRequestError &&
    e.code === "P2002" &&
    Array.isArray(e.meta?.target) &&
    (e.meta.target as string[]).includes("code")
  );
}

function normalize(input: PromoCodeFormValues) {
  return {
    code: input.code.toUpperCase().trim(),
    description: input.description,
    discountType: input.discountType as Prisma.PromoCodeCreateInput["discountType"],
    discountValue: input.discountValue,
    minSubtotal: input.minSubtotal,
    maxUses: input.maxUses,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    isActive: input.isActive,
  };
}

// ─────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────

export type AdminPromoListResult = {
  rows: Array<{
    id: string;
    code: string;
    description: string | null;
    discountType: "PERCENT" | "FIXED";
    discountValue: number;
    minSubtotal: number;
    maxUses: number | null;
    usedCount: number;
    startsAt: Date | null;
    endsAt: Date | null;
    isActive: boolean;
    createdAt: Date;
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function listPromoCodesForAdmin(params: {
  filter?: "all" | "active" | "inactive";
  q?: string;
  page?: number;
}): Promise<AdminPromoListResult> {
  await requireSeller();
  const page = Math.max(1, params.page ?? 1);
  const where: Prisma.PromoCodeWhereInput = {};
  if (params.filter === "active") where.isActive = true;
  if (params.filter === "inactive") where.isActive = false;
  const q = params.q?.trim();
  if (q) {
    where.OR = [
      { code: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.promoCode.count({ where }),
    prisma.promoCode.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  return {
    rows,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getPromoCodeForAdmin(id: string) {
  await requireSeller();
  return prisma.promoCode.findUnique({ where: { id } });
}

// ─────────────────────────────────────────────────────────────
// CREATE / UPDATE / TOGGLE
// ─────────────────────────────────────────────────────────────

export type CreatePromoResult =
  | { ok: true; id: string; code: string }
  | { ok: false; error: string };

export async function createPromoCode(
  input: PromoCodeFormValues,
): Promise<CreatePromoResult> {
  try {
    await requireSeller();
  } catch {
    return { ok: false, error: "權限不足。" };
  }
  const parsed = promoCodeFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "參數錯誤。" };
  }

  try {
    const created = await prisma.promoCode.create({
      data: normalize(parsed.data),
      select: { id: true, code: true },
    });
    revalidatePromoViews();
    return { ok: true, id: created.id, code: created.code };
  } catch (e) {
    if (isCodeConflict(e)) {
      return { ok: false, error: "此優惠碼已被使用，請改一個。" };
    }
    return { ok: false, error: "建立優惠碼時發生錯誤。" };
  }
}

export async function updatePromoCode(
  id: string,
  input: PromoCodeFormValues,
): Promise<PromoActionResult> {
  try {
    await requireSeller();
  } catch {
    return { ok: false, error: "權限不足。" };
  }
  const parsed = promoCodeFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "參數錯誤。" };
  }

  const existing = await prisma.promoCode.findUnique({
    where: { id },
    select: { usedCount: true },
  });
  if (!existing) return { ok: false, error: "找不到此優惠碼。" };

  try {
    await prisma.promoCode.update({
      where: { id },
      data: normalize(parsed.data),
    });
    revalidatePromoViews();
    return { ok: true };
  } catch (e) {
    if (isCodeConflict(e)) {
      return { ok: false, error: "此優惠碼已被使用，請改一個。" };
    }
    return { ok: false, error: "更新優惠碼時發生錯誤。" };
  }
}

export async function togglePromoCodeActive(id: string): Promise<PromoActionResult> {
  try {
    await requireSeller();
  } catch {
    return { ok: false, error: "權限不足。" };
  }
  const promo = await prisma.promoCode.findUnique({
    where: { id },
    select: { isActive: true },
  });
  if (!promo) return { ok: false, error: "找不到此優惠碼。" };

  await prisma.promoCode.update({
    where: { id },
    data: { isActive: !promo.isActive },
  });
  revalidatePromoViews();
  return { ok: true };
}
