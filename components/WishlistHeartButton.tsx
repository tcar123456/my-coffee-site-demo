"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toggleWishlist } from "@/app/actions/wishlist";

type Props = {
  productId: string;
  isLoggedIn: boolean;
  initialInWishlist: boolean;
  loginCallback: string;
};

export function WishlistHeartButton({
  productId,
  isLoggedIn,
  initialInWishlist,
  loginCallback,
}: Props) {
  const router = useRouter();
  const [inWishlist, setInWishlist] = useState(initialInWishlist);
  const [isPending, startTransition] = useTransition();

  if (!isLoggedIn) {
    return (
      <Link
        href={`/login?callbackUrl=${encodeURIComponent(loginCallback)}`}
        aria-label="登入後加入收藏"
        className="inline-flex h-11 items-center gap-2 border border-border px-4 font-mono text-[11px] tracking-[0.16em] uppercase text-muted transition-colors hover:border-accent hover:text-accent"
      >
        <Heart filled={false} />
        加入收藏
      </Link>
    );
  }

  const onClick = () => {
    const next = !inWishlist;
    setInWishlist(next);
    startTransition(async () => {
      const res = await toggleWishlist(productId);
      if (res.ok) {
        setInWishlist(res.inWishlist);
        router.refresh();
      } else {
        setInWishlist(!next);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      aria-pressed={inWishlist}
      aria-label={inWishlist ? "從收藏移除" : "加入收藏"}
      className={`inline-flex h-11 items-center gap-2 border px-4 font-mono text-[11px] tracking-[0.16em] uppercase transition-colors disabled:opacity-60 ${
        inWishlist
          ? "border-accent-tint bg-[oklch(20%_0.04_70)] text-accent"
          : "border-border text-muted hover:border-accent hover:text-accent"
      }`}
    >
      <Heart filled={inWishlist} />
      {inWishlist ? "已收藏" : "加入收藏"}
    </button>
  );
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
