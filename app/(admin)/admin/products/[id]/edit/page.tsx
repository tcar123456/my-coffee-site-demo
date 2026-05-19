// Phase 5b — 編輯商品頁
// Server component；撈 product（含 images sorted asc）後分別交給 ProductForm 與 ProductImageManager。

import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductForAdmin } from "@/app/actions/admin-products";
import { ProductForm } from "../../ProductForm";
import { ProductImageManager } from "./ProductImageManager";
import type { ProductFormValues } from "@/lib/schemas/product";
import type { RoastLevel } from "@/generated/prisma/enums";

export default async function AdminProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductForAdmin(id);
  if (!product) notFound();

  // 把 Prisma row 轉成 ProductFormValues（型別契合 + null → 空字串）
  const initialValues: ProductFormValues = {
    name: product.name,
    slug: product.slug,
    origin: product.origin,
    roastLevel: product.roastLevel as RoastLevel,
    processingMethod: product.processingMethod,
    flavorNotes: product.flavorNotes,
    description: product.description ?? "",
    price: product.price,
    weightGram: product.weightGram,
    stock: product.stock,
    badge: product.badge ?? "",
    coverVariant: product.coverVariant ?? null,
    isActive: product.isActive,
  };

  return (
    <section className="bg-bg p-[clamp(28px,3.5vw,48px)]">
      {/* Header */}
      <div className="mb-8 border-b border-border pb-6">
        <div className="mb-3 font-mono text-[11px] tracking-[0.18em] uppercase">
          <Link href="/admin" className="text-muted hover:text-accent">
            後台
          </Link>
          <span className="mx-3 text-border">/</span>
          <Link href="/admin/products" className="text-muted hover:text-accent">
            商品管理
          </Link>
          <span className="mx-3 text-border">/</span>
          <span className="text-accent">{product.name}</span>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-[clamp(28px,3vw,40px)] leading-none tracking-[-0.01em]">
              {product.name}
            </h1>
            <div className="mt-2.5 flex items-center gap-3 font-mono text-[11px] tracking-[0.14em] uppercase">
              <span className="text-muted">{product.slug}</span>
              <span
                className={`inline-flex items-center gap-1.5 before:size-1.5 before:rounded-full ${
                  product.isActive
                    ? "text-success before:bg-success"
                    : "text-muted before:bg-muted"
                }`}
              >
                {product.isActive ? "上架中" : "已下架"}
              </span>
            </div>
          </div>
          <Link
            href={`/products/${product.slug}`}
            target="_blank"
            className="inline-flex items-center gap-2.5 border border-border-hi bg-transparent px-[22px] py-3 font-mono text-[12px] tracking-[0.16em] uppercase text-fg transition-colors duration-200 hover:border-accent hover:text-accent"
          >
            前台預覽 ↗
          </Link>
        </div>
      </div>

      <div className="grid max-w-[1200px] gap-6">
        <ProductForm
          mode="edit"
          initialValues={initialValues}
          productId={product.id}
        />
        <ProductImageManager
          productId={product.id}
          initialImages={product.images}
        />
      </div>
    </section>
  );
}
