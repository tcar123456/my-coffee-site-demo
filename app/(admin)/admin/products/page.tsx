// Phase 5b — 後台商品列表
// Server component；從 searchParams 解析 filter/q/page，呼叫 listProductsForAdmin。
// 結構參考 /admin/orders（filter chips + search form + table + pagination）；
// row 操作（toggle/delete）拆到 client 子檔 ProductRowActions。

import Image from "next/image";
import Link from "next/link";
import {
  listProductsForAdmin,
  type AdminProductListItem,
} from "@/app/actions/admin-products";
import { ProductRowActions } from "./ProductRowActions";

type Filter = "all" | "active" | "inactive";

const FILTERS: ReadonlyArray<{ value: Filter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "active", label: "上架中" },
  { value: "inactive", label: "已下架" },
];

function parseFilter(raw: string | undefined): Filter {
  if (raw === "active" || raw === "inactive" || raw === "all") return raw;
  return "all";
}

function buildHref(params: {
  filter?: Filter;
  q?: string;
  page?: number;
}): string {
  const sp = new URLSearchParams();
  if (params.filter && params.filter !== "all") sp.set("filter", params.filter);
  if (params.q) sp.set("q", params.q);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return qs ? `/admin/products?${qs}` : "/admin/products";
}

const priceFormatter = new Intl.NumberFormat("zh-TW");

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const filter = parseFilter(sp.filter);
  const q = sp.q?.trim() ?? "";
  const pageNum = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  // 並行撈：當前篩選列表 + 三段計數（用於 header 「共 X · 上架 Y · 下架 Z」）
  const [result, allCount, activeCount, inactiveCount] = await Promise.all([
    listProductsForAdmin({ filter, q: q || undefined, page: pageNum }),
    listProductsForAdmin({ filter: "all", page: 1 }).then((r) => r.total),
    listProductsForAdmin({ filter: "active", page: 1 }).then((r) => r.total),
    listProductsForAdmin({ filter: "inactive", page: 1 }).then((r) => r.total),
  ]);
  const { rows, total, page, totalPages } = result;

  const hasFilters = q !== "" || filter !== "all";

  return (
    <section className="bg-bg p-[clamp(28px,3.5vw,48px)]">
      {/* Header */}
      <div className="mb-8 border-b border-border pb-6">
        <div className="mb-3 font-mono text-[11px] tracking-[0.18em] uppercase">
          <Link href="/admin" className="text-muted hover:text-accent">
            後台
          </Link>
          <span className="mx-3 text-border">/</span>
          <span className="text-accent">商品管理</span>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[clamp(28px,3vw,40px)] leading-none tracking-[-0.01em]">
              商品管理
            </h1>
            <span className="mt-2.5 block font-mono text-[11px] tracking-[0.14em] uppercase text-muted">
              共 {allCount} 款
              <span className="mx-2 text-border">·</span>
              上架{" "}
              <span className={activeCount > 0 ? "text-success" : "text-muted"}>
                {activeCount}
              </span>
              <span className="mx-2 text-border">·</span>
              已下架{" "}
              <span className={inactiveCount > 0 ? "text-fg-2" : "text-muted"}>
                {inactiveCount}
              </span>
            </span>
          </div>

          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-2.5 border border-accent bg-accent px-[22px] py-3.5 font-mono text-[12px] font-semibold tracking-[0.16em] uppercase text-bg transition-all duration-200 hover:border-accent-hi hover:bg-accent-hi"
          >
            + 新增商品
          </Link>
        </div>
      </div>

      {/* Filter chips */}
      <div className="mb-6 flex flex-wrap items-center gap-2.5">
        {FILTERS.map((f) => {
          const active = f.value === filter;
          return (
            <Link
              key={f.value}
              href={buildHref({ filter: f.value, q })}
              className={`inline-flex items-center border px-3.5 py-2 font-mono text-[11px] tracking-[0.16em] uppercase transition-colors duration-150 ${
                active
                  ? "border-accent bg-accent-tint text-accent"
                  : "border-border bg-surface text-muted hover:border-border-hi hover:text-fg-2"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {/* Search form */}
      <form
        method="GET"
        action="/admin/products"
        className="mb-6 flex flex-wrap items-stretch gap-2.5"
      >
        {filter !== "all" && (
          <input type="hidden" name="filter" value={filter} />
        )}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="搜尋商品名稱 / slug / 產地"
          className="min-w-[280px] flex-1 border border-border bg-surface px-4 py-3 font-mono text-[12px] tracking-[0.04em] text-fg placeholder:text-muted focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          className="inline-flex items-center border border-border-hi bg-transparent px-[22px] py-3 font-mono text-[12px] tracking-[0.16em] uppercase text-fg transition-colors duration-200 hover:border-accent hover:text-accent"
        >
          搜尋 →
        </button>
        {hasFilters && (
          <Link
            href="/admin/products"
            className="inline-flex items-center px-3 py-3 font-mono text-[11px] tracking-[0.14em] uppercase text-muted hover:text-accent"
          >
            清除條件
          </Link>
        )}
      </form>

      {/* Table or empty */}
      {rows.length === 0 ? (
        <div className="border border-border bg-surface px-6 py-[clamp(64px,8vw,112px)] text-center">
          <p className="text-[22px] leading-[1.4] text-fg-2">
            沒有符合條件的商品
          </p>
          <p className="mt-3 font-mono text-[11px] tracking-[0.08em] text-muted">
            調整篩選或關鍵字後再試一次，或新增第一款商品。
          </p>
        </div>
      ) : (
        <div className="border border-border bg-surface">
          <table className="w-full">
            <thead>
              <tr>
                {[
                  { label: "縮圖", align: "left" },
                  { label: "名稱", align: "left" },
                  { label: "產地", align: "left" },
                  { label: "價格", align: "right" },
                  { label: "庫存", align: "right" },
                  { label: "圖片", align: "right" },
                  { label: "狀態", align: "left" },
                  { label: "操作", align: "right" },
                ].map((h) => (
                  <th
                    key={h.label}
                    className={`border-b border-border bg-surface-2 px-6 py-3 font-mono text-[10px] font-normal tracking-[0.16em] uppercase text-muted ${
                      h.align === "right" ? "text-right" : "text-left"
                    }`}
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((p, i) => {
                const isLast = i === rows.length - 1;
                const cellBorder = isLast ? "" : "border-b border-border";
                return (
                  <ProductRow
                    key={p.id}
                    product={p}
                    cellBorder={cellBorder}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {rows.length > 0 && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between border-t border-border pt-5 font-mono text-[11px] tracking-[0.14em] uppercase">
          {page > 1 ? (
            <Link
              href={buildHref({ filter, q, page: page - 1 })}
              className="text-fg-2 hover:text-accent"
            >
              ← 上一頁
            </Link>
          ) : (
            <span className="text-border">← 上一頁</span>
          )}
          <span className="text-muted">
            Page {page.toString().padStart(2, "0")} /{" "}
            {totalPages.toString().padStart(2, "0")}
            <span className="mx-2 text-border">·</span>
            共 {total} 筆
          </span>
          {page < totalPages ? (
            <Link
              href={buildHref({ filter, q, page: page + 1 })}
              className="text-fg-2 hover:text-accent"
            >
              下一頁 →
            </Link>
          ) : (
            <span className="text-border">下一頁 →</span>
          )}
        </div>
      )}
    </section>
  );
}

/* ============ inline helpers ============ */

function ProductRow({
  product,
  cellBorder,
}: {
  product: AdminProductListItem;
  cellBorder: string;
}) {
  const beanAlt = product.coverVariant
    ? `bean-cover--alt-${product.coverVariant}`
    : "";
  const stockTone =
    product.stock === 0
      ? "text-danger"
      : product.stock < 20
        ? "text-warn"
        : "text-fg";

  return (
    <tr className="transition-colors hover:[&>td]:bg-surface-2">
      {/* 縮圖 */}
      <td className={`px-6 py-3 ${cellBorder}`}>
        {product.primaryImageUrl ? (
          <Image
            src={product.primaryImageUrl}
            alt={product.name}
            width={48}
            height={48}
            sizes="48px"
            className="size-12 border border-border object-cover"
          />
        ) : (
          <div
            className={`bean-cover ${beanAlt} size-12 border border-border`}
            aria-hidden
          />
        )}
      </td>

      {/* 名稱 + slug */}
      <td className={`px-6 py-3 ${cellBorder}`}>
        <div className="text-[15px] leading-[1.3] text-fg">
          {product.name}
        </div>
        <div className="mt-1 font-mono text-[10px] tracking-[0.06em] text-dim">
          {product.slug}
        </div>
      </td>

      {/* 產地 */}
      <td
        className={`px-6 py-3 font-mono text-[11px] tracking-[0.12em] uppercase text-fg-2 ${cellBorder}`}
      >
        {product.origin}
      </td>

      {/* 價格 */}
      <td
        className={`px-6 py-3 text-right font-mono text-[13px] tabular-nums text-fg-2 ${cellBorder}`}
      >
        NT$ {priceFormatter.format(product.price)}
      </td>

      {/* 庫存 */}
      <td
        className={`px-6 py-3 text-right font-mono text-[13px] tabular-nums ${stockTone} ${cellBorder}`}
      >
        {product.stock}
      </td>

      {/* 圖片數 */}
      <td
        className={`px-6 py-3 text-right font-mono text-[12px] tabular-nums text-muted ${cellBorder}`}
      >
        {product.imageCount}
      </td>

      {/* 狀態 pill */}
      <td className={`px-6 py-3 ${cellBorder}`}>
        <span
          className={`inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.16em] uppercase before:size-1.5 before:rounded-full ${
            product.isActive
              ? "text-success before:bg-success"
              : "text-muted before:bg-muted"
          }`}
        >
          {product.isActive ? "上架中" : "已下架"}
        </span>
      </td>

      {/* 操作 */}
      <td className={`px-6 py-3 ${cellBorder}`}>
        <ProductRowActions
          productId={product.id}
          isActive={product.isActive}
        />
      </td>
    </tr>
  );
}
