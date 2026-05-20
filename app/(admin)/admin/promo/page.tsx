// Phase 5c — 後台優惠碼列表
// Server component；filter chips（all/active/inactive）+ search + pagination + 狀態 tag。
// 5 種狀態（ACTIVE/SCHEDULED/EXPIRED/EXHAUSTED/DISABLED）由 getPromoCodeStatus 純函式計算。

import Link from "next/link";
import { listPromoCodesForAdmin } from "@/app/actions/admin-promo";
import {
  getPromoCodeStatus,
  type PromoCodeStatus,
} from "@/lib/schemas/promo-code";
import { PromoRowActions } from "./PromoRowActions";

type Filter = "all" | "active" | "inactive";

const FILTERS: ReadonlyArray<{ value: Filter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "active", label: "啟用中" },
  { value: "inactive", label: "已停用" },
];

const STATUS_LABEL: Record<PromoCodeStatus, string> = {
  ACTIVE: "進行中",
  SCHEDULED: "尚未開始",
  EXPIRED: "已過期",
  EXHAUSTED: "次數用罄",
  DISABLED: "已停用",
};

const STATUS_PILL: Record<PromoCodeStatus, string> = {
  ACTIVE: "text-success before:bg-success",
  SCHEDULED: "text-accent before:bg-accent",
  EXPIRED: "text-muted before:bg-muted",
  EXHAUSTED: "text-warn before:bg-warn",
  DISABLED: "text-danger before:bg-danger",
};

function parseFilter(raw: string | undefined): Filter {
  if (raw === "active" || raw === "inactive" || raw === "all") return raw;
  return "all";
}

function buildHref(params: { filter?: Filter; q?: string; page?: number }): string {
  const sp = new URLSearchParams();
  if (params.filter && params.filter !== "all") sp.set("filter", params.filter);
  if (params.q) sp.set("q", params.q);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return qs ? `/admin/promo?${qs}` : "/admin/promo";
}

const dateFormatter = new Intl.DateTimeFormat("zh-TW", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export default async function AdminPromoPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const filter = parseFilter(sp.filter);
  const q = sp.q?.trim() ?? "";
  const pageNum = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const result = await listPromoCodesForAdmin({ filter, q: q || undefined, page: pageNum });
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
          <span className="text-accent">優惠碼</span>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[clamp(28px,3vw,40px)] leading-none tracking-[-0.01em]">
              優惠碼
            </h1>
            <span className="mt-2.5 block font-mono text-[11px] tracking-[0.14em] uppercase text-muted">
              共 {total} 組（含已停用）
            </span>
          </div>
          <Link
            href="/admin/promo/new"
            className="inline-flex items-center gap-2.5 border border-accent bg-accent px-[22px] py-3.5 font-mono text-[12px] font-semibold tracking-[0.16em] uppercase text-bg transition-all duration-200 hover:border-accent-hi hover:bg-accent-hi"
          >
            + 新增優惠碼
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
        action="/admin/promo"
        className="mb-6 flex flex-wrap items-stretch gap-2.5"
      >
        {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="搜尋優惠碼 / 說明"
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
            href="/admin/promo"
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
            沒有符合條件的優惠碼
          </p>
          <p className="mt-3 font-mono text-[11px] tracking-[0.08em] text-muted">
            調整篩選或新增第一組優惠碼。
          </p>
        </div>
      ) : (
        <div className="border border-border bg-surface">
          <table className="w-full">
            <thead>
              <tr>
                {[
                  { label: "代碼", align: "left" },
                  { label: "說明", align: "left" },
                  { label: "折扣", align: "right" },
                  { label: "最低消費", align: "right" },
                  { label: "使用次數", align: "right" },
                  { label: "有效期間", align: "left" },
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
                const status = getPromoCodeStatus(p);
                const discountLabel =
                  p.discountType === "PERCENT"
                    ? `${p.discountValue} %`
                    : `NT$ ${p.discountValue.toLocaleString("zh-TW")}`;
                const usedPct =
                  p.maxUses === null
                    ? null
                    : Math.min(100, Math.round((p.usedCount / p.maxUses) * 100));
                return (
                  <tr key={p.id} className="transition-colors hover:[&>td]:bg-surface-2">
                    <td className={`px-6 py-3 ${cellBorder}`}>
                      <span className="font-mono text-[13px] font-semibold tracking-[0.04em] text-accent">
                        {p.code}
                      </span>
                    </td>
                    <td className={`px-6 py-3 text-[13px] text-fg-2 ${cellBorder}`}>
                      {p.description ?? <span className="text-dim">—</span>}
                    </td>
                    <td
                      className={`px-6 py-3 text-right font-mono text-[13px] tabular-nums text-fg ${cellBorder}`}
                    >
                      {discountLabel}
                    </td>
                    <td
                      className={`px-6 py-3 text-right font-mono text-[12px] tabular-nums text-fg-2 ${cellBorder}`}
                    >
                      {p.minSubtotal > 0
                        ? `NT$ ${p.minSubtotal.toLocaleString("zh-TW")}`
                        : <span className="text-dim">—</span>}
                    </td>
                    <td
                      className={`px-6 py-3 text-right font-mono text-[12px] tabular-nums ${cellBorder}`}
                    >
                      <div className="text-fg">
                        {p.usedCount}
                        {p.maxUses !== null && (
                          <span className="text-dim"> / {p.maxUses}</span>
                        )}
                      </div>
                      {usedPct !== null && (
                        <div className="mt-1 h-0.5 w-16 overflow-hidden border border-border bg-bg ml-auto">
                          <div
                            className={`h-full ${
                              usedPct >= 100 ? "bg-warn" : "bg-accent"
                            }`}
                            style={{ width: `${usedPct}%` }}
                          />
                        </div>
                      )}
                    </td>
                    <td className={`px-6 py-3 text-[12px] text-fg-2 ${cellBorder}`}>
                      {p.startsAt || p.endsAt ? (
                        <div className="font-mono">
                          {p.startsAt ? dateFormatter.format(p.startsAt) : "立即"}
                          <span className="mx-1.5 text-dim">→</span>
                          {p.endsAt ? dateFormatter.format(p.endsAt) : "永久"}
                        </div>
                      ) : (
                        <span className="text-dim">永久</span>
                      )}
                    </td>
                    <td className={`px-6 py-3 ${cellBorder}`}>
                      <span
                        className={`inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] uppercase before:size-1.5 before:rounded-full ${STATUS_PILL[status]}`}
                      >
                        {STATUS_LABEL[status]}
                      </span>
                    </td>
                    <td className={`px-6 py-3 ${cellBorder}`}>
                      <PromoRowActions promoId={p.id} isActive={p.isActive} />
                    </td>
                  </tr>
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
