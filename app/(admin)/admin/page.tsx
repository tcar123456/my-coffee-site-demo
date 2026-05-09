import Link from "next/link";
import { Button } from "@/components/ui/Button";

/* ============ data ============ */

type RailItem = { label: string; num?: string; active?: boolean };
type RailGroup = { title: string; items: RailItem[] };

const railGroups: RailGroup[] = [
  {
    title: "營運",
    items: [
      { label: "總覽", num: "1", active: true },
      { label: "訂單", num: "12" },
      { label: "訂閱", num: "38" },
      { label: "顧客", num: "421" },
    ],
  },
  {
    title: "商品",
    items: [
      { label: "單品咖啡", num: "8" },
      { label: "禮盒", num: "3" },
      { label: "器具", num: "5" },
      { label: "庫存", num: "2" },
    ],
  },
  {
    title: "內容 / 行銷",
    items: [
      { label: "文章", num: "14" },
      { label: "優惠碼", num: "3" },
      { label: "橫幅" },
      { label: "EDM" },
    ],
  },
  {
    title: "系統",
    items: [{ label: "設定" }, { label: "整合" }, { label: "API 金鑰" }],
  },
];

const ranges = ["今日", "7 日", "30 日", "本季"] as const;
const activeRange = "7 日";

type Kpi = {
  label: string;
  value: string;
  unit?: string;
  pulse?: boolean;
  delta: { tone: "up" | "down" | "warn"; text: string };
  spark?: { points: string; stroke: string };
};

const kpis: Kpi[] = [
  {
    label: "7 日 營收",
    unit: "NT$",
    value: "184,620",
    pulse: true,
    delta: { tone: "up", text: "↑ 18.4 % 對比上週" },
    spark: {
      points: "0,22 10,18 20,20 30,12 40,14 50,8 60,10 70,4 80,6",
      stroke: "oklch(72% 0.13 145)",
    },
  },
  {
    label: "7 日 訂單",
    value: "142",
    delta: { tone: "up", text: "↑ 22 筆" },
    spark: {
      points: "0,18 10,16 20,20 30,10 40,12 50,6 60,8 70,4 80,2",
      stroke: "oklch(74% 0.14 55)",
    },
  },
  {
    label: "待出貨",
    value: "28",
    delta: { tone: "warn", text: "⚐ 04 筆 超過 24 hr" },
  },
  {
    label: "活躍訂閱",
    value: "38",
    delta: { tone: "up", text: "↑ 03 本期續訂" },
    spark: {
      points: "0,16 10,14 20,12 30,14 40,10 50,12 60,8 70,10 80,8",
      stroke: "oklch(74% 0.14 55)",
    },
  },
];

const deltaToneClass: Record<Kpi["delta"]["tone"], string> = {
  up: "text-success",
  down: "text-danger",
  warn: "text-warn",
};

const chartDays = [
  "05.02 五",
  "05.03 六",
  "05.04 日",
  "05.05 一",
  "05.06 二",
  "05.07 三",
  "05.08 四",
];

type TopProduct = {
  no: string;
  name: string;
  meta: string;
  bags: number;
  total: number;
};

const topProducts: TopProduct[] = [
  {
    no: "01",
    name: "耶加雪菲 G1 科契爾",
    meta: "N° 01 · ETHIOPIA",
    bags: 42,
    total: 24360,
  },
  {
    no: "02",
    name: "藝伎 紅標",
    meta: "N° 03 · PANAMA",
    bags: 18,
    total: 30240,
  },
  {
    no: "03",
    name: "拉斯佛羅雷斯 厭氧",
    meta: "N° 02 · COLOMBIA",
    bags: 31,
    total: 22320,
  },
  {
    no: "04",
    name: "摩卡 哈拉茲 日曬",
    meta: "N° 06 · YEMEN",
    bags: 14,
    total: 13720,
  },
  {
    no: "05",
    name: "涅里 卡里魯 AA",
    meta: "N° 04 · KENYA",
    bags: 23,
    total: 14260,
  },
];

type OrderStatus = "proc" | "paid" | "ship";
type OrderRow = {
  id: string;
  time: string;
  customer: string;
  status: OrderStatus;
  statusLabel: string;
  total: number;
};

