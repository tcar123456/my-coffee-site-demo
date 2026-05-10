import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  SHIPPING_METHOD_LABELS,
  PAYMENT_METHOD_LABELS,
  type ShippingMethod,
  type PaymentMethod,
} from "@/lib/shipping";
import { getGrindLabel, getPkgLabel } from "@/lib/cart-options";
import { PayMockButton } from "./PayMockButton";

type OrderStatus = "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED";

type OrderItemRow = {
  id: string;
  productName: string;
  unitPrice: number;
  qty: number;
  grind: string | null;
  pkg: string | null;
};

const statusLabel: Record<OrderStatus, string> = {
  PENDING: "待付款",
  PAID: "已付款",
  SHIPPED: "已出貨",
  DELIVERED: "已送達",
  CANCELLED: "已取消",
};

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

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { orderNumber } = await params;

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true },
  });

  if (!order || order.userId !== session.user.id) {
    notFound();
  }

  const status = order.status as OrderStatus;
  const isDev = process.env.NODE_ENV !== "production";

  return (
    <>
      {/* ========== Header ========== */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-[var(--max)] px-[var(--gutter)] py-[clamp(40px,5vw,64px)]">
          <div className="mb-3 font-mono text-[11px] tracking-[0.18em] uppercase">
            <Link href="/account" className="text-muted hover:text-accent">
              會員中心
            </Link>
            <span className="mx-3 text-border">/</span>
            <Link
              href="/account/orders"
              className="text-muted hover:text-accent"
            >
              訂單記錄
            </Link>
            <span className="mx-3 text-border">/</span>
            <span className="text-accent">#{order.orderNumber}</span>
          </div>

          <div className="grid grid-cols-[1fr_auto] items-end gap-6 max-[640px]:grid-cols-1">
            <div>
              <h1 className="font-serif text-[clamp(28px,3.6vw,44px)] leading-none tracking-[-0.01em]">
                #{order.orderNumber}
              </h1>
              <div className="mt-3 font-mono text-[11px] tracking-[0.14em] uppercase text-muted">
                建立於 {dateFormatter.format(order.createdAt)}
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 border px-3 py-1.5 font-mono text-[11px] tracking-[0.18em] uppercase before:size-1.5 before:rounded-full ${statusPillClasses[status]}`}
            >
              {statusLabel[status]}
            </span>
          </div>

          {/* Status timestamps */}
          <div className="mt-6 flex flex-wrap gap-x-7 gap-y-2 font-mono text-[11px] text-muted">
            {order.paidAt && (
              <span>
                <span className="text-fg-2">付款時間 · </span>
                {dateFormatter.format(order.paidAt)}
              </span>
            )}
            {order.shippedAt && (
              <span>
                <span className="text-fg-2">出貨時間 · </span>
                {dateFormatter.format(order.shippedAt)}
              </span>
            )}
            {order.deliveredAt && (
              <span>
                <span className="text-fg-2">送達時間 · </span>
                {dateFormatter.format(order.deliveredAt)}
              </span>
            )}
          </div>

          {status === "CANCELLED" && order.cancelledAt && (
            <div className="mt-5 border border-[oklch(40%_0.10_25)] bg-[oklch(20%_0.04_25)] px-5 py-3 font-mono text-[12px] text-danger">
              本訂單已於 {dateFormatter.format(order.cancelledAt)} 取消。
            </div>
          )}
        </div>
      </section>

      {/* ========== Body ========== */}
      <section className="mx-auto grid max-w-[var(--max)] grid-cols-[1.6fr_1fr] items-start gap-10 px-[var(--gutter)] pt-[clamp(32px,4vw,56px)] pb-[clamp(64px,8vw,112px)] max-[900px]:grid-cols-1 max-[900px]:gap-6">
        {/* Left col */}
        <div className="flex flex-col gap-6">
          {/* Items */}
          <Panel title="訂單品項">
            {(order.items as OrderItemRow[]).map((item) => {
              const lineTotal = item.unitPrice * item.qty;
              return (
                <div
                  key={item.id}
                  className="grid grid-cols-[1fr_auto] items-start gap-4 border-b border-border py-5 last:border-b-0"
                >
                  <div>
                    <h3 className="font-serif text-[18px] leading-[1.3]">
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

          {/* Shipping info */}
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
            </dl>
          </Panel>
        </div>

        {/* Right col — summary */}
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
              <span className="font-serif text-[34px] tabular-nums text-accent">
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
                  已付款 · {dateFormatter.format(order.paidAt)}
                </div>
              )}
            </div>
          </Panel>

          {status === "PENDING" && isDev && (
            <div className="border border-warn bg-surface p-6">
              <div className="mb-3 font-mono text-[10px] tracking-[0.18em] uppercase text-warn">
                Dev 模式 · Mock 付款
              </div>
              <PayMockButton orderNumber={order.orderNumber} />
            </div>
          )}
        </aside>
      </section>
    </>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border bg-surface">
      <div className="border-b border-border px-7 py-[22px]">
        <h3 className="font-serif text-[22px]">{title}</h3>
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
