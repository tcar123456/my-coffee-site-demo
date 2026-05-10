// Phase 3b — 結帳 step 2：選擇配送方式
// 從 query 取 addressId，驗證 ownership；撈購物車算 subtotal；交給 ShippingForm 做 client interaction。

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CheckoutHeader } from "@/components/CheckoutHeader";
import { isShippingMethod, type ShippingMethod } from "@/lib/shipping";
import { ShippingForm } from "./ShippingForm";

type SearchParams = Promise<{ addressId?: string; shipping?: string }>;

export default async function CheckoutShippingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { addressId, shipping } = await searchParams;
  if (!addressId) redirect("/checkout/address");

  // gating 在 layout 已驗 session，此處 user.id 必存在
  const session = await auth();
  const userId = session!.user!.id;

  const address = await prisma.address.findUnique({
    where: { id: addressId },
    select: {
      id: true,
      userId: true,
      recipient: true,
      phone: true,
      zipCode: true,
      city: true,
      district: true,
      street: true,
    },
  });
  if (!address || address.userId !== userId) {
    redirect("/checkout/address");
  }

  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        select: {
          qty: true,
          product: { select: { price: true } },
        },
      },
    },
  });
  const subtotal =
    cart?.items.reduce((s, i) => s + i.product.price * i.qty, 0) ?? 0;

  const defaultMethod: ShippingMethod =
    shipping && isShippingMethod(shipping) ? shipping : "CVS_711";

  return (
    <>
      <CheckoutHeader currentStep={2} />

      {/* Header */}
      <section className="border-b border-border px-[var(--gutter)] pt-[clamp(40px,5vw,64px)] pb-[clamp(24px,3vw,32px)] text-center">
        <h1 className="font-serif text-[clamp(36px,4.6vw,56px)] leading-none">
          選擇配送方式
        </h1>
        <div className="mt-3.5 font-mono text-[12px] tracking-[0.14em] text-muted">
          下週一烘焙完成，隔日依配送方式安排出貨
        </div>
      </section>

      <section className="mx-auto max-w-[var(--max)] px-[var(--gutter)] pt-[clamp(32px,4vw,56px)] pb-[clamp(64px,8vw,112px)]">
        {/* Selected address summary */}
        <div className="mb-8 grid grid-cols-[1fr_auto] items-start gap-4 border border-border bg-surface p-5">
          <div>
            <div className="mb-2 font-mono text-[10px] tracking-[0.18em] uppercase text-accent">
              收件地址
            </div>
            <div className="font-serif text-[18px]">{address.recipient}</div>
            <div className="mt-1 text-[13px] text-fg-2">
              <span className="block">
                {address.zipCode} {address.city} {address.district}
              </span>
              <span className="block">{address.street}</span>
            </div>
            <div className="mt-2 font-mono text-[12px] text-muted">
              {address.phone}
            </div>
          </div>
          <Link
            href="/checkout/address"
            className="font-mono text-[11px] tracking-[0.16em] uppercase text-muted hover:text-accent"
          >
            修改 →
          </Link>
        </div>

        <ShippingForm
          addressId={address.id}
          subtotal={subtotal}
          defaultMethod={defaultMethod}
        />
      </section>
    </>
  );
}
