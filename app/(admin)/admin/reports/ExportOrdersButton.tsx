"use client";

// Phase 5d — 訂單 CSV 匯出按鈕（client）
// 呼叫 exportOrdersCsv server action 拿到 { filename, content }，
// 在 client 端用 Blob + URL.createObjectURL + 模擬 anchor click 觸發瀏覽器下載。
// 不需要新開 /api/ route。

import { useState, useTransition } from "react";
import { exportOrdersCsv } from "@/app/actions/admin-export";

export function ExportOrdersButton() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      const result = await exportOrdersCsv({});
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const blob = new Blob([result.content], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // 釋放 ObjectURL（給 GC 機會回收 blob）
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-2.5 border border-border-hi bg-transparent px-[22px] py-3 font-mono text-[12px] tracking-[0.16em] uppercase text-fg transition-colors duration-200 hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "匯出中…" : "下載訂單 CSV ↓"}
      </button>
      {error && (
        <span
          role="alert"
          className="font-mono text-[10px] tracking-[0.04em] text-danger"
        >
          ✗ {error}
        </span>
      )}
    </div>
  );
}
