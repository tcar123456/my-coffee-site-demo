import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "../../../generated/prisma/client";
import { RoastLevel } from "../../../generated/prisma/enums";
import { FilterRail } from "./FilterRail";
import { SortSelect } from "./SortSelect";

const roastLabel: Record<RoastLevel, string> = {
  LIGHT: "淺焙",
  MEDIUM_LIGHT: "中淺",
  MEDIUM: "中焙",
  MEDIUM_DARK: "中深",
  DARK: "深焙",
};

const ROAST_FILTER = [
  { value: RoastLevel.LIGHT, label: "淺焙" },
  { value: RoastLevel.MEDIUM_LIGHT, label: "中淺" },
  { value: RoastLevel.MEDIUM, label: "中焙" },
  { value: RoastLevel.MEDIUM_DARK, label: "中深" },
  { value: RoastLevel.DARK, label: "深焙" },
];

const ORIGIN_FILTER = [
  "衣索比亞",
  "哥倫比亞",
  "巴拿馬",
  "肯亞",
  "瓜地馬拉",
  "葉門",
  "印尼",
  "哥斯大黎加",
];

const PROCESSING_FILTER = ["水洗", "日曬", "蜜處理", "厭氧發酵", "濕剝法"];

function toArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function isValidRoast(v: string): v is RoastLevel {
  return (Object.values(RoastLevel) as string[]).includes(v);
}

