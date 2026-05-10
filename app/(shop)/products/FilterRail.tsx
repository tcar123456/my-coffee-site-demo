"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

type FilterGroup = {
  key: "origin" | "roast" | "processing";
  title: string;
  options: { value: string; label: string; count: number }[];
};

type Props = {
  groups: FilterGroup[];
  initial: {
    origin: string[];
    roast: string[];
    processing: string[];
    minPrice?: string;
    maxPrice?: string;
    sort?: string;
  };
};

export function FilterRail({ groups, initial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [origin, setOrigin] = useState<string[]>(initial.origin);
  const [roast, setRoast] = useState<string[]>(initial.roast);
  const [processing, setProcessing] = useState<string[]>(initial.processing);
  const [minPrice, setMinPrice] = useState(initial.minPrice ?? "");
  const [maxPrice, setMaxPrice] = useState(initial.maxPrice ?? "");

  const toggle = (
    state: string[],
    setter: (next: string[]) => void,
    value: string,
  ) => {
    setter(state.includes(value) ? state.filter((v) => v !== value) : [...state, value]);
  };

  const apply = () => {
    const params = new URLSearchParams();
    origin.forEach((v) => params.append("origin", v));
    roast.forEach((v) => params.append("roast", v));
    processing.forEach((v) => params.append("processing", v));
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (initial.sort) params.set("sort", initial.sort); // 保留排序
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/products?${qs}` : "/products");
    });
  };

  const reset = () => {
    setOrigin([]);
    setRoast([]);
    setProcessing([]);
    setMinPrice("");
    setMaxPrice("");
    startTransition(() => {
      router.push(initial.sort ? `/products?sort=${initial.sort}` : "/products");
    });
  };

  const stateMap: Record<FilterGroup["key"], { value: string[]; setter: (v: string[]) => void }> = {
    origin: { value: origin, setter: setOrigin },
    roast: { value: roast, setter: setRoast },
    processing: { value: processing, setter: setProcessing },
  };

  const hasFilters =
    origin.length > 0 ||
    roast.length > 0 ||
    processing.length > 0 ||
    minPrice !== "" ||
    maxPrice !== "";

  return (
    <aside className="sticky top-20 max-[900px]:static">
      {groups.map((group, i) => {
        const { value, setter } = stateMap[group.key];
        return (
          <div
            key={group.key}
            className={`border-b border-border py-[22px] ${i === 0 ? "pt-0" : ""}`}
          >
            <div className="mb-3.5 flex items-center justify-between font-mono text-[11px] tracking-[0.18em] uppercase text-accent">
              <span>{group.title}</span>
              <span className="text-[10px] text-muted">
                {group.options.reduce((s, o) => s + o.count, 0)}
              </span>
            </div>
            {group.options.map((opt) => {
              const checked = value.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center justify-between py-[7px] text-[13px] text-fg-2 transition-colors hover:text-accent"
                >
                  <span className="flex flex-1 items-center">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(value, setter, opt.value)}
                      className="mr-2.5 accent-accent"
                    />
                    {opt.label}
                  </span>
                  <span className="font-mono text-[11px] text-muted">
                    {opt.count}
                  </span>
                </label>
              );
            })}
          </div>
        );
      })}

      {/* 風味調性 — Phase 3a 暫不接，flavorNotes 是自由字串、需 Phase 5 改 tag 後才能篩 */}
      <div className="border-b border-border py-[22px]">
        <div className="mb-3.5 flex items-center justify-between font-mono text-[11px] tracking-[0.18em] uppercase text-muted">
          <span>風味調性</span>
          <span className="text-[10px] text-muted">—</span>
        </div>
        {["花香 / 果汁感", "巧克力 / 堅果", "酒香 / 發酵感", "菸草 / 木質"].map((label) => (
          <label
            key={label}
            className="flex cursor-not-allowed items-center justify-between py-[7px] text-[13px] text-dim"
            title="Phase 5 起開放，等商品改用標籤後可篩"
          >
            <span className="flex flex-1 items-center">
              <input type="checkbox" disabled className="mr-2.5 accent-accent" />
              {label}
            </span>
          </label>
        ))}
      </div>

      <div className="border-b border-border py-[22px]">
        <div className="mb-3.5 flex items-center justify-between font-mono text-[11px] tracking-[0.18em] uppercase text-accent">
          <span>價格 NT$</span>
          <span className="text-[10px] text-muted">—</span>
        </div>
        <div className="mt-1 flex gap-2.5">
          <input
            type="number"
            placeholder="最低"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="w-1/2 border border-border bg-surface px-2.5 py-2 font-mono text-[11px] text-fg"
          />
          <input
            type="number"
            placeholder="最高"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-1/2 border border-border bg-surface px-2.5 py-2 font-mono text-[11px] text-fg"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <Button onClick={apply} disabled={isPending} variant="ghost" block>
          {isPending ? "套用中…" : "套用篩選"}
        </Button>
        {hasFilters && (
          <button
            type="button"
            onClick={reset}
            disabled={isPending}
            className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted hover:text-accent disabled:opacity-40"
          >
            清除全部
          </button>
        )}
      </div>
    </aside>
  );
}
