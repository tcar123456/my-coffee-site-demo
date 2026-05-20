"use server";

// Phase 3b — 結帳 server actions
// Phase 7a/b — placeOrder 接 promo + 自動套用 tier discount，transaction 內：
//   1) 重驗 promoCode（active + 時間 + minSubtotal + maxUses + 未被同帳號用過）
//   2) 扣庫存
//   3) 算 subtotal / shippingFee / discountAmount / tierDiscountAmount / total
//   4) 建 Order + OrderItem + PromoCodeUsage（若有 promo）
//   5) PromoCode.usedCount 遞增（同 transaction 防 race）
//   6) 清空 Cart + 取訂單編號

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/order-number";
import {
  calculateShipping,
  isPaymentMethod,
  isShippingMethod,
} from "@/lib/shipping";
import { previewDiscount } from "@/lib/schemas/promo-code";
import { previewTierDiscount } from "@/lib/tier";
import { findStoreById } from "@/lib/logistics/store-mock";

const placeOrderSchema = z.object({
  addressId: z.string().min(1),
  shippingMethod: z.string().refine(isShippingMethod, "無效的配送方式"),
  paymentMethod: z.string().refine(isPaymentMethod, "無效的付款方式"),
  promoCode: z.string().trim().toUpperCase().optional(),
  // Phase 8b — CVS 取貨必填三組（HOME_DELIVERY 不需要）；後續業務規則驗證在 placeOrder 內
  cvsStoreId: z.string().min(1).optional(),
  cvsStoreName: z.string().min(1).optional(),
  cvsAddress: z.string().min(1).optional(),
});

export type PlaceOrderResult =
  | { ok: true; orderNumber: string }
  | { ok: false; error: string };

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");
  return session.user.id;
}

