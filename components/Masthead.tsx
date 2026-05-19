"use client";

import { useEffect, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Session } from "next-auth";
import { signOutAction } from "@/app/actions/auth";
import { mergeGuestCart } from "@/app/actions/cart";
import { useCartStore, selectCartCount } from "@/lib/cart-store";

const navItems = [
  { href: "/", label: "首頁" },
  { href: "/products", label: "單品咖啡" },
  { href: "/brand", label: "品牌故事" },
  { href: "/account", label: "訂閱配送" },
];

export function Masthead({
  session,
  serverCartCount = 0,
}: {
  session: Session | null;
  serverCartCount?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const user = session?.user;

  const guestCount = useCartStore(selectCartCount);
  const hasHydrated = useCartStore((s) => s.hasHydrated);

  // 登入後第一次渲染：若 localStorage 有訪客 cart，merge 到 DB 後清空 store。
  // dep 為 user.id：每位用戶 session 存在期間只會觸發一次
  // （store.clear 後 items.length === 0，下次重新渲染不會再 merge）。
  const [, startTransition] = useTransition();
  useEffect(() => {
    if (!user?.id || !hasHydrated) return;
    const items = useCartStore.getState().items;
    if (items.length === 0) return;
    startTransition(async () => {
      const res = await mergeGuestCart(items);
      if (res.ok) {
        useCartStore.getState().clear();
        router.refresh();
      }
    });
  }, [user?.id, hasHydrated, router]);

  // hydration 前：顯示 server 提供的數字（登入用戶為實值，訪客為 0）
  // hydration 後：登入用戶仍用 server count；訪客切換成 store 計算的件數
  const cartCount = !hasHydrated
    ? serverCartCount
    : user
      ? serverCartCount
      : guestCount;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-[color-mix(in_oklch,var(--bg)_88%,transparent)] backdrop-blur-md backdrop-saturate-150">
      <div className="mx-auto grid max-w-[var(--max)] grid-cols-[auto_1fr_auto] items-center gap-8 px-[var(--gutter)] py-4">
        <Link href="/" className="flex items-baseline gap-3">
          <span className="font-serif text-2xl tracking-[0.04em] text-fg">暮焙</span>
          <span className="font-mono text-[10px] tracking-[0.32em] text-muted">MUBEI</span>
        </Link>

        <nav className="flex justify-center gap-8 text-[13px] tracking-[0.04em] text-fg-2 max-md:hidden">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative py-1 transition-colors hover:text-accent ${
                  active ? "text-fg after:absolute after:-bottom-1.5 after:left-0 after:right-0 after:h-px after:bg-accent" : ""
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-[18px] text-[13px] text-fg-2">
          {user ? (
            <>
              {user.role === "SELLER" && (
                <>
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-1.5 border border-accent-tint px-2 py-1 font-mono text-[10px] tracking-[0.18em] uppercase text-accent transition-colors hover:border-accent hover:bg-accent-tint"
                  >
                    賣家後台 →
                  </Link>
                  <span className="text-dim">·</span>
                </>
              )}
              <Link href="/account" className="hover:text-accent">
                {user.name ?? user.email?.split("@")[0] ?? "會員中心"}
              </Link>
              <span className="text-dim">·</span>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted hover:text-accent"
                >
                  登出
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="hover:text-accent">登入</Link>
          )}
          <span className="text-dim">·</span>
          <Link href="/cart" className="hover:text-accent">
            購物車
            {cartCount > 0 && (
              <span className="ml-1.5 inline-flex h-[18px] min-w-5 items-center justify-center rounded-[9px] bg-accent px-1.5 font-mono text-[10px] font-semibold text-bg">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
