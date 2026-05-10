"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useCartStore } from "@/lib/cart-store";
import { getProductsByIds } from "@/app/actions/cart";
import { getGrindLabel, getPkgLabel } from "@/lib/cart-options";

type Product = {
  id: string;
  slug: string;
  name: string;
  origin: string;
  price: number;
  stock: number;
  isActive: boolean;
  coverVariant: number | null;
};

const SHIPPING_FREE_THRESHOLD = 1200;

export function GuestCartView() {
  const items = useCartStore((s) => s.items);
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);
  const hasHydrated = useCartStore((s) => s.hasHydrated);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasHydrated) return;
    const ids = [...new Set(items.map((i) => i.productId))];
    if (ids.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getProductsByIds(ids)
      .then((data) => {
        if (!cancelled) setProducts(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hasHydrated, items]);

  if (!hasHydrated || loading) {
    return (
      <section className="mx-auto max-w-[var(--max)] px-[var(--gutter)] py-[clamp(80px,10vw,140px)] text-center">
        <p className="font-mono text-[12px] tracking-[0.16em] uppercase text-muted">
          載入購物車中…
        </p>
      </section>
    );
  }

  // 過濾掉已下架商品
  const productMap = new Map(products.filter((p) => p.isActive).map((p) => [p.id, p]));
  const visibleItems = items
    .map((i) => ({ ...i, product: productMap.get(i.productId) }))
    .filter((i): i is typeof i & { product: Product } => !!i.product);

  if (visibleItems.length === 0) {
    return (
      <section className="mx-auto max-w-[var(--max)] px-[var(--gutter)] py-[clamp(80px,10vw,140px)] text-center">
        <p className="font-serif text-[24px] leading-[1.4] text-fg-2">
          購物車目前是空的
        </p>
        <p className="mt-3 font-mono text-[12px] tracking-[0.08em] text-muted">
          {items.length > 0
            ? "原先加入的商品已下架，請從本季單品重新選購。"
            : "從本季單品挑選你的下一支豆。"}
        </p>
        <div className="mt-8 flex justify-center">
          <Button href="/products" variant="primary">
            前往單品咖啡 →
          </Button>
        </div>
      </section>
    );
  }

  const subtotal = visibleItems.reduce(
    (s, l) => s + l.product.price * l.qty,
    0,
  );
  const itemCount = visibleItems.reduce((s, l) => s + l.qty, 0);
  const shippingFree = subtotal >= SHIPPING_FREE_THRESHOLD;
  const total = subtotal;

  return (
    <section className="mx-auto grid max-w-[var(--max)] grid-cols-[1.6fr_1fr] items-start gap-14 px-[var(--gutter)] pt-[clamp(32px,4vw,56px)] pb-[clamp(64px,8vw,112px)] max-[900px]:grid-cols-1 max-[900px]:gap-10">
      <div>
        <div className="border-t border-border">
          {visibleItems.map((line) => {
            const variantClass = line.product.coverVariant
              ? `bean-cover--alt-${line.product.coverVariant}`
              : "";
            const exceedsStock = line.qty > line.product.stock;
            const key = `${line.productId}|${line.grind ?? ""}|${line.pkg ?? ""}`;
            return (
              <article
                key={key}
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
                        disabled={line.qty <= 1}
                        onClick={() =>
                          setQty(line.productId, line.grind, line.pkg, line.qty - 1)
                        }
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
                        onClick={() =>
                          setQty(line.productId, line.grind, line.pkg, line.qty + 1)
                        }
                        className="h-8 w-8 border-l border-border text-fg-2 transition-colors hover:text-accent disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(line.productId, line.grind, line.pkg)}
                      className="cursor-pointer font-mono text-[11px] tracking-[0.14em] uppercase text-muted transition-colors hover:text-danger"
                    >
                      移除
                    </button>
                    <Link
                      href="/login?callbackUrl=%2Fcart"
                      className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted transition-colors hover:text-accent"
                    >
                      儲存到收藏 ♡
                    </Link>
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

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button href="/products" variant="ghost">
            ← 繼續挑豆
          </Button>
          <span className="font-mono text-[11px] tracking-[0.08em] text-muted">
            訪客結帳前請先登入，購物車會自動同步。
          </span>
        </div>
      </div>

      <aside className="sticky top-20 border border-border bg-surface p-8 max-[900px]:static">
        <h3 className="font-serif text-[26px] leading-tight">訂單明細</h3>
        <div className="mt-1 mb-6 border-b border-border pb-6 font-mono text-[11px] tracking-[0.14em] uppercase text-muted">
          Order Summary
        </div>

        <div className="flex items-baseline justify-between py-2.5 text-[14px]">
          <span className="text-fg-2">小計（{itemCount} 件）</span>
          <span className="font-mono tabular-nums">
            NT$ {subtotal.toLocaleString("zh-TW")}
          </span>
        </div>
        <div className="flex items-baseline justify-between py-2.5 text-[14px]">
          <span className="text-fg-2">配送費</span>
          <span className="font-mono tabular-nums">
            {shippingFree ? (
              <span className="text-success">免運（滿 NT$ 1,200）</span>
            ) : (
              <span className="text-fg-2">結帳時計算</span>
            )}
          </span>
        </div>

        <div className="mt-4 flex items-baseline justify-between border-t border-border pt-6">
          <span className="font-mono text-[11px] tracking-[0.18em] uppercase text-muted">
            總計
          </span>
          <span className="font-serif text-[38px] tabular-nums">
            <small className="mr-1.5 font-mono text-[12px] text-muted">NT$</small>
            {total.toLocaleString("zh-TW")}
          </span>
        </div>

        <Button
          href="/login?callbackUrl=/cart"
          variant="primary"
          block
          className="mt-7"
        >
          登入後結帳 →
        </Button>

        <ul className="mt-6 border-t border-border pt-6 font-mono text-[11px] leading-[1.7] tracking-[0.04em] text-muted">
          {[
            "下週一烘焙完成隔日出貨",
            "登入後購物車會自動同步",
            "新會員首次訂閱享 9 折",
          ].map((note) => (
            <li key={note} className="relative py-1 pl-4">
              <span className="absolute left-0 text-accent">—</span>
              {note}
            </li>
          ))}
        </ul>
      </aside>
    </section>
  );
}
