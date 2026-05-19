// Phase 5a — 訂單狀態機（賣家後台用）
// 前進規則：PENDING → PAID → SHIPPED → DELIVERED（線性、相鄰）
// 取消規則：任一非 CANCELLED 狀態 → CANCELLED
// 庫存回補：僅當 PENDING / PAID → CANCELLED 才回補。
//   理由：placeOrder 在訂單建立瞬間（PENDING）就已扣庫存；訂單轉 SHIPPED 後豆子已出倉，
//   即使賣家後續勾選「取消」也視為退貨流程，不該回頭加庫存。

import type { OrderStatus } from "@/generated/prisma/enums";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "待付款",
  PAID: "已付款",
  SHIPPED: "已出貨",
  DELIVERED: "已送達",
  CANCELLED: "已取消",
};

const FORWARD_NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING: "PAID",
  PAID: "SHIPPED",
  SHIPPED: "DELIVERED",
};

const FORWARD_LABEL: Partial<Record<OrderStatus, string>> = {
  PENDING: "標記為已付款",
  PAID: "標記為已出貨",
  SHIPPED: "標記為已送達",
};

/**
 * 從目前狀態可以推進到的下一個（單一）狀態。回 null 代表終態或已取消。
 */
export function nextForwardStatus(status: OrderStatus): OrderStatus | null {
  return FORWARD_NEXT[status] ?? null;
}

export function forwardActionLabel(status: OrderStatus): string | null {
  return FORWARD_LABEL[status] ?? null;
}

/**
 * 取消是否合法：DELIVERED 視為終態（已送達顧客手上 = 走退貨流程，不在此 phase 範圍），
 * 已取消當然也不能再取消。其他狀態都允許。
 */
export function canCancel(status: OrderStatus): boolean {
  return status !== "CANCELLED" && status !== "DELIVERED";
}

/**
 * 整體合法轉移檢查：給定 prev → next 是否合法。
 * - 前進路徑只允許相鄰
 * - 取消只允許 PENDING / PAID / SHIPPED → CANCELLED
 */
export function isAllowedTransition(prev: OrderStatus, next: OrderStatus): boolean {
  if (prev === next) return false;
  if (next === "CANCELLED") return canCancel(prev);
  return FORWARD_NEXT[prev] === next;
}

/**
 * 取消時是否該把 OrderItem.qty 回補到 Product.stock。
 * PENDING / PAID → CANCELLED 回補；SHIPPED → CANCELLED 視為已出倉，不回補。
 */
export function shouldRestoreStockOnCancel(prev: OrderStatus): boolean {
  return prev === "PENDING" || prev === "PAID";
}
