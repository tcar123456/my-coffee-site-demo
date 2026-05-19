"use client";

// Phase 6d — 對 PENDING + CREDIT_CARD/LINE_PAY 訂單的「前往付款 / 重新付款」按鈕
// 取代了 Phase 3b 的 dev-only PayMockButton。直接呼叫 initiatePayment，沿用 PlaceOrderButton 的分派邏輯。

import { useState, useTransition } from "react";
import { initiatePayment } from "@/app/actions/payment";

export function RetryPaymentButton({ orderNumber }: { orderNumber: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      const result = await initiatePayment(orderNumber);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.kind === "redirect") {
        window.location.href = result.url;
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={`inline-flex items-center justify-center gap-2.5 border border-accent bg-accent px-[22px] py-3.5 font-mono text-[12px] font-semibold tracking-[0.16em] uppercase text-bg transition-all duration-200 hover:border-accent-hi hover:bg-accent-hi ${
          isPending ? "opacity-50" : ""
        }`}
      >
        {isPending ? "前往付款頁…" : "前往付款 →"}
      </button>
      {error && (
        <p className="font-mono text-[11px] text-danger">{error}</p>
      )}
    </div>
  );
}
