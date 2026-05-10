// Phase 3a — 研磨 / 包裝選項死資料
// CartItem.grind / pkg 存 value（stable key），UI 顯示時 lookup label。
// 若未來新增選項只要在這裡加，schema 不用動。

export const GRIND_OPTIONS = [
  { value: "WHOLE", label: "全豆" },
  { value: "MEDIUM_COARSE", label: "中粗 · 手沖" },
  { value: "FINE", label: "細 · 義式" },
] as const;

export const PKG_OPTIONS = [
  { value: "SINGLE_200", label: "單包 200g" },
  { value: "GIFT_DUAL_200", label: "禮盒 200g × 2" },
] as const;

export type GrindValue = (typeof GRIND_OPTIONS)[number]["value"];
export type PkgValue = (typeof PKG_OPTIONS)[number]["value"];

export const DEFAULT_GRIND: GrindValue = "MEDIUM_COARSE";
export const DEFAULT_PKG: PkgValue = "SINGLE_200";

export function getGrindLabel(value: string | null | undefined): string {
  if (!value) return GRIND_OPTIONS.find((o) => o.value === DEFAULT_GRIND)!.label;
  return GRIND_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function getPkgLabel(value: string | null | undefined): string {
  if (!value) return PKG_OPTIONS.find((o) => o.value === DEFAULT_PKG)!.label;
  return PKG_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function isValidGrind(value: unknown): value is GrindValue {
  return typeof value === "string" && GRIND_OPTIONS.some((o) => o.value === value);
}

export function isValidPkg(value: unknown): value is PkgValue {
  return typeof value === "string" && PKG_OPTIONS.some((o) => o.value === value);
}
