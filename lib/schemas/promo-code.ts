// Phase 5c — 優惠碼共用 zod schema + 折抵預覽純函式
//
// 規則：
//   - code：A-Z 0-9 + 連字號，4–20 字（大寫，UI 自動 uppercase + trim）
//   - discountValue：PERCENT 1–100 (= %)；FIXED 直接 NT$ 1–99999
//   - minSubtotal：最低消費才能用；0 = 無限制
//   - maxUses null = 無上限；nullable 用 z.preprocess 把空字串轉 null
//   - startsAt / endsAt null = 無時間限制；client 端 datetime-local input 同 preprocess

import { z } from "zod";
import { DiscountType } from "@/generated/prisma/enums";

const CODE_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

// 空字串/undefined → null（給 nullable 欄位用）
const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

// HTML datetime-local 給的字串轉 Date；null 留 null
const parseDateInput = (v: unknown) => {
  if (v === "" || v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? v : d; // 留原值讓 zod 噴錯
  }
  return v;
};

export const promoCodeFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(4, "優惠碼至少 4 字")
      .max(20, "優惠碼最多 20 字")
      .regex(CODE_PATTERN, "只允許大寫英數 + 連字號，例：SUMMER15、FIRST-100"),
    description: z.preprocess(
      emptyToNull,
      z.string().trim().max(120, "說明最多 120 字").nullable(),
    ),
    discountType: z.enum(
      Object.values(DiscountType) as [string, ...string[]],
      { error: "請選擇折扣類型" },
    ),
    discountValue: z.number().int("折扣值須為整數").min(1, "折扣值至少 1").max(99_999),
    minSubtotal: z.number().int("最低消費須為整數").min(0).max(99_999),
    maxUses: z.preprocess(
      emptyToNull,
      z.number().int().min(1, "使用上限至少 1").max(99_999).nullable(),
    ),
    startsAt: z.preprocess(parseDateInput, z.date().nullable()),
    endsAt: z.preprocess(parseDateInput, z.date().nullable()),
    isActive: z.boolean(),
  })
  .refine(
    (d) => d.discountType !== "PERCENT" || d.discountValue <= 100,
    { message: "PERCENT 折扣值不可超過 100", path: ["discountValue"] },
  )
  .refine(
    (d) => !d.startsAt || !d.endsAt || d.endsAt > d.startsAt,
    { message: "結束時間必須晚於開始時間", path: ["endsAt"] },
  );

export type PromoCodeFormValues = z.infer<typeof promoCodeFormSchema>;
export type PromoCodeFormInput = z.input<typeof promoCodeFormSchema>;

// ────────────────────────────────────────────────────────────
// 折抵預覽（pure；Phase 5c admin 預覽用、Phase 7a 前台兌換也會引用）
// ────────────────────────────────────────────────────────────

export type PromoCodePreview = {
  // 從 DB 撈出的 PromoCode 必要欄位（不需整個 model）
  discountType: DiscountType;
  discountValue: number;
  minSubtotal: number;
  maxUses: number | null;
  usedCount: number;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
};

export type DiscountResult =
  | { ok: true; discount: number; finalTotal: number }
  | { ok: false; reason: string };

/**
 * 計算優惠碼對 subtotal 的折抵金額（純函式，不寫 DB）。
 * 規則：
 *   - 失效檢查：isActive / 時間範圍 / minSubtotal / 使用上限
 *   - PERCENT：subtotal × discountValue / 100，無條件捨去
 *   - FIXED：固定折扣，但不能超過 subtotal 本身（避免負數總額）
 *   - finalTotal = subtotal - discount，保證 ≥ 0
 */
export function previewDiscount(
  subtotal: number,
  promo: PromoCodePreview,
  now: Date = new Date(),
): DiscountResult {
  if (!promo.isActive) return { ok: false, reason: "此優惠碼已停用" };
  if (promo.startsAt && now < promo.startsAt) {
    return { ok: false, reason: "此優惠碼尚未開始" };
  }
  if (promo.endsAt && now > promo.endsAt) {
    return { ok: false, reason: "此優惠碼已過期" };
  }
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
    return { ok: false, reason: "此優惠碼已達使用上限" };
  }
  if (subtotal < promo.minSubtotal) {
    return {
      ok: false,
      reason: `最低消費 NT$ ${promo.minSubtotal.toLocaleString("zh-TW")}`,
    };
  }

  let discount: number;
  if (promo.discountType === "PERCENT") {
    discount = Math.floor((subtotal * promo.discountValue) / 100);
  } else {
    discount = Math.min(promo.discountValue, subtotal);
  }
  const finalTotal = Math.max(0, subtotal - discount);
  return { ok: true, discount, finalTotal };
}

/**
 * 給後台列表顯示用的「狀態 tag」。
 *   ACTIVE：可用（isActive=true + 時間範圍內 + 使用次數未達上限）
 *   SCHEDULED：未開始（isActive=true 但 startsAt > now）
 *   EXPIRED：已過期（endsAt < now）
 *   EXHAUSTED：使用次數用完
 *   DISABLED：isActive=false
 */
export type PromoCodeStatus =
  | "ACTIVE"
  | "SCHEDULED"
  | "EXPIRED"
  | "EXHAUSTED"
  | "DISABLED";

export function getPromoCodeStatus(
  promo: PromoCodePreview,
  now: Date = new Date(),
): PromoCodeStatus {
  if (!promo.isActive) return "DISABLED";
  if (promo.endsAt && now > promo.endsAt) return "EXPIRED";
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) return "EXHAUSTED";
  if (promo.startsAt && now < promo.startsAt) return "SCHEDULED";
  return "ACTIVE";
}
