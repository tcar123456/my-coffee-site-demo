"use client";

// Phase 8c — 「建立物流單」按鈕（client island）
// 呼叫 createShipmentForOrder server action。
// PAID + logisticsId === null 才會被父 server component render。

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createShipmentForOrder } from "@/app/actions/admin-logistics";

export function CreateShipmentButton({ orderNumber }: { orderNumber: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleClick = () => {
    if (
      !window.confirm(
        "確認向綠界 sandbox 建立物流單？建立後物流編號將寫入訂單且不可重複建單。",
      )
    ) {
      return;
    }
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await createShipmentForOrder(orderNumber);
      if (result.ok) {
        setSuccess(`物流單已建立 · ${result.logisticsId}`);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={`inline-flex items-center justify-center gap-2.5 border border-accent bg-accent px-[22px] py-3.5 font-mono text-[12px] font-semibold tracking-[0.18em] uppercase text-bg transition-all duration-200 hover:border-accent-hi hover:bg-accent-hi ${
          isPending ? "opacity-50" : ""
        }`}
      >
        {isPending ? "建立中…" : "建立物流單 →"}
      </button>
      {success && (
        <p className="font-mono text-[11px] tracking-[0.04em] text-success">
          ✓ {success}
        </p>
      )}
      {error && (
        <p className="font-mono text-[11px] tracking-[0.04em] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
