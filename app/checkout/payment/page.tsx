// Phase 3b — 結帳 step 3：確認與付款
// 顯示完整訂單預覽 + 付款方式選擇；確認下單由 PlaceOrderButton 處理。

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CheckoutHeader } from "@/components/CheckoutHeader";
import {
  SHIPPING_METHOD_LABELS,
  calculateShipping,
  isShippingMethod,
  type ShippingMethod,
} from "@/lib/shipping";
import { getGrindLabel, getPkgLabel } from "@/lib/cart-options";
import { previewTierDiscount, TIER_LABELS } from "@/lib/tier";
import { applyPromoCode } from "@/app/actions/promo";
import { PlaceOrderButton } from "./PlaceOrderButton";
import { PromoForm } from "./PromoForm";

type SearchParams = Promise<{
  addressId?: string;
  shipping?: string;
  promo?: string;
  cvsStoreId?: string;
  cvsStoreName?: string;
  cvsAddress?: string;
}>;

export default async function CheckoutPaymentPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { addressId, shipping, promo, cvsStoreId, cvsStoreName, cvsAddress } =
    await searchParams;
  if (!addressId) redirect("/checkout/address");
  if (!shipping || !isShippingMethod(shipping)) {
    redirect(`/checkout/shipping?addressId=${addressId}`);
  }
  const shippingMethod: ShippingMethod = shipping;

  // Phase 8b：CVS 取貨必須帶店資訊，缺則退回 shipping step 重選
  const isCvs =
    shippingMethod === "CVS_711" || shippingMethod === "CVS_FAMILY";
  if (isCvs && (!cvsStoreId || !cvsStoreName || !cvsAddress)) {
    redirect(`/checkout/shipping?addressId=${addressId}&shipping=${shippingMethod}`);
  }

  const session = await auth();
  const userId = session!.user!.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tier: true },
  });
  const tier = user?.tier ?? "TIER_01";

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
        orderBy: { createdAt: "asc" },
        include: {
          product: {
            select: {
              id: true,
              slug: true,
              name: true,
              origin: true,
              price: true,
              coverVariant: true,
            },
          },
        },
      },
    },
  });

  const items = cart?.items ?? [];
  if (items.length === 0) {
    redirect("/cart");
  }

  const subtotal = items.reduce(
    (s, i) => s + i.product.price * i.qty,
    0,
  );
  const shippingFee = calculateShipping(subtotal, shippingMethod);
  const tierDiscount = previewTierDiscount(tier, subtotal);

  // 只有 URL 帶 promo 才試算；server-side 直接套 applyPromoCode 拿結果
  const promoResult = promo ? await applyPromoCode(promo) : null;
  const appliedPromoCode =
    promoResult && promoResult.ok ? promoResult.code : null;
  const promoDiscount =
    promoResult && promoResult.ok ? promoResult.discount : 0;
  const promoError =
    promoResult && !promoResult.ok ? promoResult.error : null;

  const total = subtotal + shippingFee - tierDiscount - promoDiscount;

  const backToShippingParams = new URLSearchParams({
    addressId,
    shipping: shippingMethod,
  });
  if (isCvs && cvsStoreId && cvsStoreName && cvsAddress) {
    backToShippingParams.set("cvsStoreId", cvsStoreId);
    backToShippingParams.set("cvsStoreName", cvsStoreName);
    backToShippingParams.set("cvsAddress", cvsAddress);
  }
  const backToShippingHref = `/checkout/shipping?${backToShippingParams.toString()}`;

  return (
    <>
      <CheckoutHeader currentStep={3} />

      <section className="border-b border-border px-[var(--gutter)] pt-[clamp(40px,5vw,64px)] pb-[clamp(24px,3vw,32px)] text-center">
        <h1 className="font-serif text-[clamp(36px,4.6vw,56px)] leading-none">
          確認訂單
        </h1>
        <div className="mt-3.5 font-mono text-[12px] tracking-[0.14em] text-muted">
          檢查無誤後送出，我們會把你的豆款記到下一輪烘焙
        </div>
      </section>

      <section className="mx-auto grid max-w-[var(--max)] grid-cols-[1.4fr_1fr] items-start gap-10 px-[var(--gutter)] pt-[clamp(32px,4vw,56px)] pb-[clamp(64px,8vw,112px)] max-[900px]:grid-cols-1">
        {/* Left: order preview + payment radio */}
        <div className="flex flex-col gap-8">
          {/* Address summary */}
          <div className="grid grid-cols-[1fr_auto] items-start gap-4 border border-border bg-surface p-5">
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

          {/* Shipping summary */}
          <div className="grid grid-cols-[1fr_auto] items-start gap-4 border border-border bg-surface p-5">
            <div>
              <div className="mb-2 font-mono text-[10px] tracking-[0.18em] uppercase text-accent">
                配送方式
              </div>
              <div className="font-serif text-[18px]">
                {SHIPPING_METHOD_LABELS[shippingMethod]}
              </div>
              {isCvs && cvsStoreName && (
                <div className="mt-2 text-[13px] text-fg-2">
                  <span className="block font-serif">門市 · {cvsStoreName}</span>
                  <span className="mt-0.5 block font-mono text-[11px] leading-[1.5] text-muted">
                    {cvsAddress}
                  </span>
                </div>
              )}
              <div className="mt-1 font-mono text-[12px] text-muted">
                {shippingFee === 0 ? (
                  <span className="text-success">已達免運門檻</span>
                ) : (
                  <>運費 NT$ {shippingFee.toLocaleString("zh-TW")}</>
                )}
              </div>
            </div>
            <Link
              href={backToShippingHref}
              className="font-mono text-[11px] tracking-[0.16em] uppercase text-muted hover:text-accent"
            >
              修改 →
            </Link>
          </div>

          {/* Items */}
          <div className="border border-border bg-surface">
            <div className="border-b border-border px-7 py-[22px]">
              <h3 className="font-serif text-[22px]">商品明細</h3>
              <div className="mt-1 font-mono text-[11px] tracking-[0.14em] uppercase text-muted">
                {items.length} 項商品 ·{" "}
                {items.reduce((s, i) => s + i.qty, 0)} 件
              </div>
            </div>
            <div className="px-7">
              {items.map((line) => {
                const variantClass = line.product.coverVariant
                  ? `bean-cover--alt-${line.product.coverVariant}`
                  : "";
                const lineTotal = line.product.price * line.qty;
                return (
                  <div
                    key={line.id}
                    className="grid grid-cols-[64px_1fr_auto] items-center gap-5 border-b border-border py-5 last:border-b-0"
                  >
                    <div
                      className={`bean-cover ${variantClass} aspect-[4/5] border border-border`}
                    />
                    <div>
                      <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted">
                        {line.product.origin}
                      </div>
                      <div className="mt-1 font-serif text-[16px] leading-[1.3]">
                        {line.product.name}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-fg-2">
                        <span>研磨 · {getGrindLabel(line.grind)}</span>
                        <span>包裝 · {getPkgLabel(line.pkg)}</span>
                        <span className="text-muted">× {line.qty}</span>
                      </div>
                    </div>
                    <div className="min-w-[100px] text-right">
                      <div className="font-mono text-[11px] text-muted">
                        NT$ {line.product.price.toLocaleString("zh-TW")} / 包
                      </div>
                      <div className="mt-1 font-serif text-[18px] tabular-nums">
                        <small className="mr-1 font-mono text-[11px] text-muted">
                          NT$
                        </small>
                        {lineTotal.toLocaleString("zh-TW")}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Promo code island */}
          <PromoForm appliedCode={appliedPromoCode} error={promoError} />

          {/* Payment method + place order */}
          <div>
            <h3 className="mb-5 font-serif text-[22px]">付款方式</h3>
            <PlaceOrderButton
              addressId={address.id}
              shippingMethod={shippingMethod}
              promoCode={appliedPromoCode}
              cvsStoreId={isCvs ? cvsStoreId : undefined}
              cvsStoreName={isCvs ? cvsStoreName : undefined}
              cvsAddress={isCvs ? cvsAddress : undefined}
            />

            <div className="mt-6">
              <Link
                href={backToShippingHref}
                className="font-mono text-[11px] tracking-[0.16em] uppercase text-muted hover:text-accent"
              >
                ← 回上一步
              </Link>
            </div>
          </div>
        </div>

        {/* Right: total summary */}
        <aside className="sticky top-20 self-start border border-border bg-surface p-8 max-[900px]:static">
          <h3 className="font-serif text-[22px] leading-tight">訂單明細</h3>
          <div className="mt-1 mb-6 border-b border-border pb-6 font-mono text-[11px] tracking-[0.14em] uppercase text-muted">
            Order Summary
          </div>

          <div className="flex items-baseline justify-between py-2.5 text-[14px]">
            <span className="text-fg-2">
              小計（{items.reduce((s, i) => s + i.qty, 0)} 件）
            </span>
            <span className="font-mono tabular-nums">
              NT$ {subtotal.toLocaleString("zh-TW")}
            </span>
          </div>
          <div className="flex items-baseline justify-between py-2.5 text-[14px]">
            <span className="text-fg-2">配送費</span>
            <span className="font-mono tabular-nums">
              {shippingFee === 0 ? (
                <span className="text-success">免運</span>
              ) : (
                <>NT$ {shippingFee.toLocaleString("zh-TW")}</>
              )}
            </span>
          </div>

          {tierDiscount > 0 && (
            <div className="flex items-baseline justify-between py-2.5 text-[14px]">
              <span className="text-fg-2">
                會員折抵 · {TIER_LABELS[tier]}
              </span>
              <span className="font-mono tabular-nums text-accent">
                −NT$ {tierDiscount.toLocaleString("zh-TW")}
              </span>
            </div>
          )}

          {promoDiscount > 0 && (
            <div className="flex items-baseline justify-between py-2.5 text-[14px]">
              <span className="text-fg-2">
                優惠碼折抵{appliedPromoCode ? ` · ${appliedPromoCode}` : ""}
              </span>
              <span className="font-mono tabular-nums text-accent">
                −NT$ {promoDiscount.toLocaleString("zh-TW")}
              </span>
            </div>
          )}

          <div className="mt-4 flex items-baseline justify-between border-t border-border pt-6">
            <span className="font-mono text-[11px] tracking-[0.18em] uppercase text-muted">
              總計
            </span>
            <span className="font-serif text-[38px] tabular-nums">
              <small className="mr-1.5 font-mono text-[12px] text-muted">
                NT$
              </small>
              {total.toLocaleString("zh-TW")}
            </span>
          </div>

          <ul className="mt-6 border-t border-border pt-6 font-mono text-[11px] leading-[1.7] tracking-[0.04em] text-muted">
            {[
              "下單後不可修改地址，需取消重下",
              "出貨前可取消訂單",
              "若庫存異動將以 Email 通知",
            ].map((note) => (
              <li key={note} className="relative py-1 pl-4">
                <span className="absolute left-0 text-accent">—</span>
                {note}
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </>
  );
}
