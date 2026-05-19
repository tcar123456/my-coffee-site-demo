// Phase 5a — 出貨單列印頁
// Server component；A4 / A5 友善的白底黑字版面。
// SELLER role gate 在這層自己做 —— 不能直接 import server-action 檔（會把 'use server' 整檔 import 進來）。

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
import { PrintButton } from "./PrintButton";

const dateFormatter = new Intl.DateTimeFormat("zh-TW", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateOnlyFormatter = new Intl.DateTimeFormat("zh-TW", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// @media print 樣式 —— inline 注入避免動 globals.css
const PRINT_CSS = `
@page {
  size: A4;
  margin: 14mm 12mm;
}
@media print {
  html, body { background: #ffffff !important; }
  .no-print { display: none !important; }
}
`;

export default async function AdminOrderPrintPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  // ── role gate ───────────────────────────────────────────────
  // proxy.ts 已擋 /admin/* 給未登入，這裡再驗 SELLER。
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SELLER") notFound();

  const { orderNumber } = await params;

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: true,
      user: { select: { email: true, name: true } },
    },
  });

  if (!order) notFound();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <PrintButton />

      <main className="mx-auto max-w-[820px] bg-white px-[clamp(20px,4vw,48px)] py-[clamp(28px,4vw,56px)] font-sans text-[13px] leading-[1.55] text-black">
        {/* ============ Header ============ */}
        <header className="flex flex-wrap items-end justify-between gap-6 border-b-2 border-black pb-6">
          <div>
            <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-neutral-600">
              MUBEI 暮焙 · COFFEE ROASTER
            </div>
            <h1 className="mt-2 font-serif text-[36px] leading-none tracking-[-0.01em]">
              出貨單
            </h1>
            <div className="mt-2 font-mono text-[11px] tracking-[0.14em] uppercase text-neutral-700">
              Shipping Manifest
            </div>
          </div>

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-right text-[12px]">
            <dt className="font-mono text-[10px] tracking-[0.18em] uppercase text-neutral-600">
              訂單編號
            </dt>
            <dd className="font-mono text-[14px] tabular-nums text-black">
              #{order.orderNumber}
            </dd>
            <dt className="font-mono text-[10px] tracking-[0.18em] uppercase text-neutral-600">
              訂單日期
            </dt>
            <dd className="font-mono tabular-nums">
              {dateFormatter.format(order.createdAt)}
            </dd>
            <dt className="font-mono text-[10px] tracking-[0.18em] uppercase text-neutral-600">
              列印日期
            </dt>
            <dd className="font-mono tabular-nums">
              {dateOnlyFormatter.format(new Date())}
            </dd>
          </dl>
        </header>

        {/* ============ Recipient ============ */}
        <section className="mt-8 grid grid-cols-2 gap-8 max-[640px]:grid-cols-1">
          <Block title="收件資訊 / Ship To">
            <dl className="grid grid-cols-[72px_1fr] gap-y-2 text-[13px]">
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
                label="地址"
                value={
                  <span>
                    <span className="font-mono text-[12px] text-neutral-700">
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
          </Block>

          <Block title="寄件人 / Ship From">
            <div className="text-[13px] leading-[1.65]">
              <div className="font-serif text-[16px]">暮焙咖啡 MUBEI</div>
              <div className="mt-1 text-neutral-700">10491 台北市中山區</div>
              <div className="text-neutral-700">民生東路三段 N° 7 號 4F</div>
              <div className="mt-2 font-mono text-[11px] text-neutral-700">
                support@mubei.coffee · 02-XXXX-XXXX
              </div>
            </div>
          </Block>
        </section>

        {/* ============ Items ============ */}
        <section className="mt-8">
          <h2 className="mb-3 font-serif text-[18px]">
            品項明細 / Items
          </h2>
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-y-2 border-black">
                {["商品名稱", "研磨", "包裝", "數量", "單價", "小計"].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={`py-2.5 font-mono text-[10px] font-normal tracking-[0.16em] uppercase text-neutral-700 ${
                        i >= 3 ? "text-right" : "text-left"
                      } ${i === 0 ? "pr-3" : "px-3"}`}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => {
                const lineTotal = item.unitPrice * item.qty;
                return (
                  <tr key={item.id} className="border-b border-neutral-300">
                    <td className="py-3 pr-3 align-top">
                      <div className="font-serif text-[14px] leading-[1.4]">
                        {item.productName}
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-neutral-600">
                        {item.productSlug}
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top text-[12px]">
                      {getGrindLabel(item.grind)}
                    </td>
                    <td className="px-3 py-3 align-top text-[12px]">
                      {getPkgLabel(item.pkg)}
                    </td>
                    <td className="px-3 py-3 text-right align-top font-mono tabular-nums">
                      × {item.qty}
                    </td>
                    <td className="px-3 py-3 text-right align-top font-mono tabular-nums">
                      {item.unitPrice.toLocaleString("zh-TW")}
                    </td>
                    <td className="px-3 py-3 text-right align-top font-mono tabular-nums">
                      {lineTotal.toLocaleString("zh-TW")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* ============ Totals + Payment ============ */}
        <section className="mt-6 grid grid-cols-[1fr_280px] gap-8 max-[640px]:grid-cols-1">
          <div>
            <Block title="付款資訊 / Payment">
              <dl className="grid grid-cols-[80px_1fr] gap-y-2 text-[13px]">
                <Row
                  label="付款方式"
                  value={
                    PAYMENT_METHOD_LABELS[
                      order.paymentMethod as PaymentMethod
                    ] ?? order.paymentMethod
                  }
                />
                <Row
                  label="付款狀態"
                  value={
                    order.paidAt ? (
                      <span>
                        已付款 ·{" "}
                        <span className="font-mono text-[12px]">
                          {dateFormatter.format(order.paidAt)}
                        </span>
                      </span>
                    ) : (
                      <span className="text-neutral-700">未付款</span>
                    )
                  }
                />
                {order.user?.email && (
                  <Row
                    label="顧客信箱"
                    value={
                      <span className="font-mono text-[12px]">
                        {order.user.email}
                      </span>
                    }
                  />
                )}
              </dl>
            </Block>
          </div>

          <div className="border-2 border-black p-5">
            <SumRow
              label="小計 Subtotal"
              value={`NT$ ${order.subtotal.toLocaleString("zh-TW")}`}
            />
            <SumRow
              label="運費 Shipping"
              value={
                order.shippingFee === 0
                  ? "免運"
                  : `NT$ ${order.shippingFee.toLocaleString("zh-TW")}`
              }
            />
            <div className="mt-4 flex items-baseline justify-between border-t-2 border-black pt-4">
              <span className="font-mono text-[11px] tracking-[0.18em] uppercase text-neutral-700">
                合計 Total
              </span>
              <span className="font-serif text-[28px] tabular-nums">
                <small className="mr-1 font-mono text-[11px] text-neutral-700">
                  NT$
                </small>
                {order.total.toLocaleString("zh-TW")}
              </span>
            </div>
          </div>
        </section>

        {/* ============ Signature ============ */}
        <section className="mt-12 grid grid-cols-2 gap-12 max-[640px]:grid-cols-1">
          <div>
            <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-neutral-700">
              出貨備註 / Notes
            </div>
            <div className="mt-2 h-[80px] border-b border-neutral-400" />
          </div>
          <div>
            <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-neutral-700">
              簽收欄 / Signed By
            </div>
            <div className="mt-2 flex h-[80px] items-end border-b border-black">
              <span className="pb-1 font-mono text-[10px] text-neutral-500">
                請於此處簽名
              </span>
            </div>
            <div className="mt-2 font-mono text-[10px] text-neutral-700">
              日期 ___________ /  _____ / _____
            </div>
          </div>
        </section>

        {/* ============ Footer ============ */}
        <footer className="mt-12 border-t border-neutral-300 pt-4 text-center font-mono text-[10px] tracking-[0.14em] uppercase text-neutral-600">
          Thank you for your order · 暮焙咖啡 MUBEI · {order.orderNumber}
        </footer>
      </main>
    </>
  );
}

/* ============ inline helpers ============ */

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="mb-3 border-b border-black pb-1.5 font-serif text-[16px]">
        {title}
      </h2>
      <div>{children}</div>
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
      <dt className="font-mono text-[10px] tracking-[0.14em] uppercase text-neutral-700">
        {label}
      </dt>
      <dd className="text-black">{value}</dd>
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
    <div className="flex items-baseline justify-between py-1.5 text-[13px]">
      <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-neutral-700">
        {label}
      </span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );
}
