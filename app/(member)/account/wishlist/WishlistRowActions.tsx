"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { removeFromWishlist } from "@/app/actions/wishlist";

export function WishlistRowActions({
  productId,
  productSlug,
}: {
  productId: string;
  productSlug: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onRemove = () => {
    startTransition(async () => {
      await removeFromWishlist(productId);
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-3">
      <Link
        href={`/products/${productSlug}`}
        className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted transition-colors hover:text-accent"
      >
        查看商品 →
      </Link>
      <button
        type="button"
        onClick={onRemove}
        disabled={isPending}
        className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted transition-colors hover:text-danger disabled:opacity-40"
      >
        {isPending ? "移除中…" : "移除"}
      </button>
    </div>
  );
}
