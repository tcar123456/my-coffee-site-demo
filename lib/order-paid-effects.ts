// Phase 7b — 訂單轉 PAID 的副作用統一入口
//
// 4 處 PAID trigger 共用：
//   1) app/actions/admin-orders.ts        updateOrderStatus (PENDING→PAID 分支)
//   2) app/actions/admin-orders.ts        confirmManualPayment (BANK_TRANSFER/COD)
//   3) app/api/payments/ecpay/return      ECPay 信用卡 callback
//   4) app/api/payments/linepay/confirm   LINE Pay v3 callback
//
// 設計決策：
//   - 在傳入的 transaction client (tx) 內執行，與 order.status update 同 transaction
//     才能保證「PAID + lifetimeSpent + tier」三者一致（不會 PAID 寫成功但 tier 沒更新）。
//   - idempotent：以 tx 撈當前 user.lifetimeSpent，加上本單 total 後重算 tier；
//     呼叫端的責任是只在「真的從非 PAID 轉成 PAID」時呼叫。
//   - 退款 / 取消 PAID 的回退邏輯不在此範圍（目前狀態機不允許 PAID 回 PENDING；
//     cancel PAID 不會 trigger 此 helper）。

import type { Prisma } from "@/generated/prisma/client";
import { computeTier } from "@/lib/tier";

/**
 * 在訂單從非 PAID 轉成 PAID 時呼叫，於同一個 transaction 內：
 *   1) user.lifetimeSpent += order.total
 *   2) user.tier = computeTier(新的 lifetimeSpent)
 *
 * @returns 新的 tier（讓呼叫端可選擇要不要 log / revalidate）
 */
export async function applyPaidEffects(
  tx: Prisma.TransactionClient,
  params: { userId: string; orderTotal: number },
): Promise<{ newLifetimeSpent: number; newTier: ReturnType<typeof computeTier> }> {
  const user = await tx.user.findUnique({
    where: { id: params.userId },
    select: { lifetimeSpent: true },
  });
  if (!user) {
    // 不可能：order.userId 是 FK，但保險起見
    throw new Error(`applyPaidEffects: user ${params.userId} not found`);
  }
  const newLifetimeSpent = user.lifetimeSpent + params.orderTotal;
  const newTier = computeTier(newLifetimeSpent);
  await tx.user.update({
    where: { id: params.userId },
    data: { lifetimeSpent: newLifetimeSpent, tier: newTier },
  });
  return { newLifetimeSpent, newTier };
}