export async function placeOrder(input: {
  addressId: string;
  shippingMethod: string;
  paymentMethod: string;
  promoCode?: string;
  cvsStoreId?: string;
  cvsStoreName?: string;
  cvsAddress?: string;
}): Promise<PlaceOrderResult> {
  const userId = await requireUserId();
  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "參數錯誤。" };
  }
  const {
    addressId,
    shippingMethod,
    paymentMethod,
    promoCode,
    cvsStoreId,
    cvsStoreName,
    cvsAddress,
  } = parsed.data;

  // Phase 8b — CVS 取貨必填店資訊；HOME_DELIVERY 反之不可帶。
  // 額外校驗：cvsStoreId 必須是 lib/logistics/store-mock.ts 已知 storeId（防偽造）。
  const isCvs =
    shippingMethod === "CVS_711" || shippingMethod === "CVS_FAMILY";
  if (isCvs) {
    if (!cvsStoreId || !cvsStoreName || !cvsAddress) {
      return { ok: false, error: "超商取貨必須選擇門市。" };
    }
    const known = findStoreById(cvsStoreId);
    if (!known) {
      return { ok: false, error: "找不到此門市，請重新選擇。" };
    }
    // 鏈別與配送方式必須對齊（7-11 → UNIMART / 全家 → FAMILY）
    const expectedChain =
      shippingMethod === "CVS_711" ? "UNIMART" : "FAMILY";
    if (known.chain !== expectedChain) {
      return { ok: false, error: "門市與超商通路不符，請重新選擇。" };
    }
  } else {
    if (cvsStoreId || cvsStoreName || cvsAddress) {
      return { ok: false, error: "宅配方式不需選擇門市。" };
    }
  }

  const address = await prisma.address.findUnique({
    where: { id: addressId },
    select: {
      id: true,
      userId: true,
      recipient: true,
      phone: true,
      zipCode: true,
      city: true,
      district: true,
      street: true,
    },
  });
  if (!address || address.userId !== userId) {
    return { ok: false, error: "找不到此收件地址。" };
  }

  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              slug: true,
              name: true,
              price: true,
              stock: true,
              isActive: true,
            },
          },
        },
      },
    },
  });
  if (!cart || cart.items.length === 0) {
    return { ok: false, error: "購物車是空的。" };
  }

  for (const item of cart.items) {
    if (!item.product.isActive) {
      return { ok: false, error: `「${item.product.name}」已下架，請先從購物車移除。` };
    }
    if (item.product.stock < item.qty) {
      return {
        ok: false,
        error: `「${item.product.name}」庫存僅剩 ${item.product.stock} 件，請調整數量。`,
      };
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tier: true },
  });
  if (!user) return { ok: false, error: "找不到使用者。" };

  const subtotal = cart.items.reduce((sum, i) => sum + i.product.price * i.qty, 0);
  const shippingFee = calculateShipping(subtotal, shippingMethod);
  const tierDiscountAmount = previewTierDiscount(user.tier, subtotal);

  try {
    const orderNumber = await prisma.$transaction(async (tx) => {
      // 1) 重驗 promo（transaction 內撈最新狀態，配合 usedCount 增量防 race）
      let promoCodeId: string | null = null;
      let discountAmount = 0;
      if (promoCode) {
        const promo = await tx.promoCode.findUnique({
          where: { code: promoCode },
        });
        if (!promo) throw new Error("PROMO_NOT_FOUND");

        const usage = await tx.promoCodeUsage.findUnique({
          where: {
            userId_promoCodeId: { userId, promoCodeId: promo.id },
          },
        });
        if (usage) throw new Error("PROMO_ALREADY_USED");

        const preview = previewDiscount(subtotal, promo);
        if (!preview.ok) throw new Error(`PROMO_INVALID:${preview.reason}`);

        promoCodeId = promo.id;
        discountAmount = preview.discount;
      }

      // 2) 庫存扣減 race 防護：update + where stock>=qty。任一失敗就 throw 回滾。
      for (const item of cart.items) {
        const result = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.qty } },
          data: { stock: { decrement: item.qty } },
        });
        if (result.count === 0) {
          throw new Error(`STOCK_RACE:${item.product.name}`);
        }
      }

      // 3) 算最終 total：扣 promo + tier 折抵後仍 ≥ 0
      // 順序：先 promo 再 tier（避免 tier 折抵被 promo 重複壓掉）；
      // 兩者皆對 subtotal 折抵（不對 shippingFee）。
      const totalDiscount = discountAmount + tierDiscountAmount;
      const discountedSubtotal = Math.max(0, subtotal - totalDiscount);
      const total = discountedSubtotal + shippingFee;

      const number = await generateOrderNumber(tx);

      const createdOrder = await tx.order.create({
        data: {
          orderNumber: number,
          userId,
          addressId: address.id,
          shippingMethod,
          paymentMethod,
          subtotal,
          shippingFee,
          promoCodeId,
          discountAmount,
          tierDiscountAmount,
          // Phase 8b — CVS 取貨才寫入；HOME_DELIVERY 全 null
          cvsStoreId: cvsStoreId ?? null,
          cvsStoreName: cvsStoreName ?? null,
          cvsAddress: cvsAddress ?? null,
          total,
          recipientName: address.recipient,
          recipientPhone: address.phone,
          shippingZipCode: address.zipCode,
          shippingCity: address.city,
          shippingDistrict: address.district,
          shippingStreet: address.street,
          items: {
            create: cart.items.map((i) => ({
              productId: i.productId,
              productName: i.product.name,
              productSlug: i.product.slug,
              unitPrice: i.product.price,
              qty: i.qty,
              grind: i.grind,
              pkg: i.pkg,
            })),
          },
        },
      });

      // 4) 寫 PromoCodeUsage + 遞增 usedCount（同 transaction 防 race）
      if (promoCodeId) {
        await tx.promoCodeUsage.create({
          data: {
            userId,
            promoCodeId,
            orderId: createdOrder.id,
          },
        });
        await tx.promoCode.update({
          where: { id: promoCodeId },
          data: { usedCount: { increment: 1 } },
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return number;
    });

    revalidatePath("/cart");
    revalidatePath("/account");
    revalidatePath("/account/orders");
    revalidatePath("/", "layout");
    return { ok: true, orderNumber };
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.startsWith("STOCK_RACE:")) {
      return {
        ok: false,
        error: `「${message.slice("STOCK_RACE:".length)}」剛剛被搶完了，請重新調整購物車。`,
      };
    }
    if (message === "PROMO_NOT_FOUND") {
      return { ok: false, error: "優惠碼不存在或已失效，請重新確認。" };
    }
    if (message === "PROMO_ALREADY_USED") {
      return { ok: false, error: "此優惠碼您已使用過。" };
    }
    if (message.startsWith("PROMO_INVALID:")) {
      return { ok: false, error: message.slice("PROMO_INVALID:".length) };
    }
    return { ok: false, error: "建立訂單時發生錯誤，請稍後再試。" };
  }
}

export async function placeOrderAndRedirect(input: {
  addressId: string;
  shippingMethod: string;
  paymentMethod: string;
  promoCode?: string;
}): Promise<{ ok: false; error: string } | never> {
  const result = await placeOrder(input);
  if (!result.ok) return result;
  redirect(`/account/orders/${result.orderNumber}`);
}

export async function markOrderPaid(orderNumber: string): Promise<{ ok: boolean; error?: string }> {
  if (process.env.NODE_ENV === "production") {
    return { ok: false, error: "production 環境不可使用。" };
  }
  const userId = await requireUserId();
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: { id: true, userId: true, status: true },
  });
  if (!order || order.userId !== userId) {
    return { ok: false, error: "找不到此訂單。" };
  }
  if (order.status !== "PENDING") {
    return { ok: false, error: "此訂單已不是待付款狀態。" };
  }
  await prisma.order.update({
    where: { id: order.id },
    data: { status: "PAID", paidAt: new Date() },
  });
  revalidatePath(`/account/orders/${orderNumber}`);
  revalidatePath("/account/orders");
  return { ok: true };
}
