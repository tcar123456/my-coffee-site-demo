"use client";

// Phase 3b — Payment step：付款方式 radio + 確認下單
// 整個 client island 包含 paymentMethod state + placeOrder 呼叫，
// 因為下單需要把當前選擇的 payment 一起送出。

import { useState, useTransition } from "react";
import { placeOrder } from "@/app/actions/checkout";
import { initiatePayment } from "@/app/actions/payment";
import {
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
  type ShippingMethod,
} from "@/lib/shipping";

const METHOD_KEYS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

const METHOD_DESCRIPTIONS: Record<PaymentMethod, string> = {
  CREDIT_CARD: "支援 VISA / MasterCard / JCB，下單後導向綠界刷卡頁。",
  LINE_PAY: "以 LINE Pay 帳戶完成付款。",
  BANK_TRANSFER: "下單後寄送匯款帳戶；3 日內完成轉帳。",
  COD: "貨到付款，現金支付給配送員。",
};

export function PlaceOrderButton({
  addressId,
  shippingMethod,
  promoCode,
}: {
  addressId: string;
  shippingMethod: ShippingMethod;
  promoCode?: string | null;
}) {
  const [method, setMethod] = useState<PaymentMethod>("CREDIT_CARD");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const placed = await placeOrder({
        addressId,
        shippingMethod,
        paymentMethod: method,
        // 僅在有實際 code 時帶入，避免送空字串觸發 schema 驗證歧義
        ...(promoCode ? { promoCode } : {}),
      });
      if (!placed.ok) {
        setError(placed.error);
        return;
      }
      // 訂單已建（status PENDING）→ 立刻啟動付款流程
      const initiated = await initiatePayment(placed.orderNumber);
      // 統一用 window.location.href 做 hard navigate：
      // 1) 避免 client router push + refresh 在 dev tunnel 下的 race
      // 2) BANK_TRANSFER / COD 跨 layout chain（/checkout → /account），hard reload 確保新 layout 的 server work 都跑
      const target =
        initiated.ok && initiated.kind === "redirect"
          ? initiated.url
          : `/account/orders/${placed.orderNumber}`;
      window.location.href = target;
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {METHOD_KEYS.map((key) => {
        const selected = method === key;
        return (
          <label
            key={key}
            className={`flex cursor-pointer items-start gap-4 border p-5 transition-all duration-200 ${
              selected
                ? "border-accent bg-surface-2"
                : "border-border bg-surface hover:border-border-hi"
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value={key}
              checked={selected}
              onChange={() => setMethod(key)}
              disabled={isPending}
              className="mt-1.5 size-4 accent-accent"
            />
            <div className="flex-1">
              <span className="font-serif text-[18px]">
                {PAYMENT_METHOD_LABELS[key]}
              </span>
              <p className="mt-1.5 text-[13px] leading-[1.55] text-muted">
                {METHOD_DESCRIPTIONS[key]}
              </p>
            </div>
          </label>
        );
      })}

      {error && (
        <div className="border border-danger/40 bg-danger/10 px-4 py-3 font-mono text-[12px] text-danger">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending}
        className="mt-4 inline-flex items-center justify-center gap-2.5 border border-accent bg-accent px-[22px] py-4 font-mono text-[12px] font-semibold tracking-[0.16em] text-bg uppercase transition-all duration-200 hover:border-accent-hi hover:bg-accent-hi disabled:cursor-wait disabled:opacity-60"
      >
        {isPending ? "建立訂單中…" : "確認下單 →"}
      </button>
    </div>
  );
}