type SearchParams = {
  origin?: string | string[];
  roast?: string | string[];
  processing?: string | string[];
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const origins = toArray(params.origin).filter((v) => ORIGIN_FILTER.includes(v));
  const roasts = toArray(params.roast).filter(isValidRoast);
  const processings = toArray(params.processing).filter((v) =>
    PROCESSING_FILTER.includes(v),
  );
  const minPrice = params.minPrice ? Number.parseInt(params.minPrice) : undefined;
  const maxPrice = params.maxPrice ? Number.parseInt(params.maxPrice) : undefined;
  const sort = params.sort ?? "recommended";

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    ...(origins.length > 0 && {
      OR: origins.map((o) => ({ origin: { contains: o } })),
    }),
    ...(roasts.length > 0 && { roastLevel: { in: roasts } }),
    ...(processings.length > 0 && { processingMethod: { in: processings } }),
    ...((minPrice !== undefined || maxPrice !== undefined) && {
      price: {
        ...(minPrice !== undefined && { gte: minPrice }),
        ...(maxPrice !== undefined && { lte: maxPrice }),
      },
    }),
  };

  const orderBy: Prisma.ProductOrderByWithRelationInput = (() => {
    switch (sort) {
      case "price-asc":
        return { price: "asc" };
      case "price-desc":
        return { price: "desc" };
      case "roast-asc":
        return { roastLevel: "asc" };
      case "newest":
        return { createdAt: "desc" };
      default:
        return { createdAt: "asc" };
    }
  })();

  // 平行：篩選後的商品 + 用於 filter rail 的全部 active 商品（算 count 用）
  const [products, allProducts] = await Promise.all([
    prisma.product.findMany({ where, orderBy }),
    prisma.product.findMany({
      where: { isActive: true },
      select: { origin: true, roastLevel: true, processingMethod: true },
    }),
  ]);

  const totalCount = allProducts.length;

  // 計算每個 filter option 在 active 商品集合中的數量
  const originCounts = new Map<string, number>();
  const roastCounts = new Map<string, number>();
  const processingCounts = new Map<string, number>();
  for (const p of allProducts) {
    for (const o of ORIGIN_FILTER) {
      if (p.origin.includes(o)) originCounts.set(o, (originCounts.get(o) ?? 0) + 1);
    }
    roastCounts.set(p.roastLevel, (roastCounts.get(p.roastLevel) ?? 0) + 1);
    if (PROCESSING_FILTER.includes(p.processingMethod)) {
      processingCounts.set(
        p.processingMethod,
        (processingCounts.get(p.processingMethod) ?? 0) + 1,
      );
    }
  }

  const filterGroups = [
    {
      key: "origin" as const,
      title: "產地",
      options: ORIGIN_FILTER.filter((o) => (originCounts.get(o) ?? 0) > 0).map(
        (o) => ({ value: o, label: o, count: originCounts.get(o) ?? 0 }),
      ),
    },
    {
      key: "roast" as const,
      title: "烘焙度",
      options: ROAST_FILTER.filter((r) => (roastCounts.get(r.value) ?? 0) > 0).map(
        (r) => ({ value: r.value, label: r.label, count: roastCounts.get(r.value) ?? 0 }),
      ),
    },
    {
      key: "processing" as const,
      title: "處理法",
      options: PROCESSING_FILTER.filter((p) => (processingCounts.get(p) ?? 0) > 0).map(
        (p) => ({ value: p, label: p, count: processingCounts.get(p) ?? 0 }),
      ),
    },
  ];

  return (
    <>
      {/* Page header */}
      <section className="border-b border-border px-[var(--gutter)] pt-[clamp(48px,6vw,80px)] pb-[clamp(32px,4vw,48px)]">
        <div className="mx-auto grid max-w-[var(--max)] grid-cols-[1fr_auto] items-end gap-6 max-[640px]:grid-cols-1">
          <div>
            <div className="mb-[18px] font-mono text-[11px] tracking-[0.16em] uppercase text-muted">
              <Link href="/" className="text-muted hover:text-accent">
                首頁
              </Link>
              <span className="px-2 text-dim">/</span>
              <span>單品咖啡</span>
            </div>
            <h1 className="font-serif text-[clamp(36px,4.6vw,60px)] leading-none tracking-[-0.02em]">
              當季 · 全部單品
            </h1>
            <p className="mt-3.5 max-w-[52ch] text-[15px] leading-[1.55] text-fg-2">
              {totalCount} 支來自小型莊園的精選單品。建議養豆 7–10 天後沖煮。
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] tracking-[0.14em] text-muted">
              顯示 {products.length} / {totalCount}
            </span>
            <SortSelect current={sort} />
          </div>
        </div>
      </section>

      {/* Shop layout */}
      <section className="mx-auto grid max-w-[var(--max)] grid-cols-[240px_1fr] items-start gap-14 px-[var(--gutter)] pt-[clamp(32px,4vw,56px)] pb-[clamp(64px,8vw,112px)] max-[900px]:grid-cols-1 max-[900px]:gap-10">
        <FilterRail
          groups={filterGroups}
          initial={{
            origin: origins,
            roast: roasts,
            processing: processings,
            minPrice: params.minPrice,
            maxPrice: params.maxPrice,
            sort: params.sort,
          }}
        />

        {/* Grid */}
        <div>
          {products.length === 0 ? (
            <div className="border border-border bg-surface px-8 py-16 text-center">
              <p className="font-serif text-[20px] text-fg-2">沒有符合條件的單品</p>
              <p className="mt-2 font-mono text-[11px] tracking-[0.08em] text-muted">
                試著放寬篩選條件，或清除篩選查看所有單品。
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-6 max-[1100px]:grid-cols-2 max-[580px]:grid-cols-1">
              {products.map((p, i) => {
                const soldOut = p.stock === 0;
                const no = String(i + 1).padStart(2, "0");
                return (
                  <Link
                    key={p.id}
                    href={`/products/${p.slug}`}
                    className={`group flex flex-col border border-border bg-surface transition-all duration-300 ${
                      soldOut ? "" : "hover:-translate-y-[3px] hover:border-border-hi"
                    }`}
                  >
                    <div
                      className={`bean-cover ${
                        p.coverVariant ? `bean-cover--alt-${p.coverVariant}` : ""
                      } relative aspect-[4/5] overflow-hidden`}
                    >
                      <span className="absolute top-4 left-4 z-10 font-mono text-[10px] tracking-[0.22em] text-fg-2">
                        N° {no}
                      </span>
                      <span className="absolute top-4 right-4 z-10 font-mono text-[10px] tracking-[0.16em] uppercase text-accent">
                        {roastLabel[p.roastLevel]}
                      </span>
                      {p.badge && (
                        <span className="absolute bottom-4 left-4 z-[2] border border-accent-tint bg-bg px-2 py-1 font-mono text-[9px] tracking-[0.18em] uppercase text-accent">
                          {p.badge}
                        </span>
                      )}
                      {soldOut && (
                        <div className="absolute inset-0 z-[3] flex items-center justify-center bg-[oklch(15%_0.005_250_/_0.7)] backdrop-blur-[2px] font-mono text-[12px] tracking-[0.32em] uppercase text-accent">
                          已售完
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col gap-3 p-5">
                      <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted">
                        {p.origin}
                      </span>
                      <h3 className="font-serif text-[20px] leading-[1.2] text-fg">
                        {p.name}
                      </h3>
                      <p className="font-serif text-[13px] italic leading-[1.5] text-fg-2">
                        {p.flavorNotes}
                      </p>
                      <div className="mt-auto flex items-end justify-between border-t border-border pt-4">
                        <div>
                          <div
                            className={`font-serif text-[22px] tabular-nums ${soldOut ? "text-muted" : ""}`}
                          >
                            <span className="mr-1 font-mono text-[11px] tracking-[0.08em] text-muted">
                              NT$
                            </span>
                            {p.price.toLocaleString("zh-TW")}
                          </div>
                          <div className="font-mono text-[10px] tracking-[0.14em] text-muted">
                            {p.weightGram}g
                          </div>
                        </div>
                        <span
                          className={`font-mono text-[10px] tracking-[0.18em] uppercase ${soldOut ? "text-muted" : "text-accent"}`}
                        >
                          {soldOut ? "通知我 →" : "查看 →"}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Pager — Phase 5 補商品時再做 */}
          <div className="mt-14 flex items-center justify-between border-t border-border pt-8 font-mono text-[12px] tracking-[0.1em] text-muted">
            <span>第 1 頁 / 共 1 頁 — {products.length} 個結果</span>
            <div className="flex gap-2">
              <span
                aria-current="page"
                className="border border-accent bg-accent px-3 py-1.5 text-bg"
              >
                01
              </span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
