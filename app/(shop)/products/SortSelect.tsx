"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const SORT_OPTIONS = [
  { value: "recommended", label: "排序 · 主理人推薦" },
  { value: "price-asc", label: "排序 · 價格 低 → 高" },
  { value: "price-desc", label: "排序 · 價格 高 → 低" },
  { value: "roast-asc", label: "排序 · 烘焙度 淺 → 深" },
  { value: "newest", label: "排序 · 最新到貨" },
];

export function SortSelect({ current }: { current: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams);
    if (e.target.value === "recommended") {
      params.delete("sort");
    } else {
      params.set("sort", e.target.value);
    }
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/products?${qs}` : "/products");
    });
  };

  return (
    <select
      value={current}
      onChange={onChange}
      disabled={isPending}
      className="cursor-pointer border border-border bg-surface px-3.5 py-2.5 font-mono text-[11px] tracking-[0.12em] text-fg disabled:opacity-60"
    >
      {SORT_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
