// Phase 6 — 共用付款型別
// initiatePayment 統一回三種結果：
//   redirect — 把 user 導到一個 URL（ECPay 走我們自己的 processing 頁，LINE Pay 走 paymentUrl）
//   manual   — 沒有外部 gateway（BANK_TRANSFER / COD），直接顯示訂單詳情
//   error    — 失敗

export type InitiatePaymentResult =
  | { ok: true; kind: "redirect"; url: string }
  | { ok: true; kind: "manual" }
  | { ok: false; error: string };

export interface PaymentCallbackOutcome {
  status: "PAID" | "FAILED";
  tradeNo?: string;
  reason?: string;
}
