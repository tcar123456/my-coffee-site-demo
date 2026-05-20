"use client";

// Phase 7a — 優惠碼輸入 client island
// 用 URL searchParams (?promo=CODE) 作為 source of truth，避免再開一個 client state；
// server component 直接在 page.tsx 用 applyPromoCode(searchParams.promo) 試算，
// 結果（appliedCode / error）回灌進來顯示。

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function PromoForm({
  appliedCode,
  error,
}: {
  appliedCode: string | null;
  error: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();

  const buildHref = (promo: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (promo) params.set("promo", promo);
    else params.delete("promo");
    return `/checkout/payment?${params.toString()}`;
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    const code = input.trim().toUpperCase();
    if (!code) return;
    startTransition(() => {
      router.push(buildHref(code));
    });
  };

  const handleRemove = () => {
    setInput("");
    startTransition(() => {
      router.push(buildHref(null));
    });
  };

  return (
    <div className="border border-border bg-surface p-5">
      <div className="mb-3.5 font-mono text-[10px] tracking-[0.18em] uppercase text-accent">
        優惠碼
      </div>

      {appliedCode ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[18px]">已套用 {appliedCode}</div>
            <div className="mt-1 font-mono text-[11px] tracking-[0.04em] text-muted">
              下方明細已扣抵
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            className="font-mono text-[11px] tracking-[0.16em] uppercase text-muted transition-colors hover:text-danger disabled:opacity-40"
          >
            移除
          </button>
        </div>
      ) : (
        <form onSubmit={handleApply} className="flex flex-col gap-2">
          <div className="flex gap-2 max-[480px]:flex-col">
            <input
              type="text"
              name="promoCode"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="輸入優惠碼"
              disabled={isPending}
              autoComplete="off"
              className="flex-1 border border-border bg-surface px-3.5 py-2.5 font-mono text-[13px] tracking-[0.04em] text-fg uppercase placeholder:text-muted placeholder:normal-case focus:border-accent focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isPending || input.trim().length === 0}
              className="border border-accent bg-transparent px-5 py-2.5 font-mono text-[12px] tracking-[0.16em] text-accent uppercase transition-all duration-200 hover:bg-accent-tint disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPending ? "套用中…" : "套用"}
            </button>
          </div>
          {error && (
            <div className="font-mono text-[11px] tracking-[0.04em] text-danger">
              {error}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
