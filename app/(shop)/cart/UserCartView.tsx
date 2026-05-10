"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { updateCartItemQty, removeCartItem } from "@/app/actions/cart";
import { getGrindLabel, getPkgLabel } from "@/lib/cart-options";

type Item = {
  id: string;
  qty: number;
  grind: string | null;
  pkg: string | null;
  product: {
    id: string;
    slug: string;
    name: string;
    origin: string;
    price: number;
    weightGram: number;
    stock: number;
    coverVariant: number | null;
  };
};

const SHIPPING_FREE_THRESHOLD = 1200;

export function UserCartView({ items }: { items: Item[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const subtotal = items.reduce((s, l) => s + l.product.price * l.qty, 0);
  const itemCount = items.reduce((s, l) => s + l.qty, 0);

  const handleQty = (id: string, qty: number) => {
    startTransition(async () => {
      await updateCartItemQty(id, qty);
      router.refresh();
    });
  };

  const handleRemove = (id: string) => {
    startTransition(async () => {
      await removeCartItem(id);
      router.refresh();
    });
  };

  if (items.length === 0) {
    return <EmptyCart />;
  }

  return (
    <section className="mx-auto grid max-w-[var(--max)] grid-cols-[1.6fr_1fr] items-start gap-14 px-[var(--gutter)] pt-[clamp(32px,4vw,56px)] pb-[clamp(64px,8vw,112px)] max-[900px]:grid-cols-1 max-[900px]:gap-10">
      {/* Lines */}
      <div>
        <div className="border-t border-border">
          {items.map((line) => {
            const variantClass = line.product.coverVariant
              ? `bean-cover--alt-${line.product.coverVariant}`
              : "";
            const exceedsStock = line.qty > line.product.stock;
            return (
              <article
                key={line.id}
                className="grid grid-cols-[110px_1fr_auto] items-start gap-6 border-b border-border py-7 max-[600px]:grid-cols-[80px_1fr]"
              >
                <div
                  className={`bean-cover ${variantClass} aspect-[4/5] border border-border max-[600px]:aspect-square`}
                />

                <div>
                  <div className="mb-2 font-mono text-[10px] tracking-[0.16em] uppercase text-muted">
                    {line.product.origin}
                  </div>
                  <h2 className="mb-3 font-serif text-[22px] leading-[1.2]">
                    {line.product.name}
                  </h2>

                  <div className="mb-5 flex flex-wrap gap-x-5 gap-y-1.5 font-mono text-[11px] text-fg-2">
                    <span>
                      <span className="mr-1.5 text-[10px] tracking-[0.14em] uppercase text-muted">
                        研磨
                      </span>
                      {getGrindLabel(line.grind)}
                    </span>
                    <span>
                      <span className="mr-1.5 text-[10px] tracking-[0.14em] uppercase text-muted">
                        包裝
                      </span>
                      {getPkgLabel(line.pkg)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-6">
                    <div className="flex border border-border">
                      <button
                        type="button"
                        aria-label="減少數量"
                        disabled={isPending || line.qty <= 1}
                        onClick={() => handleQty(line.id, line.qty - 1)}
                        className="h-8 w-8 border-r border-border text-fg-2 transition-colors hover:text-accent disabled:opacity-40"
                      >
                        −
                      </button>
                      <span className="flex w-11 items-center justify-center font-mono text-[13px] tabular-nums text-fg">
                        {line.qty}
                      </span>
                      <button
                        type="button"
                        aria-label="增加數量"
                        disabled={isPending}
                        onClick={() => handleQty(line.id, line.qty + 1)}
                        className="h-8 w-8 border-l border-border text-fg-2 transition-colors hover:text-accent disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(line.id)}
                      disabled={isPending}
                      className="cursor-pointer font-mono text-[11px] tracking-[0.14em] uppercase text-muted transition-colors hover:text-danger disabled:opacity-40"
                    >
                      移除
                    </button>
                    <button
                      type="button"
                      disabled
                      title="收藏功能預計於 Phase 4 提供"
                      className="cursor-not-allowed font-mono text-[11px] tracking-[0.14em] uppercase text-dim"
                    >
                      儲存到收藏 ♡
                    </button>
                  </div>

                  {exceedsStock && (
                    <div className="mt-3 font-mono text-[11px] text-[oklch(75%_0.12_25)]">
                      庫存僅剩 {line.product.stock} 件，結帳前請調整數量。
                    </div>
                  )}
                </div>

                <div className="min-w-[130px] text-right max-[600px]:col-start-2 max-[600px]:text-left">
                  <div className="mb-1.5 font-mono text-[11px] text-muted">
                    NT$ {line.product.price.toLocaleString("zh-TW")} / 包
                  </div>
                  <div className="font-serif text-[26px] tabular-nums">
                    <small className="mr-1 font-mono text-[11px] text-muted">
                      NT$
                    </small>
                    {(line.product.price * line.qty).toLocaleString("zh-TW")}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-8">
          <Button href="/products" variant="ghost">
            ← 繼續挑豆
          </Button>
        </div>
      </div>

      {/* Summary */}
      <CartSummary subtotal={subtotal} itemCount={itemCount} />
    </section>
  );
}

function EmptyCart() {
  return (
    <section className="mx-auto max-w-[var(--max)] px-[var(--gutter)] py-[clamp(80px,10vw,140px)] text-center">
      <p className="font-serif text-[24px] leading-[1.4] text-fg-2">
        購物車目前是空的
      </p>
      <p className="mt-3 font-mono text-[12px] tracking-[0.08em] text-muted">
        從本季單品挑選你的下一支豆。
      </p>
      <div className="mt-8 flex justify-center">
        <Button href="/products" variant="primary">
          前往單品咖啡 →
        </Button>
      </div>
    </section>
  );
}

function CartSummary({
  subtotal,
  itemCount,
}: {
  subtotal: number;
  itemCount: number;
}) {
  const memberDiscount = 0; // 視覺保留，Phase 7 才接會員折抵
  const shippingFree = subtotal >= SHIPPING_FREE_THRESHOLD;
  const total = Math.max(0, subtotal - memberDiscount);

  return (
    <aside className="sticky top-20 border border-border bg-surface p-8 max-[900px]:static">
      <h3 className="font-serif text-[26px] leading-tight">訂單明細</h3>
      <div className="mt-1 mb-6 border-b border-border pb-6 font-mono text-[11px] tracking-[0.14em] uppercase text-muted">
        Order Summary
      </div>

      <SumRow
        label={`小計（${itemCount} 件）`}
        value={`NT$ ${subtotal.toLocaleString("zh-TW")}`}
      />
      <SumRow
        label="配送費"
        value={
          shippingFree ? (
            <span className="text-success">免運（滿 NT$ 1,200）</span>
          ) : (
            <span className="text-fg-2">結帳時計算</span>
          )
        }
      />

      <div className="mt-4 flex items-baseline justify-between border-t border-border pt-6">
        <span className="font-mono text-[11px] tracking-[0.18em] uppercase text-muted">
          總計
        </span>
        <span className="font-serif text-[38px] tabular-nums">
          <small className="mr-1.5 font-mono text-[12px] text-muted">NT$</small>
          {total.toLocaleString("zh-TW")}
        </span>
      </div>

      <Button href="#" variant="primary" block className="mt-7">
        前往結帳 →
      </Button>

      <ul className="mt-6 border-t border-border pt-6 font-mono text-[11px] leading-[1.7] tracking-[0.04em] text-muted">
        {[
          "下週一烘焙完成隔日出貨",
          "本訂單可在出貨前修改一次",
          "新會員首次訂閱享 9 折",
        ].map((note) => (
          <li key={note} className="relative py-1 pl-4">
            <span className="absolute left-0 text-accent">—</span>
            {note}
          </li>
        ))}
      </ul>
    </aside>
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
