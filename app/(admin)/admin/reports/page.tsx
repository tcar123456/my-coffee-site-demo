// Phase 5d — 後台報表頁
// 簡化版：只做營收趨勢 + 訂單 CSV 匯出（商品銷量 / 客戶分析 留之後）
// range chips 走 URL searchParams，避免 client state 與 SSR 不一致。

import Link from "next/link";
import { getRevenueTrend, summarizeRevenue } from "@/lib/reports";
import { RevenueChart } from "./RevenueChart";
import { ExportOrdersButton } from "./ExportOrdersButton";

const RANGES = [
  { value: 7, label: "近 7 日" },
  { value: 30, label: "近 30 日" },
  { value: 90, label: "近 90 日" },
] as const;

type RangeValue = (typeof RANGES)[number]["value"];

function parseRange(raw: string | undefined): RangeValue {
  const n = Number.parseInt(raw ?? "30", 10);
  if (n === 7 || n === 30 || n === 90) return n;
  return 30;
}

const dateFormatter = new Intl.DateTimeFormat("zh-TW", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const ntdFormatter = new Intl.NumberFormat("zh-TW");

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range = parseRange(sp.range);

  const points = await getRevenueTrend(range);
  const summary = summarizeRevenue(points);

  return (
    <section className="bg-bg p-[clamp(28px,3.5vw,48px)]">
      {/* Header */}
      <div className="mb-8 border-b border-border pb-6">
        <div className="mb-3 font-mono text-[11px] tracking-[0.18em] uppercase">
          <Link href="/admin" className="text-muted hover:text-accent">
            後台
          </Link>
          <span className="mx-3 text-border">/</span>
          <span className="text-accent">報表</span>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[clamp(28px,3vw,40px)] leading-none tracking-[-0.01em]">
              報表
            </h1>
            <span className="mt-2.5 block font-mono text-[11px] tracking-[0.14em] uppercase text-muted">
              範圍：{RANGES.find((r) => r.value === range)?.label}
              <span className="mx-2 text-border">·</span>
              已扣款訂單（PAID / SHIPPED / DELIVERED）
            </span>
          </div>
          <ExportOrdersButton />
        </div>
      </div>

      {/* Tabs（簡化版只有 1 個，但保留結構等之後加） */}
      <div className="mb-6 flex flex-wrap items-end gap-2.5 border-b border-border pb-3">
        <span className="inline-flex items-center border-b-2 border-accent px-3 py-2 font-mono text-[11px] tracking-[0.16em] uppercase text-accent">
          營收趨勢
        </span>
        <span
          className="inline-flex cursor-not-allowed items-center px-3 py-2 font-mono text-[11px] tracking-[0.16em] uppercase text-dim"
          title="預計後續 phase 上線"
        >
          商品銷量
        </span>
        <span
          className="inline-flex cursor-not-allowed items-center px-3 py-2 font-mono text-[11px] tracking-[0.16em] uppercase text-dim"
          title="預計後續 phase 上線"
        >
          客戶分析
        </span>
      </div>

      {/* Range chips */}
      <div className="mb-6 flex flex-wrap gap-2.5">
        {RANGES.map((r) => {
          const active = r.value === range;
          const href = r.value === 30 ? "/admin/reports" : `/admin/reports?range=${r.value}`;
          return (
            <Link
              key={r.value}
              href={href}
              className={`inline-flex items-center border px-3.5 py-2 font-mono text-[11px] tracking-[0.16em] uppercase transition-colors duration-150 ${
                active
                  ? "border-accent bg-accent-tint text-accent"
                  : "border-border bg-surface text-muted hover:border-border-hi hover:text-fg-2"
              }`}
            >
              {r.label}
            </Link>
          );
        })}
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-3 gap-4 max-[900px]:grid-cols-2 max-[600px]:grid-cols-1">
        <Stat
          label="總營收"
          value={`NT$ ${ntdFormatter.format(summary.totalRevenue)}`}
          tone="accent"
        />
        <Stat
          label="訂單筆數"
          value={summary.totalOrders.toString()}
          tone="fg"
        />
        <Stat
          label="平均客單"
          value={
            summary.totalOrders === 0
              ? "—"
              : `NT$ ${ntdFormatter.format(summary.avgOrderValue)}`
          }
          tone="fg"
        />
      </div>

      {/* Chart card */}
      <div className="border border-border bg-surface px-6 pt-6 pb-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-[18px] leading-none">每日營收</h2>
          {summary.peakDay ? (
            <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted">
              峰值 · {dateFormatter.format(new Date(summary.peakDay.date))}
              <span className="mx-1.5 text-border">·</span>
              NT$ {ntdFormatter.format(summary.peakDay.revenue)}
            </span>
          ) : (
            <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-dim">
              範圍內無已扣款訂單
            </span>
          )}
        </div>
        <RevenueChart data={points} />
      </div>
    </section>
  );
}

/* ============ inline helpers ============ */

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "accent" | "fg" | "muted";
}) {
  const toneClass = {
    accent: "text-accent",
    fg: "text-fg",
    muted: "text-muted",
  }[tone];
  return (
    <article className="border border-border bg-surface px-6 py-[22px]">
      <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted">
        {label}
      </div>
      <div className={`mt-3 font-serif text-[32px] leading-[1.05] tabular-nums ${toneClass}`}>
        {value}
      </div>
    </article>
  );
}
