"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markOrderPaid } from "@/app/actions/checkout";

export function PayMockButton({ orderNumber }: { orderNumber: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      const result = await markOrderPaid(orderNumber);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error ?? "付款失敗，請稍後再試。");
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={`inline-flex items-center justify-center gap-2.5 border border-warn bg-transparent px-[22px] py-3.5 font-mono text-[12px] font-semibold tracking-[0.18em] uppercase text-warn transition-all duration-200 hover:bg-warn hover:text-bg ${
          isPending ? "opacity-50" : ""
        }`}
      >
        {isPending ? "處理中…" : "測試付款（DEV）→"}
      </button>
      <p className="font-mono text-[10px] tracking-[0.08em] text-muted">
        production 環境會自動隱藏。此按鈕僅將狀態改為 PAID，不會實際扣款。
      </p>
      {error && (
        <p className="font-mono text-[11px] text-danger">{error}</p>
      )}
    </div>
  );
}