const orders: OrderRow[] = [
  { id: "#MB-2614", time: "13:24", customer: "余建中 · 台北", status: "proc", statusLabel: "處理中", total: 1180 },
  { id: "#MB-2613", time: "12:58", customer: "陳曉琪 · 高雄", status: "paid", statusLabel: "已付款", total: 2840 },
  { id: "#MB-2612", time: "11:12", customer: "新顧客 · 台中", status: "ship", statusLabel: "已出貨", total: 1720 },
  { id: "#MB-2611", time: "10:48", customer: "王彥廷 · 新竹", status: "ship", statusLabel: "已出貨", total: 4560 },
  { id: "#MB-2610", time: "10:21", customer: "林家慧 · 台北", status: "paid", statusLabel: "已付款", total: 980 },
  { id: "#MB-2609", time: "09:42", customer: "許志明 · 台南", status: "proc", statusLabel: "處理中", total: 1560 },
];

const statusPillClass: Record<OrderStatus, string> = {
  proc: "text-accent bg-accent-tint before:bg-accent",
  paid: "text-success before:bg-success",
  ship:
    "text-success before:bg-success bg-[oklch(28%_0.05_145)]",
};

type StockTone = "out" | "low" | "mid";
type StockRow = {
  name: string;
  no: string;
  detail: string;
  pillLabel: string;
  pillTone: StockTone;
  fillPct: number;
};

const stocks: StockRow[] = [
  {
    name: "藝伎 紅標",
    no: "N° 03",
    detail: "0 / 50 包",
    pillLabel: "售完",
    pillTone: "out",
    fillPct: 0,
  },
  {
    name: "塔拉珠 拉米妮塔",
    no: "N° 08",
    detail: "0 / 80 包 · 預計 05.13 補",
    pillLabel: "售完",
    pillTone: "out",
    fillPct: 0,
  },
  {
    name: "摩卡 哈拉茲 日曬",
    no: "N° 06",
    detail: "12 / 80 包 (15 %)",
    pillLabel: "庫存低",
    pillTone: "low",
    fillPct: 15,
  },
  {
    name: "耶加雪菲 G1",
    no: "N° 01",
    detail: "36 / 120 包 (30 %)",
    pillLabel: "庫存中",
    pillTone: "low",
    fillPct: 30,
  },
];

const stockPillClass: Record<StockTone, string> = {
  out: "text-danger bg-[oklch(26%_0.06_25)] before:bg-danger",
  low: "text-warn bg-[oklch(28%_0.05_75)] before:bg-warn",
  mid: "text-warn bg-[oklch(28%_0.05_75)] before:bg-warn",
};

const stockBarFill: Record<StockTone, string> = {
  out: "bg-danger",
  low: "bg-warn",
  mid: "bg-warn",
};

/* ============ page ============ */

