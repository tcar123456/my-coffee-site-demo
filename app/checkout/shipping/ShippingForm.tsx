"use client";

// Phase 3b — Shipping step：radio 即時切換配送方式 / 試算運費。
// 純 client component；submit 透過 next/link <a> 帶 query 跳到 step 3。

import { useState } from "react";
import Link from "next/link";
import {
  SHIPPING_FEES,
  SHIPPING_METHOD_LABELS,
  FREE_SHIPPING_THRESHOLD,
  type ShippingMethod,
} from "@/lib/shipping";

const METHOD_KEYS = Object.keys(SHIPPING_METHOD_LABELS) as ShippingMethod[];

const METHOD_DESCRIPTIONS: Record<ShippingMethod, string> = {
  CVS_711: "可指定門市自取，發貨後 2–3 個工作日抵達。",
  CVS_FAMILY: "全家便利商店店到店，發貨後 2–3 個工作日抵達。",
  HOME_DELIVERY: "黑貓宅急便配送到府，發貨後 1–2 個工作日抵達。",
};

export function ShippingForm({
  addressId,
  subtotal,
  defaultMethod = "CVS_711",
}: {
  addressId: string;
  subtotal: number;
  defaultMethod?: ShippingMethod;
}) {
  const [method, setMethod] = useState<ShippingMethod>(defaultMethod);
  const isFree = subtotal >= FREE_SHIPPING_THRESHOLD;
  const shippingFee = isFree ? 0 : SHIPPING_FEES[method];
  const total = subtotal + shippingFee;

  return (
    <div className="grid grid-cols-[1.4fr_1fr] gap-10 max-[900px]:grid-cols-1">
      {/* Radio list */}
      <div className="flex flex-col gap-3">
        {METHOD_KEYS.map((key) => {
          const fee = SHIPPING_FEES[key];
          const selected = method === key;
          return (
            <label
              key={key}
              className={`flex cursor-pointer items-start gap-4 border p-5 transition-all duration-200 ${
                selected
                  ? "border-accent bg-surface-2"
                  : "border-border bg-surface hover:border-border-hi"
              }`}
            >
              <input
                type="radio"
                name="shippingMethod"
                value={key}
                checked={selected}
                onChange={() => setMethod(key)}
                className="mt-1.5 size-4 accent-accent"
              />
              <div className="flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-serif text-[18px]">
                    {SHIPPING_METHOD_LABELS[key]}
                  </span>
                  <span className="font-mono text-[13px] tabular-nums text-fg-2">
                    {isFree ? (
                      <span className="text-success">免運</span>
                    ) : (
                      <>
                        <span className="mr-1 text-muted">NT$</span>
                        {fee.toLocaleString("zh-TW")}
                      </>
                    )}
                  </span>
                </div>
                <p className="mt-1.5 text-[13px] leading-[1.55] text-muted">
                  {METHOD_DESCRIPTIONS[key]}
                </p>
              </div>
            </label>
          );
        })}

        <p className="mt-2 font-mono text-[11px] leading-[1.6] tracking-[0.04em] text-muted">
          訂單滿 NT$ {FREE_SHIPPING_THRESHOLD.toLocaleString("zh-TW")} 享免運。
        </p>
      </div>

      {/* Summary */}
      <aside className="sticky top-20 self-start border border-border bg-surface p-8 max-[900px]:static">
        <h3 className="font-serif text-[22px] leading-tight">運費試算</h3>
        <div className="mt-1 mb-6 border-b border-border pb-6 font-mono text-[11px] tracking-[0.14em] uppercase text-muted">
          Shipping Estimate
        </div>

        <div className="flex items-baseline justify-between py-2.5 text-[14px]">
          <span className="text-fg-2">小計</span>
          <span className="font-mono tabular-nums">
            NT$ {subtotal.toLocaleString("zh-TW")}
          </span>
        </div>
        <div className="flex items-baseline justify-between py-2.5 text-[14px]">
          <span className="text-fg-2">配送費</span>
          <span className="font-mono tabular-nums">
            {isFree ? (
              <span className="text-success">免運</span>
            ) : (
              <>NT$ {shippingFee.toLocaleString("zh-TW")}</>
            )}
          </span>
        </div>

        <div className="mt-4 flex items-baseline justify-between border-t border-border pt-6">
          <span className="font-mono text-[11px] tracking-[0.18em] uppercase text-muted">
            預估總計
          </span>
          <span className="font-serif text-[32px] tabular-nums">
            <small className="mr-1.5 font-mono text-[12px] text-muted">
              NT$
            </small>
            {total.toLocaleString("zh-TW")}
          </span>
        </div>

        <Link
          href={`/checkout/payment?addressId=${addressId}&shipping=${method}`}
          className="mt-7 flex w-full items-center justify-center gap-2.5 border border-accent bg-accent px-[22px] py-3.5 font-mono text-[12px] font-semibold tracking-[0.16em] text-bg uppercase transition-all duration-200 hover:border-accent-hi hover:bg-accent-hi"
        >
          下一步 · 付款 →
        </Link>
        <Link
          href="/checkout/address"
          className="mt-3 block text-center font-mono text-[11px] tracking-[0.16em] uppercase text-muted hover:text-accent"
        >
          ← 修改地址
        </Link>
      </aside>
    </div>
  );
}
