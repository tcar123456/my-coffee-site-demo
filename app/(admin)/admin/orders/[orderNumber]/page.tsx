// Phase 5a — 後台訂單詳情
// Server component；getOrderForAdmin null → notFound()。
// 互動（推進狀態 / 取消）拆到 StatusActions client component；列印走另頁。

import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderForAdmin } from "@/app/actions/admin-orders";
import { ORDER_STATUS_LABEL } from "@/lib/order-state";
import {
  SHIPPING_METHOD_LABELS,
  PAYMENT_METHOD_LABELS,
  type ShippingMethod,
  type PaymentMethod,
} from "@/lib/shipping";
import { getGrindLabel, getPkgLabel } from "@/lib/cart-options";
import type { OrderStatus, PaymentMethod as PrismaPaymentMethod } from "@/generated/prisma/enums";
import { StatusActions } from "./StatusActions";
import { CreateShipmentButton } from "./CreateShipmentButton";

type OrderItemRow = {
  id: string;
  productName: string;
  unitPrice: number;
  qty: number;
  grind: string | null;
  pkg: string | null;
};

const statusPillClasses: Record<OrderStatus, string> = {
  PENDING: "text-warn border-[oklch(45%_0.10_70)] before:bg-warn",
  PAID: "text-accent border-accent-tint before:bg-accent",
  SHIPPED: "text-success border-[oklch(40%_0.06_145)] before:bg-success",
  DELIVERED: "text-muted border-border before:bg-muted",
  CANCELLED: "text-danger border-[oklch(40%_0.10_25)] before:bg-danger",
};

const PRINTABLE_STATUSES: OrderStatus[] = ["PAID", "SHIPPED", "DELIVERED"];

