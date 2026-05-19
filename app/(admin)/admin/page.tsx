// Phase 5a — 後台總覽
// KPI / 最新訂單 / 庫存警示：真實資料（getAdminOverview 一次撈齊）
// Phase 5d 起：營收趨勢圖也接真資料（getRevenueTrend），熱賣豆款仍為 mockup（5d 簡化版未做）

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { getAdminOverview } from "@/app/actions/admin-orders";
import { getRevenueTrend } from "@/lib/reports";
import { RevenueSparkline } from "./reports/RevenueChart";
import { ORDER_STATUS_LABEL } from "@/lib/order-state";
import type { OrderStatus } from "@/generated/prisma/enums";

const statusPillClass: Record<OrderStatus, string> = {
  PENDING: "text-warn bg-[oklch(28%_0.05_75)] before:bg-warn",
  PAID: "text-accent bg-accent-tint before:bg-accent",
  SHIPPED: "text-success before:bg-success bg-[oklch(28%_0.05_145)]",
  DELIVERED: "text-muted bg-surface-2 before:bg-muted",
  CANCELLED: "text-danger bg-[oklch(26%_0.06_25)] before:bg-danger",
};

const stockPillClass = {
  out: "text-danger bg-[oklch(26%_0.06_25)] before:bg-danger",
  low: "text-warn bg-[oklch(28%_0.05_75)] before:bg-warn",
} as const;

const stockBarFill = {
  out: "bg-danger",
  low: "bg-warn",
  mid: "bg-success",
} as const;

