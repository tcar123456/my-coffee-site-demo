"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "首頁" },
  { href: "/products", label: "單品咖啡" },
  { href: "/brand", label: "品牌故事" },
  { href: "/account", label: "訂閱配送" },
];

export function Masthead() {
  const pathname = usePathname();

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

        <div className="flex items-center gap-[22px] text-[13px] text-fg-2">
          <Link href="/account" className="hover:text-accent">登入</Link>
          <span className="text-dim">·</span>
          <Link href="/cart" className="hover:text-accent">
            購物車
            <span className="ml-1.5 inline-flex h-[18px] min-w-5 items-center justify-center rounded-[9px] bg-accent px-1.5 font-mono text-[10px] font-semibold text-bg">
              2
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