const dateFormatter = new Intl.DateTimeFormat("zh-TW", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const order = await getOrderForAdmin(orderNumber);
  if (!order) notFound();

  const status = order.status as OrderStatus;
  const items = order.items as OrderItemRow[];
  const totalQty = items.reduce((s, i) => s + i.qty, 0);
  const canPrint = PRINTABLE_STATUSES.includes(status);

  return (
    <section className="bg-bg p-[clamp(28px,3.5vw,48px)]">
      {/* Header */}
      <div className="mb-8 border-b border-border pb-6">
        <div className="mb-3 font-mono text-[11px] tracking-[0.16em] uppercase">
          <Link href="/admin" className="text-muted hover:text-accent">
            後台
          </Link>
          <span className="mx-3 text-border">/</span>
          <Link href="/admin/orders" className="text-muted hover:text-accent">
            訂單管理
          </Link>
          <span className="mx-3 text-border">/</span>
          <span className="text-accent">#{order.orderNumber}</span>
        </div>

        <div className="grid grid-cols-[1fr_auto] items-end gap-6 max-[640px]:grid-cols-1">
          <div>
            <h1 className="font-serif text-[clamp(28px,3vw,40px)] leading-none tracking-[-0.01em]">
              #{order.orderNumber}
            </h1>
            <div className="mt-3 font-mono text-[11px] tracking-[0.14em] uppercase text-muted">
              建立於 {dateFormatter.format(order.createdAt)}
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 border px-3 py-1.5 font-mono text-[11px] tracking-[0.18em] uppercase before:size-1.5 before:rounded-full ${statusPillClasses[status]}`}
          >
            {ORDER_STATUS_LABEL[status]}
          </span>
        </div>

        {/* Timestamps row */}
        <div className="mt-6 flex flex-wrap gap-x-7 gap-y-2 font-mono text-[11px] text-muted">
          <span>
            <span className="text-fg-2">建立 · </span>
            {dateFormatter.format(order.createdAt)}
          </span>
          {order.paidAt && (
            <span>
              <span className="text-fg-2">付款 · </span>
              {dateFormatter.format(order.paidAt)}
            </span>
          )}
          {order.shippedAt && (
            <span>
              <span className="text-fg-2">出貨 · </span>
              {dateFormatter.format(order.shippedAt)}
            </span>
          )}
          {order.deliveredAt && (
            <span>
              <span className="text-fg-2">送達 · </span>
              {dateFormatter.format(order.deliveredAt)}
            </span>
          )}
          {order.cancelledAt && (
            <span>
              <span className="text-danger">取消 · </span>
              {dateFormatter.format(order.cancelledAt)}
            </span>
          )}
        </div>
      </div>

      {/* Body grid */}
      <div className="grid grid-cols-[1.6fr_1fr] items-start gap-6 max-[900px]:grid-cols-1">
        {/* Left */}
        <div className="flex flex-col gap-6">
          <Panel title={`訂單品項 · ${totalQty} 件`}>
            {items.map((item) => {
              const lineTotal = item.unitPrice * item.qty;
              return (
                <div
                  key={item.id}
                  className="grid grid-cols-[1fr_auto] items-start gap-4 border-b border-border py-5 last:border-b-0 first:pt-0"
                >
                  <div>
                    <h3 className="font-serif text-[17px] leading-[1.3]">
                      {item.productName}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px] text-fg-2">
                      <span>
                        <span className="mr-1.5 text-[10px] tracking-[0.14em] uppercase text-muted">
                          研磨
                        </span>
                        {getGrindLabel(item.grind)}
                      </span>
                      <span>
                        <span className="mr-1.5 text-[10px] tracking-[0.14em] uppercase text-muted">
                          包裝
                        </span>
                        {getPkgLabel(item.pkg)}
                      </span>
                    </div>
                    <div className="mt-2 font-mono text-[11px] text-muted">
                      NT$ {item.unitPrice.toLocaleString("zh-TW")} × {item.qty}
                    </div>
                  </div>
                  <div className="min-w-[100px] text-right font-serif text-[18px] tabular-nums">
                    <small className="mr-1 font-mono text-[11px] text-muted">
                      NT$
                    </small>
                    {lineTotal.toLocaleString("zh-TW")}
                  </div>
                </div>
              );
            })}
          </Panel>

          <Panel title="配送資訊">
            <dl className="grid grid-cols-[100px_1fr] gap-y-3.5 text-[14px] max-[480px]:grid-cols-1 max-[480px]:gap-y-1">
              <Row label="收件人" value={order.recipientName} />
              <Row
                label="聯絡電話"
                value={
                  <span className="font-mono tabular-nums">
                    {order.recipientPhone}
                  </span>
                }
              />
              <Row
                label="收件地址"
                value={
                  <span>
                    <span className="font-mono text-[12px] text-muted">
                      {order.shippingZipCode}
                    </span>{" "}
                    {order.shippingCity}
                    {order.shippingDistrict}
                    {order.shippingStreet}
                  </span>
                }
              />
              <Row
                label="配送方式"
                value={
                  SHIPPING_METHOD_LABELS[
                    order.shippingMethod as ShippingMethod
                  ] ?? order.shippingMethod
                }
              />
              {order.cvsStoreName && (
                <Row
                  label="取貨門市"
                  value={
                    <span>
                      <span className="block">{order.cvsStoreName}</span>
                      <span className="mt-0.5 block font-mono text-[11px] text-muted">
                        {order.cvsAddress} · #{order.cvsStoreId}
                      </span>
                    </span>
                  }
                />
              )}
            </dl>
          </Panel>

          <Panel title="顧客資訊">
            <dl className="grid grid-cols-[100px_1fr] gap-y-3.5 text-[14px] max-[480px]:grid-cols-1 max-[480px]:gap-y-1">
              <Row
                label="Email"
                value={
                  <span className="font-mono text-[13px] text-fg-2">
                    {order.user.email}
                  </span>
                }
              />
              <Row
                label="會員姓名"
                value={order.user.name ?? <span className="text-muted">—</span>}
              />
            </dl>
          </Panel>
        </div>

        {/* Right — sticky summary + actions */}
        <aside className="sticky top-20 flex flex-col gap-6 max-[900px]:static">
          <Panel title="金額明細">
            <SumRow
              label="小計"
              value={`NT$ ${order.subtotal.toLocaleString("zh-TW")}`}
            />
            <SumRow
              label="運費"
              value={
                order.shippingFee === 0 ? (
                  <span className="text-success">免運</span>
                ) : (
                  `NT$ ${order.shippingFee.toLocaleString("zh-TW")}`
                )
              }
            />
            <div className="mt-4 flex items-baseline justify-between border-t border-border pt-6">
              <span className="font-mono text-[11px] tracking-[0.18em] uppercase text-muted">
                總計
              </span>
              <span className="font-serif text-[32px] tabular-nums text-accent">
                <small className="mr-1.5 font-mono text-[12px] text-muted">
                  NT$
                </small>
                {order.total.toLocaleString("zh-TW")}
              </span>
            </div>

            <div className="mt-6 border-t border-border pt-5">
              <div className="mb-1 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">
                付款方式
              </div>
              <div className="font-serif text-[16px]">
                {PAYMENT_METHOD_LABELS[
                  order.paymentMethod as PaymentMethod
                ] ?? order.paymentMethod}
              </div>
              {order.paidAt && (
                <div className="mt-1.5 font-mono text-[11px] text-muted">
                  已收款 · {dateFormatter.format(order.paidAt)}
                </div>
              )}
            </div>
          </Panel>

          <Panel title="狀態操作">
            <StatusActions
              orderNumber={order.orderNumber}
              status={status}
              paymentMethod={order.paymentMethod as PrismaPaymentMethod}
            />
            {canPrint && (
              <div className="mt-5 border-t border-border pt-5">
                <Link
                  href={`/admin/orders/${order.orderNumber}/print`}
                  target="_blank"
                  className="inline-flex items-center justify-center gap-2.5 border border-border-hi bg-transparent px-[22px] py-3 font-mono text-[12px] tracking-[0.16em] uppercase text-fg-2 transition-colors duration-200 hover:border-accent hover:text-accent"
                >
                  列印出貨單 ↗
                </Link>
              </div>
            )}
          </Panel>

          {/* Phase 8c — 物流單操作（PAID 且未建單顯示 build；已建單顯示 LogisticsId） */}
          <Panel title="物流單">
            {order.logisticsId ? (
              <dl className="grid grid-cols-[100px_1fr] gap-y-3 text-[14px]">
                <Row
                  label="物流編號"
                  value={
                    <span className="font-mono tabular-nums text-accent">
                      {order.logisticsId}
                    </span>
                  }
                />
                {order.logisticsSubType && (
                  <Row
                    label="通路"
                    value={
                      <span className="font-mono text-[12px] text-fg-2">
                        {order.logisticsSubType}
                      </span>
                    }
                  />
                )}
              </dl>
            ) : status === "PAID" ? (
              <CreateShipmentButton orderNumber={order.orderNumber} />
            ) : (
              <p className="font-mono text-[11px] tracking-[0.04em] text-muted">
                訂單付款後可建立物流單。
              </p>
            )}
          </Panel>
        </aside>
      </div>
    </section>
  );
}

/* ============ inline helpers ============ */

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border bg-surface">
      <div className="border-b border-border px-7 py-[18px]">
        <h3 className="font-serif text-[18px]">{title}</h3>
      </div>
      <div className="p-7">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <>
      <dt className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted">
        {label}
      </dt>
      <dd className="text-fg-2">{value}</dd>
    </>
  );
}

function SumRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between py-2.5 text-[14px]">
      <span className="text-fg-2">{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );
}
