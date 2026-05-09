import Link from "next/link";

/**
 * AdminMasthead — separate from the public-shop Masthead.
 *
 * Posture differences vs. /components/Masthead.tsx:
 *  - Wider container (1600px) and tighter vertical padding
 *  - Adds a "賣家後台" role tag next to the brand
 *  - Center cell holds a global search box ((cmd-K) hint), not nav links
 *  - Right cell shows notification bell, avatar, operator name
 *
 * The side rail in app/(admin)/admin/page.tsx covers the section nav,
 * so this masthead intentionally has no nav links. Server component —
 * no usePathname needed.
 */
export function AdminMasthead() {
  return (
    <header className="border-b border-border bg-bg">
      <div className="mx-auto grid max-w-[1600px] grid-cols-[auto_1fr_auto] items-center gap-8 px-[var(--gutter)] py-[14px] max-[860px]:grid-cols-[auto_auto] max-[860px]:gap-4">
        {/* Brand + role */}
        <Link href="/admin" className="flex items-baseline gap-3">
          <span className="font-serif text-[22px] tracking-[0.04em] text-fg">
            暮焙
          </span>
          <span className="font-mono text-[10px] tracking-[0.32em] text-muted">
            MUBEI
          </span>
          <span className="ml-2 border border-accent-tint px-2.5 py-1 font-mono text-[10px] tracking-[0.22em] uppercase text-accent">
            賣家後台
          </span>
        </Link>

        {/* Search */}
        <div className="mx-auto flex w-full max-w-[480px] items-stretch border border-border bg-surface max-[860px]:hidden">
          <input
            type="search"
            placeholder="搜尋訂單、商品、顧客 … (⌘K)"
            className="flex-1 border-0 bg-transparent px-3.5 py-2.5 text-[13px] text-fg placeholder:text-muted focus:outline-none"
          />
          <span className="m-1 border border-border bg-surface-2 px-2.5 py-1.5 font-mono text-[10px] text-muted">
            ⌘ K
          </span>
        </div>

        {/* User cluster */}
        <div className="flex items-center gap-3.5">
          <span
            className="relative flex size-8 items-center justify-center border border-border text-[14px] text-fg-2 after:absolute after:top-1 after:right-1 after:size-1.5 after:rounded-full after:bg-accent"
            aria-label="通知"
          >
            ⌖
          </span>
          <span
            className="flex size-8 items-center justify-center rounded-full font-mono text-[11px] text-accent"
            style={{
              background:
                "linear-gradient(135deg, oklch(34% 0.06 60), oklch(20% 0.03 50))",
            }}
          >
            LZ
          </span>
          <span className="font-mono text-[11px] tracking-[0.06em] text-fg-2 max-[1100px]:hidden">
            林子翔 · 主理人
          </span>
        </div>
      </div>
    </header>
  );
}
