import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listWishlist } from "@/app/actions/wishlist";
import { Button } from "@/components/ui/Button";
import { WishlistRowActions } from "./WishlistRowActions";

export default async function WishlistPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const items = await listWishlist();

  return (
    <>
      {/* ========== Header ========== */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-[var(--max)] px-[var(--gutter)] py-[clamp(40px,5vw,64px)]">
          <div className="mb-3 font-mono text-[11px] tracking-[0.18em] uppercase text-accent">
            <Link href="/account" className="text-muted hover:text-accent">
              ← 會員中心
            </Link>
            <span className="mx-3 text-border">/</span>
            收藏豆款
          </div>
          <h1 className="text-[clamp(28px,3.6vw,44px)] leading-none tracking-[-0.01em]">
            收藏豆款
          </h1>
          <div className="mt-3 font-mono text-[11px] tracking-[0.14em] uppercase text-muted">
            共 {items.length.toString().padStart(2, "0")} 支已收藏
          </div>
        </div>
      </section>

      {/* ========== Body ========== */}
      <section className="mx-auto max-w-[var(--max)] px-[var(--gutter)] pt-[clamp(32px,4vw,56px)] pb-[clamp(64px,8vw,112px)]">
        {items.length === 0 ? (
          <div className="border border-border bg-surface px-[var(--gutter)] py-[clamp(64px,8vw,112px)] text-center">
            <p className="text-[24px] leading-[1.4] text-fg-2">
              尚未收藏豆款
            </p>
            <p className="mt-3 font-mono text-[12px] tracking-[0.08em] text-muted">
              逛逛單品，遇到喜歡的就加入收藏。
            </p>
            <div className="mt-8 flex justify-center">
              <Button href="/products" variant="primary">
                逛逛單品咖啡 →
              </Button>
            </div>
          </div>
        ) : (
          <div className="border border-border bg-surface">
            {items.map((item, idx) => {
              const variantClass = item.product.coverVariant
                ? `bean-cover--alt-${item.product.coverVariant}`
                : "";
              const numLabel = (idx + 1).toString().padStart(2, "0");
              const originLabel = item.product.origin.split(" · ")[0];
              return (
                <div
                  key={item.id}
                  className="grid grid-cols-[80px_1fr_auto_auto] items-center gap-5 border-b border-border px-7 py-5 last:border-b-0 max-[700px]:grid-cols-[64px_1fr] max-[700px]:gap-3"
                >
                  <Link
                    href={`/products/${item.product.slug}`}
                    className={`bean-cover ${variantClass} relative aspect-square overflow-hidden border border-border max-[700px]:row-span-2`}
                    aria-hidden="true"
                  />
                  <div className="max-[700px]:col-start-2">
                    <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted">
                      N° {numLabel} · {originLabel}
                    </div>
                    <Link
                      href={`/products/${item.product.slug}`}
                      className="mt-1 block text-[18px] leading-[1.2] text-fg hover:text-accent"
                    >
                      {item.product.name}
                    </Link>
                    {item.product.stock === 0 && (
                      <div className="mt-1 font-mono text-[11px] text-muted">
                        補貨中
                      </div>
                    )}
                  </div>
                  <div className="font-mono text-[14px] text-accent tabular-nums max-[700px]:col-start-2">
                    NT$ {item.product.price.toLocaleString("zh-TW")}
                  </div>
                  <div className="max-[700px]:col-span-2">
                    <WishlistRowActions
                      productId={item.product.id}
                      productSlug={item.product.slug}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
