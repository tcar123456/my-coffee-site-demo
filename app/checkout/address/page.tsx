// Phase 3b — 結帳 step 1：選擇收件地址
// 列出 user 既有地址 → 點卡片送到 step 2；沒地址 / ?new=1 顯示新增表單。
// gating 已在 (checkout)/layout.tsx 完成（auth + 空 cart 擋）。

import Link from "next/link";
import { CheckoutHeader } from "@/components/CheckoutHeader";
import { listAddresses } from "@/app/actions/address";
import { AddNewAddressBlock } from "../AddNewAddressBlock";

type AddressRow = Awaited<ReturnType<typeof listAddresses>>[number];

type SearchParams = Promise<{ new?: string }>;

export default async function CheckoutAddressPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { new: newFlag } = await searchParams;
  const addresses = await listAddresses();
  const showForm = addresses.length === 0 || newFlag === "1";

  return (
    <>
      <CheckoutHeader currentStep={1} />

      {/* Header */}
      <section className="border-b border-border px-[var(--gutter)] pt-[clamp(40px,5vw,64px)] pb-[clamp(24px,3vw,32px)] text-center">
        <h1 className="text-[clamp(36px,4.6vw,56px)] leading-none">
          選擇收件地址
        </h1>
        <div className="mt-3.5 font-mono text-[12px] tracking-[0.14em] text-muted">
          僅供台灣本島出貨 · 離島地區暫不支援
        </div>
      </section>

      <section className="mx-auto max-w-[var(--max)] px-[var(--gutter)] pt-[clamp(32px,4vw,56px)] pb-[clamp(64px,8vw,112px)]">
        {addresses.length > 0 && (
          <>
            <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-[22px]">已儲存的地址</h2>
              {!showForm && (
                <Link
                  href="/checkout/address?new=1"
                  className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted hover:text-accent"
                >
                  + 新增地址
                </Link>
              )}
            </div>

            <div className="grid grid-cols-2 gap-5 max-[700px]:grid-cols-1">
              {addresses.map((a: AddressRow) => (
                <Link
                  key={a.id}
                  href={`/checkout/shipping?addressId=${a.id}`}
                  className={`group flex flex-col gap-1.5 border p-[22px] transition-all duration-200 hover:-translate-y-[2px] hover:border-accent ${
                    a.isDefault
                      ? "border-accent-tint bg-surface-2"
                      : "border-border bg-surface"
                  }`}
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-accent">
                      {a.isDefault ? "預設" : "其他"}
                    </span>
                    <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted transition-colors group-hover:text-accent">
                      選擇 →
                    </span>
                  </div>
                  <div className="text-[18px]">{a.recipient}</div>
                  <div className="text-[13px] text-fg-2">
                    <span className="block">
                      {a.zipCode} {a.city} {a.district}
                    </span>
                    <span className="block">{a.street}</span>
                  </div>
                  <div className="mt-2 font-mono text-[12px] text-muted">
                    {a.phone}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {showForm && (
          <div className={addresses.length > 0 ? "mt-10" : ""}>
            <AddNewAddressBlock
              cancelHref={
                addresses.length > 0 ? "/checkout/address" : undefined
              }
            />
          </div>
        )}

        <div className="mt-10 flex justify-start">
          <Link
            href="/cart"
            className="font-mono text-[11px] tracking-[0.16em] uppercase text-muted hover:text-accent"
          >
            ← 返回購物車
          </Link>
        </div>
      </section>
    </>
  );
}
