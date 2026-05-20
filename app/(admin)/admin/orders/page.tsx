// Phase 5a — 後台訂單列表
// Server component；從 searchParams 解析 status/q/page，呼叫 listOrdersForAdmin。
// 狀態 chips 走 <Link>，搜尋走原生 <form method="GET">（保留現有 status filter）。

import Link from "next/link";
import { listOrdersForAdmin } from "@/app/actions/admin-orders";
import { ORDER_STATUS_LABEL } from "@/lib/order-state";
import { OrderStatus } from "@/generated/prisma/enums";

const statusPillClasses: Record<OrderStatus, string> = {
  PENDING: "text-warn border-[oklch(45%_0.10_70)] before:bg-warn",
  PAID: "text-accent border-accent-tint before:bg-accent",
  SHIPPED: "text-success border-[oklch(40%_0.06_145)] before:bg-success",
  DELIVERED: "text-muted border-border before:bg-muted",
  CANCELLED: "text-danger border-[oklch(40%_0.10_25)] before:bg-danger",
};

const dateFormatter = new Intl.DateTimeFormat("zh-TW", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

type FilterValue = "ALL" | OrderStatus;

const FILTERS: Array<{ value: FilterValue; label: string }> = [
  { value: "ALL", label: "全部" },
  { value: "PENDING", label: "待付款" },
  { value: "PAID", label: "已付款" },
  { value: "SHIPPED", label: "已出貨" },
  { value: "DELIVERED", label: "已送達" },
  { value: "CANCELLED", label: "已取消" },
];

function isOrderStatus(value: string | undefined): value is OrderStatus {
  return (
    !!value &&
    (Object.values(OrderStatus) as string[]).includes(value)
  );
}

function buildHref(params: {
  status?: FilterValue;
  q?: string;
  page?: number;
}): string {
  const sp = new URLSearchParams();
  if (params.status && params.status !== "ALL") sp.set("status", params.status);
  if (params.q) sp.set("q", params.q);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return qs ? `/admin/orders?${qs}` : "/admin/orders";
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const rawStatus = sp.status;
  const filterValue: FilterValue = isOrderStatus(rawStatus) ? rawStatus : "ALL";
  const q = sp.q?.trim() ?? "";
  const pageNum = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const result = await listOrdersForAdmin({
    status: filterValue,
    q: q || undefined,
    page: pageNum,
  });
  const { rows, total, page, totalPages } = result;

  return (
    <section className="bg-bg p-[clamp(28px,3.5vw,48px)]">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="mb-2.5 font-mono text-[11px] tracking-[0.16em] uppercase text-muted">
            <Link href="/admin" className="hover:text-accent">
              ← 後台總覽
            </Link>
          </div>
          <h1 className="text-[clamp(28px,3vw,40px)] leading-none tracking-[-0.01em]">
            訂單管理
          </h1>
          <span className="mt-2.5 block font-mono text-[11px] tracking-[0.14em] uppercase text-muted">
            共 {total.toString().padStart(2, "0")} 筆訂單
            {filterValue !== "ALL" && (
              <>
                <span className="mx-2 text-border">·</span>
                篩選：{ORDER_STATUS_LABEL[filterValue]}
              </>
            )}
            {q && (
              <>
                <span className="mx-2 text-border">·</span>
                關鍵字：{q}
              </>
            )}
          </span>
        </div>
      </div>

      {/* Filter rail */}
      <div className="mb-6 flex flex-wrap items-center gap-2.5">
        {FILTERS.map((f) => {
          const active = f.value === filterValue;
          return (
            <Link
              key={f.value}
              href={buildHref({ status: f.value, q })}
              className={`inline-flex items-center px-3.5 py-2 font-mono text-[11px] tracking-[0.16em] uppercase transition-colors duration-150 ${
                active
                  ? "border border-accent text-accent bg-accent-tint"
                  : "border border-border text-muted hover:border-border-hi hover:text-fg-2"
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
        action="/admin/orders"
        className="mb-6 flex flex-wrap items-stretch gap-2.5"
      >
        {filterValue !== "ALL" && (
          <input type="hidden" name="status" value={filterValue} />
        )}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="搜尋訂單編號 / 收件人 / 顧客 Email"
          className="min-w-[280px] flex-1 border border-border bg-surface px-4 py-3 font-mono text-[12px] tracking-[0.04em] text-fg placeholder:text-muted focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          className="inline-flex items-center border border-border-hi bg-transparent px-[22px] py-3 font-mono text-[12px] tracking-[0.16em] uppercase text-fg transition-colors duration-200 hover:border-accent hover:text-accent"
        >
          搜尋 →
        </button>
        {(q || filterValue !== "ALL") && (
          <Link
            href="/admin/orders"
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
            沒有符合條件的訂單
          </p>
          <p className="mt-3 font-mono text-[11px] tracking-[0.08em] text-muted">
            調整篩選條件或清空關鍵字後再試一次。
          </p>
        </div>
      ) : (
        <div className="border border-border bg-surface">
          <table className="w-full">
            <thead>
              <tr>
                {[
                  { label: "#訂單編號", align: "left" },
                  { label: "時間", align: "left" },
                  { label: "顧客", align: "left" },
                  { label: "配送地", align: "left" },
                  { label: "件數", align: "left" },
                  { label: "狀態", align: "left" },
                  { label: "金額", align: "right" },
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
              {rows.map((o, i) => {
                const isLast = i === rows.length - 1;
                const cellBorder = isLast ? "" : "border-b border-border";
                return (
                  <tr
                    key={o.id}
                    className="transition-colors hover:[&>td]:bg-surface-2"
                  >
                    <td className={`px-6 py-3 ${cellBorder}`}>
                      <Link
                        href={`/admin/orders/${o.orderNumber}`}
                        className="font-mono text-[12px] text-accent hover:underline"
                      >
                        #{o.orderNumber}
                      </Link>
                    </td>
                    <td
                      className={`px-6 py-3 font-mono text-[12px] text-fg-2 tabular-nums ${cellBorder}`}
                    >
                      {dateFormatter.format(o.createdAt)}
                    </td>
                    <td className={`px-6 py-3 text-[13px] ${cellBorder}`}>
                      <div className="text-fg">{o.recipientName}</div>
                      <div className="mt-0.5 font-mono text-[11px] text-muted">
                        {o.customerEmail}
                      </div>
                    </td>
                    <td
                      className={`px-6 py-3 text-[13px] text-fg-2 ${cellBorder}`}
                    >
                      {o.shippingCity}
                    </td>
                    <td
                      className={`px-6 py-3 font-mono text-[12px] text-fg-2 tabular-nums ${cellBorder}`}
                    >
                      {o.itemCount}
                    </td>
                    <td className={`px-6 py-3 ${cellBorder}`}>
                      <span
                        className={`inline-flex items-center gap-1.5 border px-2.5 py-[5px] font-mono text-[10px] tracking-[0.16em] uppercase before:size-1.5 before:rounded-full ${statusPillClasses[o.status]}`}
                      >
                        {ORDER_STATUS_LABEL[o.status]}
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
        </div>
      )}

      {/* Pagination */}
      {rows.length > 0 && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between border-t border-border pt-5 font-mono text-[11px] tracking-[0.14em] uppercase">
          {page > 1 ? (
            <Link
              href={buildHref({ status: filterValue, q, page: page - 1 })}
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
          </span>
          {page < totalPages ? (
            <Link
              href={buildHref({ status: filterValue, q, page: page + 1 })}
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