const timeFormatter = new Intl.DateTimeFormat("zh-TW", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateFormatter = new Intl.DateTimeFormat("zh-TW", {
  month: "2-digit",
  day: "2-digit",
});

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function computeDelta(curr: number, prev: number): string {
  if (prev === 0) {
    return curr === 0 ? "持平" : "↑ 新增";
  }
  const pct = ((curr - prev) / prev) * 100;
  const arrow = pct >= 0 ? "↑" : "↓";
  return `${arrow} ${Math.abs(pct).toFixed(1)} % 對比上週`;
}

function deltaTone(curr: number, prev: number): "up" | "down" | "warn" {
  if (prev === 0 && curr === 0) return "warn";
  return curr >= prev ? "up" : "down";
}

const deltaToneClass = {
  up: "text-success",
  down: "text-danger",
  warn: "text-muted",
} as const;

/* ============ mockup data (熱賣豆款仍為 mockup；5d 簡化版未做) ============ */

const topProducts = [
  { no: "01", name: "耶加雪菲 G1 科契爾", meta: "N° 01 · ETHIOPIA", bags: 42, total: 24360 },
  { no: "02", name: "藝伎 紅標", meta: "N° 03 · PANAMA", bags: 18, total: 30240 },
  { no: "03", name: "拉斯佛羅雷斯 厭氧", meta: "N° 02 · COLOMBIA", bags: 31, total: 22320 },
  { no: "04", name: "摩卡 哈拉茲 日曬", meta: "N° 06 · YEMEN", bags: 14, total: 13720 },
  { no: "05", name: "涅里 卡里魯 AA", meta: "N° 04 · KENYA", bags: 23, total: 14260 },
];

/* ============ page ============ */

export default async function AdminOverviewPage() {
  const [data, revenuePoints] = await Promise.all([
    getAdminOverview(),
    getRevenueTrend(7),
  ]);
  const revenueLast7 = data.revenue.last7;
  const orderCountLast7 = data.orderCount.last7;

  return (
    <section className="bg-bg p-[clamp(28px,3.5vw,48px)]">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="font-serif text-[clamp(28px,3vw,40px)] leading-none tracking-[-0.01em]">
            總覽
          </h1>
          <span className="mt-2.5 block font-mono text-[11px] tracking-[0.14em] uppercase text-muted">
            數據截至 {new Intl.DateTimeFormat("zh-TW", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }).format(new Date())}
          </span>
        </div>
        <div className="flex flex-wrap items-stretch gap-2.5">
          <Button href="/admin/reports" variant="ghost">
            完整報表 →
          </Button>
          <Button href="/admin/orders" variant="ghost">
            訂單管理 →
          </Button>
          <Button href="/admin/stock" variant="primary">
            庫存管理 →
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-8 grid grid-cols-4 gap-4 max-[1100px]:grid-cols-2">
        <KpiCard
          label="7 日 營收"
          unit="NT$"
          value={revenueLast7.toLocaleString("zh-TW")}
          pulse={revenueLast7 > 0}
          deltaText={computeDelta(revenueLast7, data.revenue.prev7)}
          deltaTone={deltaTone(revenueLast7, data.revenue.prev7)}
        />
        <KpiCard
          label="7 日 訂單"
          value={pad2(orderCountLast7)}
          deltaText={computeDelta(orderCountLast7, data.orderCount.prev7)}
          deltaTone={deltaTone(orderCountLast7, data.orderCount.prev7)}
        />
        <KpiCard
          label="待出貨"
          value={pad2(data.pendingShipmentCount)}
          deltaText={
            data.pendingShipmentCount === 0
              ? "✓ 出貨清空"
              : `⚐ ${pad2(data.pendingShipmentCount)} 筆等待中`
          }
          deltaTone={data.pendingShipmentCount === 0 ? "up" : "warn"}
        />
        <KpiCard
          label="活躍訂閱"
          value={pad2(data.activeSubscriptionCount)}
          deltaText={
            data.activeSubscriptionCount === 0
              ? "尚無進行中訂閱"
              : `現有 ${pad2(data.activeSubscriptionCount)} 筆 ACTIVE`
          }
          deltaTone={data.activeSubscriptionCount > 0 ? "up" : "warn"}
        />
      </div>

      {/* Chart row: revenue trend (real) + top products (mockup) */}
      <div className="mb-8 grid grid-cols-[2fr_1fr] gap-4 max-[1100px]:grid-cols-1">
        {/* Revenue trend — Phase 5d 接真資料 */}
        <div className="border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-6 py-[18px]">
            <h3 className="font-serif text-[18px]">營收趨勢 — 最近 7 日</h3>
            <Link
              href="/admin/reports"
              className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted hover:text-accent"
            >
              完整報表 →
            </Link>
          </div>
          <div className="p-4">
            <RevenueSparkline data={revenuePoints} />
          </div>
        </div>

        {/* Top products (mockup) */}
        <div className="border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-6 py-[18px]">
            <h3 className="font-serif text-[18px]">本週熱賣豆款</h3>
            <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted">
              Mockup · Phase 5d
            </span>
          </div>
          <div className="px-6 pt-4 pb-6">
            {topProducts.map((p, i) => (
              <div
                key={p.no}
                className={`grid grid-cols-[24px_1fr_auto] items-center gap-3.5 py-3.5 ${
                  i < topProducts.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <span className="font-mono text-[12px] tracking-[0.1em] text-muted">
                  {p.no}
                </span>
                <div>
                  <div className="font-serif text-[14px]">{p.name}</div>
                  <div className="mt-0.5 font-mono text-[10px] tracking-[0.1em] uppercase text-muted">
                    {p.meta}
                  </div>
                </div>
                <div className="text-right font-mono text-[13px] text-accent">
                  {p.bags} 包
                  <small className="mt-0.5 block font-mono text-[10px] tracking-[0.06em] text-muted">
                    NT$ {p.total.toLocaleString("zh-TW")}
                  </small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two-row: orders + stock (real data) */}
      <div className="grid grid-cols-[1.4fr_1fr] gap-4 max-[1100px]:grid-cols-1">
        {/* Recent orders */}
        <div className="border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-6 py-[18px]">
            <h3 className="font-serif text-[18px]">最新訂單</h3>
            <Link
              href="/admin/orders"
              className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted hover:text-accent"
            >
              前往訂單頁 →
            </Link>
          </div>
          {data.recentOrders.length === 0 ? (
            <div className="px-6 py-12 text-center font-mono text-[12px] text-muted">
              尚無訂單記錄。
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  {["#訂單", "時間", "顧客", "狀態", "金額"].map((h, i) => (
                    <th
                      key={h}
                      className={`border-b border-border bg-surface-2 px-6 py-3 font-mono text-[10px] font-normal tracking-[0.16em] uppercase text-muted ${
                        i === 4 ? "text-right" : "text-left"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((o, i) => {
                  const isLast = i === data.recentOrders.length - 1;
                  const cellBorder = isLast ? "" : "border-b border-border";
                  const status = o.status as OrderStatus;
                  const isToday =
                    new Date().toDateString() === o.createdAt.toDateString();
                  return (
                    <tr
                      key={o.id}
                      className="transition-colors hover:[&>td]:bg-surface-2"
                    >
                      <td className={`px-6 py-3 text-[13px] ${cellBorder}`}>
                        <Link
                          href={`/admin/orders/${o.orderNumber}`}
                          className="font-mono text-[12px] text-accent hover:underline"
                        >
                          #{o.orderNumber.split("-").slice(-1)[0]}
                        </Link>
                      </td>
                      <td className={`px-6 py-3 text-[13px] ${cellBorder}`}>
                        {isToday
                          ? timeFormatter.format(o.createdAt)
                          : dateFormatter.format(o.createdAt)}
                      </td>
                      <td className={`px-6 py-3 text-[13px] ${cellBorder}`}>
                        {o.recipientName} · {o.shippingCity}
                      </td>
                      <td className={`px-6 py-3 text-[13px] ${cellBorder}`}>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-1 font-mono text-[10px] tracking-[0.14em] uppercase before:size-1.5 before:rounded-full ${statusPillClass[status]}`}
                        >
                          {ORDER_STATUS_LABEL[status]}
                        </span>
                      </td>
                      <td
                        className={`px-6 py-3 text-right font-mono text-[13px] tabular-nums ${cellBorder}`}
                      >
                        NT$ {o.total.toLocaleString("zh-TW")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Stock alerts */}
        <div className="border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-6 py-[18px]">
            <h3 className="font-serif text-[18px]">庫存警示</h3>
            <Link
              href="/admin/stock"
              className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted hover:text-accent"
            >
              庫存管理 →
            </Link>
          </div>
          <div className="px-6 pt-1 pb-6">
            {data.lowStockProducts.length === 0 ? (
              <div className="py-12 text-center font-mono text-[12px] text-muted">
                所有商品庫存充足。
              </div>
            ) : (
              data.lowStockProducts.map((s, i) => {
                const tone: keyof typeof stockPillClass =
                  s.stock === 0 ? "out" : "low";
                const pillLabel = s.stock === 0 ? "售完" : "庫存低";
                const fillPct =
                  s.stock === 0 ? 0 : Math.min(100, (s.stock / 50) * 100);
                const fillTone: keyof typeof stockBarFill =
                  s.stock === 0 ? "out" : s.stock < 20 ? "low" : "mid";
                return (
                  <div
                    key={s.id}
                    className={`py-[18px] ${
                      i < data.lowStockProducts.length - 1
                        ? "border-b border-border"
                        : ""
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <Link
                        href="/admin/stock"
                        className="font-serif text-[15px] hover:text-accent"
                      >
                        {s.name}
                      </Link>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-1 font-mono text-[10px] tracking-[0.14em] uppercase before:size-1.5 before:rounded-full ${stockPillClass[tone]}`}
                      >
                        {pillLabel}
                      </span>
                    </div>
                    <div className="mt-1 font-mono text-[10px] tracking-[0.12em] uppercase text-muted">
                      目前庫存 · {s.stock} 包
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden border border-border bg-surface-2">
                      <div
                        className={`h-full ${stockBarFill[fillTone]}`}
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============ inline helpers ============ */

function KpiCard({
  label,
  unit,
  value,
  pulse,
  deltaText,
  deltaTone,
}: {
  label: string;
  unit?: string;
  value: string;
  pulse?: boolean;
  deltaText: string;
  deltaTone: keyof typeof deltaToneClass;
}) {
  return (
    <article className="relative border border-border bg-surface px-6 py-[22px]">
      {pulse && (
        <span className="absolute top-[22px] right-6 size-1.5 rounded-full bg-success [animation:var(--animate-pulse-dot)]" />
      )}
      <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted">
        {label}
      </div>
      <div className="mt-3.5 mb-2 font-serif text-[38px] leading-[1.05] tabular-nums">
        {unit && (
          <small className="mr-1 font-mono text-[13px] text-muted">{unit}</small>
        )}
        {value}
      </div>
      <span
        className={`inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.04em] ${deltaToneClass[deltaTone]}`}
      >
        {deltaText}
      </span>
    </article>
  );
}
