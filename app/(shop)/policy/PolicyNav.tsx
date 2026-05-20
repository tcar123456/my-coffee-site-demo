"use client";

// Phase 9a — 法規側欄 nav（client，用 usePathname 標 active）

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/policy/privacy", label: "隱私權政策" },
  { href: "/policy/refund", label: "退換貨政策" },
  { href: "/policy/seven-day-right", label: "7 日鑑賞期" },
];

export function PolicyNav() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-20 max-[900px]:static">
      <div className="mb-4 font-mono text-[10px] tracking-[0.22em] uppercase text-accent">
        法規 / Legal
      </div>
      <nav className="flex flex-col">
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`border-l-2 py-[11px] pl-3.5 text-[14px] transition-all duration-150 ${
                active
                  ? "border-l-accent text-accent"
                  : "border-l-transparent text-muted hover:border-l-accent hover:bg-surface hover:text-fg"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
