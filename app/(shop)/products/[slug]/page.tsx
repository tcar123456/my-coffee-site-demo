import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getWishlistedProductIds } from "@/lib/wishlist-server";
import { Button } from "@/components/ui/Button";
import { AddToCartForm } from "@/components/AddToCartForm";
import { WishlistHeartButton } from "@/components/WishlistHeartButton";
import type { RoastLevel } from "../../../../generated/prisma/enums";

const roastLabel: Record<RoastLevel, string> = {
  LIGHT: "淺焙",
  MEDIUM_LIGHT: "中淺",
  MEDIUM: "中焙",
  MEDIUM_DARK: "中深",
  DARK: "深焙",
};

// Phase 9b — 動態 metadata：title/desc 接 product；openGraph 帶第一張產品圖
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    select: {
      name: true,
      origin: true,
      flavorNotes: true,
      description: true,
      images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
    },
  });
  if (!product) return { title: "找不到此商品" };

  const desc =
    product.description?.slice(0, 140) ??
    `${product.origin} · ${product.flavorNotes}`;

  return {
    title: `${product.name} · ${product.origin}`,
    description: desc,
    openGraph: {
      title: `${product.name} · ${product.origin}`,
      description: desc,
      images: product.images[0]?.url
        ? [{ url: product.images[0].url }]
        : undefined,
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [product, session] = await Promise.all([
    prisma.product.findUnique({
      where: { slug },
      include: { images: { orderBy: { sortOrder: "asc" } } },
    }),
    auth(),
  ]);

  if (!product || !product.isActive) {
    notFound();
  }

  const soldOut = product.stock === 0;
  const isLoggedIn = !!session?.user;
  const wishlistedIds = await getWishlistedProductIds(session?.user?.id);
  const inWishlist = wishlistedIds.has(product.id);

  return (
    <article className="mx-auto max-w-[var(--max)] px-[var(--gutter)] pt-[clamp(40px,5vw,72px)] pb-[clamp(72px,9vw,128px)]">
      {/* Breadcrumb */}
      <nav className="mb-[clamp(28px,4vw,48px)] font-mono text-[11px] tracking-[0.16em] uppercase text-muted">
        <Link href="/" className="hover:text-accent">
          首頁
        </Link>
        <span className="px-2 text-dim">/</span>
        <Link href="/products" className="hover:text-accent">
          單品咖啡
        </Link>
        <span className="px-2 text-dim">/</span>
        <span className="text-fg-2">{product.name}</span>
      </nav>

      <div className="grid grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] items-start gap-[clamp(40px,5vw,80px)] max-[900px]:grid-cols-1 max-[900px]:gap-10">
        {/* Cover + thumbnails */}
        <div className="sticky top-24 max-[900px]:static">
          <div
            className={`${product.images[0] ? "bg-surface" : `bean-cover ${product.coverVariant ? `bean-cover--alt-${product.coverVariant}` : ""}`} relative aspect-[4/5] overflow-hidden border border-border`}
          >
            {product.images[0] && (
              <Image
                src={product.images[0].url}
                alt={product.images[0].alt ?? product.name}
                fill
                priority
                sizes="(min-width:900px) 50vw, 100vw"
                className="object-cover"
              />
            )}
            <span className="absolute top-5 left-5 z-10 font-mono text-[10px] tracking-[0.22em] text-fg-2">
              {product.origin.split(" · ")[0]}
            </span>
            <span className="absolute top-5 right-5 z-10 font-mono text-[10px] tracking-[0.16em] uppercase text-accent">
              {roastLabel[product.roastLevel]}
            </span>
            {product.badge && (
              <span className="absolute bottom-5 left-5 z-[2] border border-accent-tint bg-bg px-2.5 py-1 font-mono text-[9px] tracking-[0.18em] uppercase text-accent">
                {product.badge}
              </span>
            )}
            {soldOut && (
              <div className="absolute inset-0 z-[3] flex items-center justify-center bg-[oklch(15%_0.005_250_/_0.7)] backdrop-blur-[2px] font-mono text-[14px] tracking-[0.32em] uppercase text-accent">
                已售完
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {product.images.slice(0, 8).map((img) => (
                <div
                  key={img.id}
                  className="relative aspect-square border border-border bg-surface"
                >
                  <Image
                    src={img.url}
                    alt={img.alt ?? product.name}
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-7">
          <span className="font-mono text-[11px] tracking-[0.18em] uppercase text-muted">
            {product.origin}
          </span>

          <h1 className="text-[clamp(32px,3.6vw,52px)] leading-[1.05] tracking-[-0.01em] text-fg">
            {product.name}
          </h1>

          <p className="text-[18px] italic leading-[1.55] text-fg-2">
            {product.flavorNotes}
          </p>

          {/* Spec list */}
          <dl className="mt-2 grid grid-cols-2 gap-y-3.5 border-y border-border py-6 font-mono text-[12px] tracking-[0.08em]">
            <dt className="text-muted">烘焙度</dt>
            <dd className="text-fg-2 text-right">{roastLabel[product.roastLevel]}</dd>
            <dt className="text-muted">處理法</dt>
            <dd className="text-fg-2 text-right">{product.processingMethod}</dd>
            <dt className="text-muted">規格</dt>
            <dd className="text-fg-2 text-right">{product.weightGram} g</dd>
            <dt className="text-muted">庫存</dt>
            <dd className={`text-right ${soldOut ? "text-muted" : "text-accent"}`}>
              {soldOut ? "補貨中" : `${product.stock} 罐`}
            </dd>
          </dl>

          {/* Price */}
          <div className="flex items-end justify-between gap-6 max-[480px]:flex-col max-[480px]:items-start">
            <div>
              <div className={`font-serif text-[clamp(34px,4vw,46px)] tabular-nums leading-none ${soldOut ? "text-muted" : "text-fg"}`}>
                <span className="mr-1.5 font-mono text-[12px] tracking-[0.08em] text-muted">
                  NT$
                </span>
                {product.price.toLocaleString("zh-TW")}
              </div>
              <div className="mt-2 font-mono text-[10px] tracking-[0.14em] text-muted">
                建議養豆 7–10 天 · 烘焙日期請見包裝
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <WishlistHeartButton
                productId={product.id}
                isLoggedIn={isLoggedIn}
                initialInWishlist={inWishlist}
                loginCallback={`/products/${slug}`}
              />
              {soldOut && <Button variant="ghost">補貨通知</Button>}
            </div>
          </div>

          {/* Add to cart form */}
          {!soldOut && (
            <div className="border-t border-border pt-7">
              <AddToCartForm
                productId={product.id}
                isLoggedIn={isLoggedIn}
                maxStock={product.stock}
              />
            </div>
          )}

          {/* Description */}
          {product.description ? (
            <section className="mt-4 border-t border-border pt-7">
              <h2 className="mb-3.5 font-mono text-[11px] tracking-[0.18em] uppercase text-accent">
                關於這支豆子
              </h2>
              <p className="text-[15px] leading-[1.7] text-fg-2 whitespace-pre-line">
                {product.description}
              </p>
            </section>
          ) : (
            <section className="mt-4 border-t border-border pt-7">
              <h2 className="mb-3.5 font-mono text-[11px] tracking-[0.18em] uppercase text-accent">
                關於這支豆子
              </h2>
              <p className="text-[14px] italic leading-[1.7] text-muted">
                詳細介紹整理中——若想先了解這支豆的細節，歡迎透過頁尾 LINE 與我們聯繫。
              </p>
            </section>
          )}
        </div>
      </div>
    </article>
  );
}
