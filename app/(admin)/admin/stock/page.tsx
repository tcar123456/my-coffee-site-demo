// Phase 5a — 後台庫存管理
// Server component；level=all/out/low 篩選走 searchParams + <Link>。
// inline 「調整庫存」表單拆成 client 子檔 StockAdjustForm（useTransition + server action）。
// 庫存徽章三段：售完 / 庫存低（<20） / 庫存充足（>=20）。

import Image from "next/image";
import Link from "next/link";
import { listProductsForStock } from "@/app/actions/admin-stock";
import { StockAdjustForm } from "./StockAdjustForm";

type Level = "all" | "out" | "low";

const LEVELS: ReadonlyArray<{ value: Level; label: string }> = [
  { value: "all", label: "全部" },
  { value: "out", label: "售完" },
  { value: "low", label: "庫存低 < 20" },
];

const LEVEL_EMPTY_COPY: Record<Level, string> = {
  all: "目前沒有上架中的商品。",
  out: "目前沒有售完的商品。",
  low: "目前沒有低庫存商品。",
};

type StockTone = "out" | "low" | "ok";

function stockTone(stock: number): StockTone {
  if (stock === 0) return "out";
  if (stock < 20) return "low";
  return "ok";
}

const stockPillClass: Record<StockTone, string> = {
  out: "text-danger bg-[oklch(26%_0.06_25)] before:bg-danger",
  low: "text-warn bg-[oklch(28%_0.05_75)] before:bg-warn",
  ok: "text-success bg-[oklch(28%_0.05_145)] before:bg-success",
};

const stockPillLabel: Record<StockTone, string> = {
  out: "售完",
  low: "庫存低",
  ok: "庫存充足",
};

function parseLevel(raw: string | undefined): Level {
  if (raw === "out" || raw === "low" || raw === "all") return raw;
  return "all";
}

export default async function AdminStockPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>;
}) {
  const { level: rawLevel } = await searchParams;
  const level = parseLevel(rawLevel);

  // 撈 all 與 low 兩份；all 拿來算總數，low 拿來算低庫存。
  // 若 level=all 結果就是 all、若 level=low 結果就是 low、若 level=out 再撈一份。
  // 8 筆資料量級下不在意這幾次 query。
  const [allProducts, lowProducts] = await Promise.all([
    listProductsForStock("all"),
    listProductsForStock("low"),
  ]);

  const visible =
    level === "all"
      ? allProducts
      : level === "low"
        ? lowProducts
        : allProducts.filter((p) => p.stock === 0);

  return (
    <section className="bg-bg p-[clamp(28px,3.5vw,48px)]">
      {/* Header */}
      <div className="mb-8 border-b border-border pb-6">
        <div className="mb-3 font-mono text-[11px] tracking-[0.18em] uppercase">
          <Link href="/admin" className="text-muted hover:text-accent">
            後台
          </Link>
          <span className="mx-3 text-border">/</span>
          <span className="text-accent">庫存管理</span>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[clamp(28px,3vw,40px)] leading-none tracking-[-0.01em]">
              庫存管理
            </h1>
            <span className="mt-2.5 block font-mono text-[11px] tracking-[0.14em] uppercase text-muted">
              目前共 {allProducts.length} 款商品 · 低庫存{" "}
              <span className={lowProducts.length > 0 ? "text-warn" : "text-muted"}>
                {lowProducts.length}
              </span>{" "}
              款
            </span>
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div className="mb-8 flex flex-wrap gap-2.5">
        {LEVELS.map((l) => {
          const isActive = l.value === level;
          const href = l.value === "all" ? "/admin/stock" : `/admin/stock?level=${l.value}`;
          return (
            <Link
              key={l.value}
              href={href}
              className={`inline-flex items-center border px-4 py-2 font-mono text-[11px] tracking-[0.14em] uppercase transition-colors ${
                isActive
                  ? "border-accent bg-accent-tint text-accent"
                  : "border-border bg-surface text-fg-2 hover:border-border-hi hover:text-fg"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </div>

      {/* List */}
      <div className="border border-border bg-surface">
        {visible.length === 0 ? (
          <div className="px-6 py-16 text-center font-mono text-[12px] tracking-[0.14em] uppercase text-muted">
            {LEVEL_EMPTY_COPY[level]}
          </div>
        ) : (
          <ul>
            {visible.map((p, i) => {
              const tone = stockTone(p.stock);
              const isLast = i === visible.length - 1;
              const beanAlt = p.coverVariant
                ? `bean-cover--alt-${p.coverVariant}`
                : "";
              return (
                <li
                  key={p.id}
                  className={`grid grid-cols-[88px_1fr_auto] items-center gap-5 px-6 py-5 max-[720px]:grid-cols-[64px_1fr] max-[720px]:gap-4 ${
                    !isLast ? "border-b border-border" : ""
                  }`}
                >
                  {/* Cover thumbnail — 有真圖用 <img>，無圖 fallback bean-cover */}
                  <div
                    className={`relative aspect-[4/5] overflow-hidden border border-border max-[720px]:row-span-2 ${
                      p.images[0] ? "bg-surface" : `bean-cover ${beanAlt}`
                    }`}
                    aria-hidden={!p.images[0]}
                  >
                    {p.images[0] && (
                      <Image
                        src={p.images[0].url}
                        alt={p.images[0].alt ?? p.name}
                        fill
                        sizes="88px"
                        className="object-cover"
                      />
                    )}
                  </div>

                  {/* Middle: name + meta */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <Link
                        href={`/products/${p.slug}`}
                        prefetch={false}
                        className="truncate text-[18px] leading-[1.3] hover:text-accent"
                      >
                        {p.name}
                      </Link>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1.5 px-2 py-1 font-mono text-[10px] tracking-[0.14em] uppercase before:size-1.5 before:rounded-full ${stockPillClass[tone]}`}
                      >
                        {stockPillLabel[tone]}
                      </span>
                    </div>
                    <div className="mt-1.5 font-mono text-[11px] tracking-[0.14em] uppercase text-muted">
                      {p.origin} · NT$ {p.price.toLocaleString("zh-TW")}
                    </div>
                    <div className="mt-1 font-mono text-[10px] tracking-[0.06em] text-dim">
                      {p.slug}
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted">
                        目前庫存
                      </span>
                      <span className="font-mono text-[15px] tabular-nums text-fg">
                        {p.stock}
                      </span>
                      <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-muted">
                        包
                      </span>
                    </div>
                  </div>

                  {/* Right: adjust form */}
                  <div className="max-[720px]:col-span-2">
                    <StockAdjustForm
                      productId={p.id}
                      initialStock={p.stock}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
