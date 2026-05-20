// Phase 3b — 配送費計算（純函式 + 死資料）
// Phase 7c 決議：維持單階免運（≥ NT$ 1,200 免運），不引入多階；
// 把常數仍維持 export 方便未來覆寫，但不引入賣家後台 CRUD（over-engineering for 作品集）。

export const SHIPPING_METHOD_LABELS = {
  CVS_711: "7-11 取貨",
  CVS_FAMILY: "全家取貨",
  HOME_DELIVERY: "宅配到府",
} as const;

export type ShippingMethod = keyof typeof SHIPPING_METHOD_LABELS;

export const SHIPPING_FEES: Record<ShippingMethod, number> = {
  CVS_711: 60,
  CVS_FAMILY: 60,
  HOME_DELIVERY: 100,
};

export const FREE_SHIPPING_THRESHOLD = 1200;

export function calculateShipping(
  subtotal: number,
  method: ShippingMethod,
): number {
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  return SHIPPING_FEES[method];
}

export function isShippingMethod(value: string): value is ShippingMethod {
  return value in SHIPPING_FEES;
}

export const PAYMENT_METHOD_LABELS = {
  CREDIT_CARD: "信用卡",
  LINE_PAY: "LINE Pay",
  BANK_TRANSFER: "ATM 轉帳",
  COD: "貨到付款",
} as const;

export type PaymentMethod = keyof typeof PAYMENT_METHOD_LABELS;

export function isPaymentMethod(value: string): value is PaymentMethod {
  return value in PAYMENT_METHOD_LABELS;
}
