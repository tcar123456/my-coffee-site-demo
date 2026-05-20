"use client";

// Phase 3b / 8b — Shipping step：radio 切配送方式 + Phase 8b 加 CVS 選店流程
//
// CVS_711 / CVS_FAMILY 強制要選店才能下一步；HOME_DELIVERY 不需要。
// 選店狀態 (storeId/Name/Address) 用本地 state；點「下一步」時把店資訊塞進 URL query
// 帶到 /checkout/payment（與 Phase 7 promo 同模式：URL 是 single source of truth）。

import { useState } from "react";
import Link from "next/link";
import {
  SHIPPING_FEES,
  SHIPPING_METHOD_LABELS,
  FREE_SHIPPING_THRESHOLD,
  type ShippingMethod,
} from "@/lib/shipping";
import { StorePickerDialog, type PickedStore } from "@/components/StorePickerDialog";
import type { MockStore } from "@/lib/logistics/types";

const METHOD_KEYS = Object.keys(SHIPPING_METHOD_LABELS) as ShippingMethod[];

const METHOD_DESCRIPTIONS: Record<ShippingMethod, string> = {
  CVS_711: "可指定門市自取，發貨後 2–3 個工作日抵達。",
  CVS_FAMILY: "全家便利商店店到店，發貨後 2–3 個工作日抵達。",
  HOME_DELIVERY: "黑貓宅急便配送到府，發貨後 1–2 個工作日抵達。",
};

const CVS_CHAIN_OF: Partial<Record<ShippingMethod, MockStore["chain"]>> = {
  CVS_711: "UNIMART",
  CVS_FAMILY: "FAMILY",
};

function isCvsMethod(m: ShippingMethod): m is "CVS_711" | "CVS_FAMILY" {
  return m === "CVS_711" || m === "CVS_FAMILY";
}

export function ShippingForm({
  addressId,
  subtotal,
  defaultMethod = "CVS_711",
  initialStore = null,
}: {
  addressId: string;
  subtotal: number;
  defaultMethod?: ShippingMethod;
  initialStore?: PickedStore | null;
}) {
  const [method, setMethod] = useState<ShippingMethod>(defaultMethod);
  const [pickedStore, setPickedStore] = useState<PickedStore | null>(initialStore);
  const [dialogOpen, setDialogOpen] = useState(false);

  const isFree = subtotal >= FREE_SHIPPING_THRESHOLD;
  const shippingFee = isFree ? 0 : SHIPPING_FEES[method];
  const total = subtotal + shippingFee;

  const cvsChain = CVS_CHAIN_OF[method];
  const needsStorePick = isCvsMethod(method);
  const canProceed = !needsStorePick || pickedStore !== null;

  // 切配送方式時：若新方式仍是 CVS 但 chain 不同（7-11 ↔ 全家），清掉選店；若切到宅配也清
  const handleChangeMethod = (next: ShippingMethod) => {
    if (next !== method) {
      const nextChain = CVS_CHAIN_OF[next];
      if (!nextChain || nextChain !== cvsChain) {
        setPickedStore(null);
      }
    }
    setMethod(next);
  };

  const nextHref = (() => {
    const params = new URLSearchParams({ addressId, shipping: method });
    if (needsStorePick && pickedStore) {
      params.set("cvsStoreId", pickedStore.storeId);
      params.set("cvsStoreName", pickedStore.storeName);
      params.set("cvsAddress", pickedStore.storeAddress);
    }
    return `/checkout/payment?${params.toString()}`;
  })();

  return (
    <div className="grid grid-cols-[1.4fr_1fr] gap-10 max-[900px]:grid-cols-1">
      {/* Radio list */}
      <div className="flex flex-col gap-3">
        {METHOD_KEYS.map((key) => {
          const fee = SHIPPING_FEES[key];
          const selected = method === key;
          const isThisCvs = isCvsMethod(key);
          return (
            <div key={key}>
              <label
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
                  onChange={() => handleChangeMethod(key)}
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

              {/* CVS 選店 UI：只在當前選中且是 CVS 才顯示 */}
              {selected && isThisCvs && (
                <div className="mt-2.5 ml-9 border-l-2 border-border pl-4">
                  {pickedStore ? (
                    <div className="flex items-start justify-between gap-3 py-2">
                      <div className="text-[13px]">
                        <div className="font-serif text-[15px] text-fg">
                          {pickedStore.storeName}
                        </div>
                        <div className="mt-1 font-mono text-[11px] leading-[1.5] text-fg-2">
                          {pickedStore.storeAddress}
                        </div>
                        <div className="mt-1 font-mono text-[10px] tracking-[0.16em] uppercase text-muted">
                          Store · {pickedStore.storeId}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDialogOpen(true)}
                        className="shrink-0 font-mono text-[11px] tracking-[0.14em] uppercase text-muted transition-colors hover:text-accent"
                      >
                        重選 →
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDialogOpen(true)}
                      className="my-2 inline-flex items-center gap-2 border border-accent px-4 py-2 font-mono text-[11px] tracking-[0.16em] uppercase text-accent transition-all duration-200 hover:bg-surface-2"
                    >
                      選擇門市 →
                    </button>
                  )}
                </div>
              )}
            </div>
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

        {canProceed ? (
          <Link
            href={nextHref}
            className="mt-7 flex w-full items-center justify-center gap-2.5 border border-accent bg-accent px-[22px] py-3.5 font-mono text-[12px] font-semibold tracking-[0.16em] text-bg uppercase transition-all duration-200 hover:border-accent-hi hover:bg-accent-hi"
          >
            下一步 · 付款 →
          </Link>
        ) : (
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="請先選擇取貨門市"
            className="mt-7 flex w-full cursor-not-allowed items-center justify-center gap-2.5 border border-border bg-surface px-[22px] py-3.5 font-mono text-[12px] font-semibold tracking-[0.16em] text-muted uppercase opacity-60"
          >
            請先選擇門市
          </button>
        )}
        <Link
          href="/checkout/address"
          className="mt-3 block text-center font-mono text-[11px] tracking-[0.16em] uppercase text-muted hover:text-accent"
        >
          ← 修改地址
        </Link>
      </aside>

      {cvsChain && (
        <StorePickerDialog
          open={dialogOpen}
          chain={cvsChain}
          onPick={(store) => {
            setPickedStore(store);
            setDialogOpen(false);
          }}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </div>
  );
}