export default function AdminOverviewPage() {
  return (
    <div className="grid min-h-[calc(100vh-60px)] grid-cols-[220px_1fr] max-[900px]:grid-cols-1">
      {/* ============ Side rail ============ */}
      <aside className="sticky top-[60px] h-[calc(100vh-60px)] self-start overflow-y-auto border-r border-border bg-bg py-5 max-[900px]:hidden">
        {railGroups.map((group) => (
          <div key={group.title} className="px-5 py-3">
            <div className="pb-3 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">
              {group.title}
            </div>
            {group.items.map((item) => (
              <Link
                key={item.label}
                href="#"
                className={`-mx-3.5 flex items-center justify-between border-l-2 px-3.5 py-[9px] text-[13px] transition-all duration-150 ${
                  item.active
                    ? "border-l-accent bg-surface text-fg"
                    : "border-l-transparent text-fg-2 hover:text-fg"
                }`}
              >
                <span>{item.label}</span>
                {item.num !== undefined && (
                  <span
                    className={`border px-1.5 py-0.5 font-mono text-[10px] tabular-nums ${
                      item.active
                        ? "border-accent-tint bg-surface text-accent"
                        : "border-border bg-surface text-muted"
                    }`}
                  >
                    {item.num}
                  </span>
                )}
              </Link>
            ))}
          </div>
        ))}
      </aside>

      {/* ============ Main content ============ */}
      <section className="bg-bg p-[clamp(28px,3.5vw,48px)]">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
          <div>
            <h1 className="font-serif text-[clamp(28px,3vw,40px)] leading-none tracking-[-0.01em]">
              總覽
            </h1>
            <span className="mt-2.5 block font-mono text-[11px] tracking-[0.14em] uppercase text-muted">
              數據截至 2026.05.08 · 13:42 GMT+8
            </span>
          </div>
          <div className="flex flex-wrap items-stretch gap-2.5">
            <div className="flex border border-border">
              {ranges.map((r, i) => {
                const active = r === activeRange;
                return (
                  <button
                    key={r}
                    type="button"
                    className={`px-3.5 py-2 font-mono text-[11px] tracking-[0.12em] uppercase transition-colors ${
                      i < ranges.length - 1 ? "border-r border-border" : ""
                    } ${active ? "bg-surface-2 text-accent" : "text-muted hover:text-fg"}`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
            <Button href="#" variant="ghost">
              下載報表 ↓
            </Button>
            <Button href="#" variant="primary">
              + 新增商品
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="mb-8 grid grid-cols-4 gap-4 max-[1100px]:grid-cols-2">
          {kpis.map((k) => (
            <article
              key={k.label}
              className="relative border border-border bg-surface px-6 py-[22px]"
            >
              {k.pulse && (
                <span className="absolute top-[22px] right-6 size-1.5 rounded-full bg-success [animation:var(--animate-pulse-dot)]" />
              )}
              <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted">
                {k.label}
              </div>
              <div className="mt-3.5 mb-2 font-serif text-[38px] leading-[1.05] tabular-nums">
                {k.unit && (
                  <small className="mr-1 font-mono text-[13px] text-muted">
                    {k.unit}
                  </small>
                )}
                {k.value}
              </div>
              <span
                className={`inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.04em] ${deltaToneClass[k.delta.tone]}`}
              >
                {k.delta.text}
              </span>
              {k.spark && (
                <svg
                  className="absolute right-4 bottom-4 h-7 w-20 opacity-85"
                  viewBox="0 0 80 28"
                  fill="none"
                  aria-hidden="true"
                >
                  <polyline
                    points={k.spark.points}
                    stroke={k.spark.stroke}
                    strokeWidth="1.5"
                    fill="none"
                  />
                </svg>
              )}
            </article>
          ))}
        </div>

        {/* Chart row: revenue trend + top products */}
        <div className="mb-8 grid grid-cols-[2fr_1fr] gap-4 max-[1100px]:grid-cols-1">
          {/* Revenue trend */}
          <div className="border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border px-6 py-[18px]">
              <h3 className="font-serif text-[18px]">營收趨勢 — 最近 7 日</h3>
              <div className="flex gap-4 font-mono text-[11px] tracking-[0.04em] text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 bg-accent" />
                  單次訂購
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 bg-success" />
                  訂閱配送
                </span>
              </div>
            </div>
            <div className="p-6">
              <svg
                viewBox="0 0 600 200"
                preserveAspectRatio="none"
                className="h-[200px] w-full"
                aria-label="營收趨勢圖"
              >
                {/* Gridlines */}
                <line x1="0" y1="50" x2="600" y2="50" stroke="oklch(28% 0.008 250)" strokeDasharray="2 4" />
                <line x1="0" y1="100" x2="600" y2="100" stroke="oklch(28% 0.008 250)" strokeDasharray="2 4" />
                <line x1="0" y1="150" x2="600" y2="150" stroke="oklch(28% 0.008 250)" strokeDasharray="2 4" />

                {/* Subscription area + line */}
                <path
                  d="M0,160 L100,150 L200,140 L300,135 L400,130 L500,120 L600,115 L600,200 L0,200 Z"
                  fill="oklch(72% 0.13 145 / 0.12)"
                />
                <polyline
                  points="0,160 100,150 200,140 300,135 400,130 500,120 600,115"
                  stroke="oklch(72% 0.13 145)"
                  strokeWidth="1.5"
                  fill="none"
                />

                {/* Orders area + line */}
                <path
                  d="M0,120 L100,90 L200,100 L300,70 L400,75 L500,40 L600,55 L600,200 L0,200 Z"
                  fill="oklch(74% 0.14 55 / 0.18)"
                />
                <polyline
                  points="0,120 100,90 200,100 300,70 400,75 500,40 600,55"
                  stroke="oklch(74% 0.14 55)"
                  strokeWidth="2"
                  fill="none"
                />

                {/* Dots */}
                <g fill="oklch(74% 0.14 55)">
                  <circle cx="0" cy="120" r="3" />
                  <circle cx="100" cy="90" r="3" />
                  <circle cx="200" cy="100" r="3" />
                  <circle cx="300" cy="70" r="3" />
                  <circle cx="400" cy="75" r="3" />
                  <circle cx="500" cy="40" r="4" />
                  <circle cx="600" cy="55" r="3" />
                </g>

                {/* Today highlight */}
                <line
                  x1="500"
                  y1="0"
                  x2="500"
                  y2="200"
                  stroke="oklch(74% 0.14 55)"
                  strokeDasharray="2 4"
                  opacity="0.4"
                />
              </svg>
              <div className="mt-3 flex justify-between font-mono text-[10px] tracking-[0.1em] text-muted">
                {chartDays.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Top products */}
          <div className="border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border px-6 py-[18px]">
              <h3 className="font-serif text-[18px]">本週熱賣豆款</h3>
              <Link
                href="#"
                className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted hover:text-accent"
              >
                看全部 →
              </Link>
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

        {/* Two-row: orders + stock */}
        <div className="grid grid-cols-[1.4fr_1fr] gap-4 max-[1100px]:grid-cols-1">
          {/* Recent orders */}
          <div className="border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border px-6 py-[18px]">
              <h3 className="font-serif text-[18px]">最新訂單</h3>
              <Link
                href="#"
                className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted hover:text-accent"
              >
                前往訂單頁 →
              </Link>
            </div>
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
                {orders.map((o, i) => (
                  <tr
                    key={o.id}
                    className="transition-colors hover:[&>td]:bg-surface-2"
                  >
                    <td
                      className={`px-6 py-3 text-[13px] ${
                        i < orders.length - 1 ? "border-b border-border" : ""
                      }`}
                    >
                      <span className="font-mono text-[12px] text-accent">
                        {o.id}
                      </span>
                    </td>
                    <td
                      className={`px-6 py-3 text-[13px] ${
                        i < orders.length - 1 ? "border-b border-border" : ""
                      }`}
                    >
                      {o.time}
                    </td>
                    <td
                      className={`px-6 py-3 text-[13px] ${
                        i < orders.length - 1 ? "border-b border-border" : ""
                      }`}
                    >
                      {o.customer}
                    </td>
                    <td
                      className={`px-6 py-3 text-[13px] ${
                        i < orders.length - 1 ? "border-b border-border" : ""
                      }`}
                    >
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-1 font-mono text-[10px] tracking-[0.14em] uppercase before:size-1.5 before:rounded-full ${statusPillClass[o.status]}`}
                      >
                        {o.statusLabel}
                      </span>
                    </td>
                    <td
                      className={`px-6 py-3 text-right font-mono text-[13px] tabular-nums ${
                        i < orders.length - 1 ? "border-b border-border" : ""
                      }`}
                    >
                      NT$ {o.total.toLocaleString("zh-TW")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Stock alerts */}
          <div className="border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border px-6 py-[18px]">
              <h3 className="font-serif text-[18px]">庫存警示</h3>
              <Link
                href="#"
                className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted hover:text-accent"
              >
                補貨建議 →
              </Link>
            </div>
            <div className="px-6 pt-1 pb-6">
              {stocks.map((s, i) => (
                <div
                  key={s.name}
                  className={`py-[18px] ${
                    i < stocks.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="font-serif text-[15px]">{s.name}</div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-1 font-mono text-[10px] tracking-[0.14em] uppercase before:size-1.5 before:rounded-full ${stockPillClass[s.pillTone]}`}
                    >
                      {s.pillLabel}
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-[10px] tracking-[0.12em] uppercase text-muted">
                    {s.no} · {s.detail}
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden border border-border bg-surface-2">
                    <div
                      className={`h-full ${stockBarFill[s.pillTone]}`}
                      style={{ width: `${s.fillPct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
