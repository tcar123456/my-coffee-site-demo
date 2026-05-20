"use client";

// Phase 8b — 超商選店 modal（Mock 版）
// 列出 lib/logistics/store-mock.ts 的 5 間 fake 店（依 chain 過濾），讓 user 點選。
// 不真接綠界 StoreMap（決議 2026-05-20）：跨網域 + dev tunnel + cart-empty 守門等踩坑成本高。
// design 對齊 admin modal 風格：固定置中、半透明黑幕、border-border bg-surface。

import { useEffect, useRef } from "react";
import { getStoresByChain } from "@/lib/logistics/store-mock";
import type { MockStore } from "@/lib/logistics/types";
import { useFocusTrap } from "@/lib/use-focus-trap";

export interface PickedStore {
  storeId: string;
  storeName: string;
  storeAddress: string;
}

export function StorePickerDialog({
  open,
  chain,
  onPick,
  onClose,
}: {
  open: boolean;
  chain: MockStore["chain"];
  onPick: (store: PickedStore) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open);

  // ESC 關閉
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const stores = getStoresByChain(chain);
  const chainLabel = chain === "UNIMART" ? "7-11" : "全家";
  const titleId = "store-picker-title";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-[520px] border border-border bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-baseline justify-between border-b border-border px-6 py-5">
          <div>
            <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-accent">
              選擇門市
            </div>
            <h2 id={titleId} className="mt-1 text-[22px] leading-tight">
              {chainLabel} 取貨門市
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="font-mono text-[14px] text-muted transition-colors hover:text-accent"
          >
            ×
          </button>
        </header>

        <ul className="max-h-[60vh] overflow-y-auto">
          {stores.map((s) => (
            <li key={s.storeId}>
              <button
                type="button"
                onClick={() =>
                  onPick({
                    storeId: s.storeId,
                    storeName: s.storeName,
                    storeAddress: s.address,
                  })
                }
                className="grid w-full grid-cols-[1fr_auto] items-center gap-3 border-b border-border px-6 py-4 text-left transition-colors hover:bg-surface-2"
              >
                <div>
                  <div className="text-[15px] leading-tight">
                    {s.storeName}
                  </div>
                  <div className="mt-1 font-mono text-[11px] leading-[1.5] text-fg-2">
                    {s.address}
                  </div>
                  <div className="mt-1 font-mono text-[10px] tracking-[0.16em] uppercase text-muted">
                    Store · {s.storeId}
                  </div>
                </div>
                <span className="font-mono text-[11px] tracking-[0.16em] uppercase text-accent">
                  選此店 →
                </span>
              </button>
            </li>
          ))}
        </ul>

        <footer className="border-t border-border px-6 py-3 font-mono text-[10px] tracking-[0.04em] leading-[1.6] text-muted">
          示範用 fake 門市資料，真實上線需串綠界電子地圖 StoreMap
        </footer>
      </div>
    </div>
  );
}
