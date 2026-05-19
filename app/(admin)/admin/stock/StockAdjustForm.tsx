"use client";

// Phase 5a — 庫存補貨 inline 表單（client）
// 直接 call server action adjustStock；用 useTransition 處理 pending state，
// 之所以選 useTransition 而非自製 isLoading state：
//   1. action 已 revalidatePath，React 在 transition 結束前能銜接路由更新
//   2. 同步保留 input 可編輯狀態（非 transition pending 時不會 block 輸入）
//   3. useTransition 提供 isPending 旗標，不用自己 try/finally 管理

import { useState, useTransition } from "react";
import { adjustStock } from "@/app/actions/admin-stock";

type FeedbackTone = "success" | "error" | null;

type Feedback = {
  tone: FeedbackTone;
  message: string;
};

export function StockAdjustForm({
  productId,
  initialStock,
}: {
  productId: string;
  initialStock: number;
}) {
  const [value, setValue] = useState<string>(String(initialStock));
  const [currentStock, setCurrentStock] = useState<number>(initialStock);
  const [feedback, setFeedback] = useState<Feedback>({ tone: null, message: "" });
  const [isPending, startTransition] = useTransition();

  const trimmed = value.trim();
  const parsed = Number(trimmed);
  const isValidNumber =
    trimmed !== "" &&
    Number.isInteger(parsed) &&
    parsed >= 0 &&
    parsed <= 99_999;
  const isDirty = isValidNumber && parsed !== currentStock;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValidNumber || !isDirty || isPending) return;

    setFeedback({ tone: null, message: "" });
    startTransition(async () => {
      const result = await adjustStock({ productId, nextStock: parsed });
      if (result.ok) {
        setCurrentStock(result.nextStock);
        setValue(String(result.nextStock));
        setFeedback({
          tone: "success",
          message: `已更新為 ${result.nextStock} 包。`,
        });
      } else {
        setFeedback({ tone: "error", message: result.error });
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col items-end gap-1.5"
    >
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor={`stock-${productId}`}>
          庫存數量
        </label>
        <input
          id={`stock-${productId}`}
          type="number"
          inputMode="numeric"
          min={0}
          max={99_999}
          step={1}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (feedback.tone) setFeedback({ tone: null, message: "" });
          }}
          disabled={isPending}
          className="w-[88px] border border-border bg-bg px-3 py-2 text-right font-mono text-[13px] tabular-nums text-fg focus:border-accent focus:outline-none disabled:opacity-60"
          aria-invalid={!isValidNumber}
        />
        <button
          type="submit"
          disabled={!isValidNumber || !isDirty || isPending}
          className="inline-flex items-center border border-accent bg-accent px-3.5 py-2 font-mono text-[11px] tracking-[0.14em] uppercase text-bg transition-colors hover:border-accent-hi hover:bg-accent-hi disabled:cursor-not-allowed disabled:border-border disabled:bg-transparent disabled:text-muted"
        >
          {isPending ? "儲存中…" : "儲存"}
        </button>
      </div>
      {feedback.tone === "success" && (
        <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-success">
          ✓ {feedback.message}
        </span>
      )}
      {feedback.tone === "error" && (
        <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-danger">
          ✗ {feedback.message}
        </span>
      )}
      {feedback.tone === null && !isValidNumber && trimmed !== "" && (
        <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-danger">
          0 ~ 99999 整數
        </span>
      )}
    </form>
  );
}
