"use server";

// Phase 7a — 前台優惠碼預覽（不寫 DB）
//
// applyPromoCode：給 checkout/payment 頁的「輸入優惠碼 → 試算」用。
// 流程：
//   1) requireUserId（未登入直接拒絕，避免別人試碼）
//   2) 撈 promoCode（小寫 / trim 後 upper case）；不存在 → 拒絕
//   3) 撈 PromoCodeUsage(userId, promoCodeId)；已存在 → 拒絕（同帳號用過）
//   4) 算 cart subtotal（不含運費，與 5c previewDiscount 約定一致）
//   5) 呼叫 previewDiscount → 回 DiscountResult
//
// 不在這裡寫 PromoCodeUsage / 遞增 usedCount；那要等 placeOrder transaction 內做（race-safe）。

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  previewDiscount,
  type DiscountResult,
} from "@/lib/schemas/promo-code";

export type ApplyPromoResult =
  | {
      ok: true;
      code: string;
      promoCodeId: string;
      subtotal: number;
      discount: number;
      finalTotal: number;
      description: string | null;
    }
  | { ok: false; error: string };

export async function applyPromoCode(
  rawCode: string,
): Promise<ApplyPromoResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "請先登入。" };
  const userId = session.user.id;

  const code = rawCode.trim().toUpperCase();
  if (code.length === 0) return { ok: false, error: "請輸入優惠碼。" };

  const promo = await prisma.promoCode.findUnique({ where: { code } });
  if (!promo) return { ok: false, error: "找不到此優惠碼。" };

  const usage = await prisma.promoCodeUsage.findUnique({
    where: { userId_promoCodeId: { userId, promoCodeId: promo.id } },
  });
  if (usage) return { ok: false, error: "此優惠碼您已使用過。" };

  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: { select: { price: true, isActive: true, stock: true } },
        },
      },
    },
  });
  if (!cart || cart.items.length === 0) {
    return { ok: false, error: "購物車是空的。" };
  }
  const subtotal = cart.items.reduce(
    (s, i) => s + i.product.price * i.qty,
    0,
  );

  const result: DiscountResult = previewDiscount(subtotal, promo);
  if (!result.ok) return { ok: false, error: result.reason };

  return {
    ok: true,
    code: promo.code,
    promoCodeId: promo.id,
    subtotal,
    discount: result.discount,
    finalTotal: result.finalTotal,
    description: promo.description,
  };
}
