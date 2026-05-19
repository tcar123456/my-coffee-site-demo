"use client";

// Phase 5a — 訂單詳情狀態操作（client）
// 直接呼叫 server action updateOrderStatus。Next.js 16 + React 19 允許 server action
// 從 client component 直接 import。成功靠 server action 內的 revalidatePath 觸發
// router cache 失效，這裡再 router.refresh() 強制重新拉 server component 結果。

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOrderStatus, confirmManualPayment } from "@/app/actions/admin-orders";
import {
  forwardActionLabel,
  nextForwardStatus,
  canCancel,
} from "@/lib/order-state";
import type { OrderStatus, PaymentMethod } from "@/generated/prisma/enums";

const MANUAL_PAYMENT_METHODS: PaymentMethod[] = ["BANK_TRANSFER", "COD"];

export function StatusActions({
  orderNumber,
  status,
  paymentMethod,
}: {
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const next = nextForwardStatus(status);
  const nextLabel = forwardActionLabel(status);
  const cancellable = canCancel(status);
  const canConfirmManual =
    status === "PENDING" && MANUAL_PAYMENT_METHODS.includes(paymentMethod);

  const run = (target: OrderStatus, confirmMsg?: string) => {
    setError(null);
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    startTransition(async () => {
      const result = await updateOrderStatus(orderNumber, target);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  const runManualPayment = () => {
    setError(null);
    const label =
      paymentMethod === "BANK_TRANSFER" ? "已收到匯款" : "已收到貨款（COD）";
    if (!window.confirm(`確認 ${label}？將把訂單狀態改為「已付款」。`)) return;
    startTransition(async () => {
      const result = await confirmManualPayment(orderNumber);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  if (!next && !cancellable && !canConfirmManual) {
    return (
      <p className="font-mono text-[11px] tracking-[0.08em] text-muted">
        此訂單已達終態，沒有可用的狀態操作。
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {canConfirmManual && (
        <button
          type="button"
          onClick={runManualPayment}
          disabled={isPending}
          className={`inline-flex items-center justify-center gap-2.5 border border-success bg-success px-[22px] py-3.5 font-mono text-[12px] font-semibold tracking-[0.18em] uppercase text-bg transition-all duration-200 hover:opacity-90 ${
            isPending ? "opacity-50" : ""
          }`}
        >
          {isPending
            ? "處理中…"
            : paymentMethod === "BANK_TRANSFER"
              ? "✓ 確認收到匯款 →"
              : "✓ 確認收到貨款 →"}
        </button>
      )}

      {next && nextLabel && (
        <button
          type="button"
          onClick={() => run(next)}
          disabled={isPending}
          className={`inline-flex items-center justify-center gap-2.5 border border-accent bg-accent px-[22px] py-3.5 font-mono text-[12px] font-semibold tracking-[0.18em] uppercase text-bg transition-all duration-200 hover:border-accent-hi hover:bg-accent-hi ${
            isPending ? "opacity-50" : ""
          }`}
        >
          {isPending ? "處理中…" : `${nextLabel} →`}
        </button>
      )}

      {cancellable && (
        <button
          type="button"
          onClick={() =>
            run(
              "CANCELLED",
              "取消後將無法恢復，且若訂單尚未出貨會把商品數量回補到庫存。確定要取消這筆訂單嗎？",
            )
          }
          disabled={isPending}
          className={`inline-flex items-center justify-center gap-2.5 border border-danger bg-transparent px-[22px] py-3.5 font-mono text-[12px] tracking-[0.18em] uppercase text-danger transition-all duration-200 hover:bg-danger hover:text-bg ${
            isPending ? "opacity-50" : ""
          }`}
        >
          取消訂單
        </button>
      )}

      {error && (
        <p className="font-mono text-[11px] tracking-[0.04em] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
