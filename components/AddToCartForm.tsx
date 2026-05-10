"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addToCart } from "@/app/actions/cart";
import { useCartStore } from "@/lib/cart-store";
import {
  GRIND_OPTIONS,
  PKG_OPTIONS,
  DEFAULT_GRIND,
  DEFAULT_PKG,
  type GrindValue,
  type PkgValue,
} from "@/lib/cart-options";

const MAX_QTY = 99;

type Props = {
  productId: string;
  isLoggedIn: boolean;
  maxStock: number;
};

export function AddToCartForm({ productId, isLoggedIn, maxStock }: Props) {
  const [grind, setGrind] = useState<GrindValue>(DEFAULT_GRIND);
  const [pkg, setPkg] = useState<PkgValue>(DEFAULT_PKG);
  const [qty, setQty] = useState(1);
  const [feedback, setFeedback] = useState<
    { type: "success" | "error"; msg: string } | null
  >(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const addLocal = useCartStore((s) => s.add);

  const cap = Math.min(MAX_QTY, Math.max(1, maxStock));
  const dec = () => setQty((q) => Math.max(1, q - 1));
  const inc = () => setQty((q) => Math.min(cap, q + 1));

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);

    if (isLoggedIn) {
      startTransition(async () => {
        const res = await addToCart({ productId, qty, grind, pkg });
        if (res.ok) {
          setFeedback({ type: "success", msg: `已加入購物車 · ${qty} 件` });
          router.refresh();
        } else {
          setFeedback({ type: "error", msg: res.error });
        }
      });
    } else {
      addLocal({ productId, qty, grind, pkg });
      setFeedback({ type: "success", msg: `已加入購物車 · ${qty} 件` });
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {/* Grind chips */}
      <fieldset>
        <legend className="mb-2.5 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">
          研磨
        </legend>
        <div className="flex flex-wrap gap-2">
          {GRIND_OPTIONS.map((o) => {
            const selected = grind === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => setGrind(o.value)}
                aria-pressed={selected}
                className={`border px-3.5 py-2 font-mono text-[11px] tracking-[0.08em] transition-colors ${
                  selected
                    ? "border-accent bg-accent text-bg"
                    : "border-border bg-surface text-fg-2 hover:border-accent hover:text-accent"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Pkg chips */}
      <fieldset>
        <legend className="mb-2.5 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">
          包裝
        </legend>
        <div className="flex flex-wrap gap-2">
          {PKG_OPTIONS.map((o) => {
            const selected = pkg === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => setPkg(o.value)}
                aria-pressed={selected}
                className={`border px-3.5 py-2 font-mono text-[11px] tracking-[0.08em] transition-colors ${
                  selected
                    ? "border-accent bg-accent text-bg"
                    : "border-border bg-surface text-fg-2 hover:border-accent hover:text-accent"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Qty + CTA */}
      <div className="flex flex-wrap items-end gap-5">
        <div>
          <div className="mb-2.5 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">
            數量
          </div>
          <div className="flex border border-border">
            <button
              type="button"
              aria-label="減少數量"
              onClick={dec}
              disabled={qty <= 1}
              className="h-11 w-11 border-r border-border text-fg-2 transition-colors hover:text-accent disabled:opacity-40"
            >
              −
            </button>
            <span className="flex w-14 items-center justify-center font-mono text-[14px] tabular-nums text-fg">
              {qty}
            </span>
            <button
              type="button"
              aria-label="增加數量"
              onClick={inc}
              disabled={qty >= cap}
              className="h-11 w-11 border-l border-border text-fg-2 transition-colors hover:text-accent disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-11 items-center gap-2.5 border border-accent bg-accent px-[22px] font-mono text-[12px] font-semibold tracking-[0.16em] uppercase text-bg transition-all duration-200 hover:border-accent-hi hover:bg-accent-hi disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "加入中…" : "加入購物車"}
        </button>
      </div>

      {feedback && (
        <div
          role={feedback.type === "error" ? "alert" : "status"}
          className={`border px-4 py-3 font-mono text-[12px] ${
            feedback.type === "success"
              ? "border-accent-tint bg-[oklch(20%_0.04_70)] text-accent"
              : "border-[oklch(45%_0.12_25)] bg-[oklch(20%_0.04_25)] text-[oklch(75%_0.12_25)]"
          }`}
        >
          {feedback.msg}
        </div>
      )}
    </form>
  );
}
