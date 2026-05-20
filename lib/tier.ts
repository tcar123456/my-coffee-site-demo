// Phase 7b — 會員等級規則（純函式）
//
// 升等門檻（lifetimeSpent 累計，所有 PAID/SHIPPED/DELIVERED 訂單 total 加總）：
//   TIER_01：預設
//   TIER_02：≥ NT$ 5,000   → 每單 −NT$ 80
//   TIER_03：≥ NT$ 15,000  → 每單 −NT$ 200
//
// 設計決策（2026-05-20 對齊）：採固定金額折抵，較貼近 mockup 的 −120 視覺；
// 折抵 > subtotal 時截斷成 subtotal（不允許負總額）。

import { MemberTier } from "@/generated/prisma/enums";

export const TIER_THRESHOLDS: Record<MemberTier, number> = {
  TIER_01: 0,
  TIER_02: 5_000,
  TIER_03: 15_000,
};

export const TIER_DISCOUNT_AMOUNT: Record<MemberTier, number> = {
  TIER_01: 0,
  TIER_02: 80,
  TIER_03: 200,
};

export const TIER_LABELS: Record<MemberTier, string> = {
  TIER_01: "Tier 01",
  TIER_02: "Tier 02",
  TIER_03: "Tier 03",
};

/**
 * 依累計消費算出對應 tier。lifetimeSpent 為已扣款訂單 total 加總。
 */
export function computeTier(lifetimeSpent: number): MemberTier {
  if (lifetimeSpent >= TIER_THRESHOLDS.TIER_03) return "TIER_03";
  if (lifetimeSpent >= TIER_THRESHOLDS.TIER_02) return "TIER_02";
  return "TIER_01";
}

/**
 * 算 tier 對 subtotal 的折抵金額。
 * 折抵 > subtotal 時截斷成 subtotal（避免負數）。
 */
export function previewTierDiscount(
  tier: MemberTier,
  subtotal: number,
): number {
  const raw = TIER_DISCOUNT_AMOUNT[tier];
  if (raw <= 0) return 0;
  return Math.min(raw, subtotal);
}

/**
 * 距離下一個 tier 還差多少 lifetimeSpent。
 * 若已是最高 tier 回 null（給 UI 顯示「已達最高等級」用）。
 */
export function distanceToNextTier(
  lifetimeSpent: number,
): { nextTier: MemberTier; remaining: number } | null {
  if (lifetimeSpent < TIER_THRESHOLDS.TIER_02) {
    return {
      nextTier: "TIER_02",
      remaining: TIER_THRESHOLDS.TIER_02 - lifetimeSpent,
    };
  }
  if (lifetimeSpent < TIER_THRESHOLDS.TIER_03) {
    return {
      nextTier: "TIER_03",
      remaining: TIER_THRESHOLDS.TIER_03 - lifetimeSpent,
    };
  }
  return null;
}
