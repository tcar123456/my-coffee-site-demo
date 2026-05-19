"use client";

// Phase 5d — 營收趨勢圖（client，Recharts）
// Recharts 內部用 ResizeObserver / SVG 計算，必須 client component。
// 顏色直接從 oklch design token 對應的具體值（不能用 CSS custom property —— Recharts 不支援）。
// dark-mode-friendly：fill 用半透明 + grid stroke 用較淡 oklch。

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { RevenuePoint } from "@/lib/reports";

// Recharts 3.x TooltipProps 把 active/payload/label 從 type 拿掉（context-injected），
// 自訂 tooltip 直接用最小契約 type 收 props。
type ChartTooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: ReadonlyArray<{ dataKey?: string | number; value?: number | string }>;
};

// 對應 globals.css 的 --accent / --success（近似值）
const COLOR_ACCENT = "oklch(74% 0.14 55)";
const COLOR_GRID = "oklch(28% 0.008 250)";
const COLOR_AXIS = "oklch(50% 0.008 250)";
const COLOR_TOOLTIP_BG = "oklch(16% 0.005 250)";

const dateFormatter = new Intl.DateTimeFormat("zh-TW", {
  month: "2-digit",
  day: "2-digit",
});

const ntdFormatter = new Intl.NumberFormat("zh-TW");

function formatXTick(date: string): string {
  // date: "2026-05-18" → 顯示 "05.18"
  const parts = date.split("-");
  return parts.length === 3 ? `${parts[1]}.${parts[2]}` : date;
}

function ChartTooltip({
  active,
  payload,
  label,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const revenue = payload.find((p) => p.dataKey === "revenue")?.value as
    | number
    | undefined;
  const orderCount = payload.find((p) => p.dataKey === "orderCount")?.value as
    | number
    | undefined;
  const dateLabel = typeof label === "string"
    ? dateFormatter.format(new Date(label))
    : label;
  return (
    <div
      className="border border-border bg-surface px-3.5 py-2.5 font-mono text-[11px] shadow-lg"
      style={{ background: COLOR_TOOLTIP_BG }}
    >
      <div className="mb-1.5 tracking-[0.14em] uppercase text-muted">
        {dateLabel}
      </div>
      <div className="text-accent">
        NT$ {ntdFormatter.format(revenue ?? 0)}
      </div>
      <div className="mt-0.5 text-fg-2">
        {orderCount ?? 0} 筆訂單
      </div>
    </div>
  );
}

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 16, right: 12, left: -8, bottom: 0 }}
        >
          <defs>
            <linearGradient id="revenue-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLOR_ACCENT} stopOpacity={0.32} />
              <stop offset="100%" stopColor={COLOR_ACCENT} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke={COLOR_GRID}
            strokeDasharray="2 4"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={formatXTick}
            stroke={COLOR_AXIS}
            tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
            tickMargin={8}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            stroke={COLOR_AXIS}
            tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
            tickFormatter={(v) => ntdFormatter.format(v)}
            tickMargin={4}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: COLOR_ACCENT, strokeDasharray: "3 3", strokeOpacity: 0.5 }} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke={COLOR_ACCENT}
            strokeWidth={2}
            fill="url(#revenue-gradient)"
            dot={{ r: 3, fill: COLOR_ACCENT, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: COLOR_ACCENT, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// 給 /admin 總覽用的迷你版（無 axis、無 tooltip、固定 200 高）
export function RevenueSparkline({ data }: { data: RevenuePoint[] }) {
  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 12, right: 0, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="spark-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLOR_ACCENT} stopOpacity={0.32} />
              <stop offset="100%" stopColor={COLOR_ACCENT} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke={COLOR_GRID}
            strokeDasharray="2 4"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={formatXTick}
            stroke={COLOR_AXIS}
            tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
            tickMargin={6}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis hide />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: COLOR_ACCENT, strokeDasharray: "3 3", strokeOpacity: 0.5 }} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke={COLOR_ACCENT}
            strokeWidth={2}
            fill="url(#spark-gradient)"
            dot={false}
            activeDot={{ r: 4, fill: COLOR_ACCENT, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
