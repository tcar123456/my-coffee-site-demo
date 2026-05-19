"use client";

// Phase 5a — 後台共用側邊欄
// 由 (admin) layout 預先撈 count，client component 只負責顯示 + active 樣式。
// active 比對：完全相等用 'exact'；前綴比對用 'prefix'（讓 /admin/orders/[orderNumber] 也算 active）。

import Link from "next/link";
import { usePathname } from "next/navigation";

export type AdminRailItem = {
  label: string;
  num?: string;
  href?: string;
  match?: "exact" | "prefix";
};

export type AdminRailGroup = {
  title: string;
  items: AdminRailItem[];
};

export function AdminSideRail({ groups }: { groups: AdminRailGroup[] }) {
  const pathname = usePathname();

  function isActive(item: AdminRailItem): boolean {
    if (!item.href) return false;
    if (item.match === "prefix") return pathname.startsWith(item.href);
    return pathname === item.href;
  }

  return (
    <aside className="sticky top-[60px] h-[calc(100vh-60px)] self-start overflow-y-auto border-r border-border bg-bg py-5 max-[900px]:hidden">
      {groups.map((group) => (
        <div key={group.title} className="px-5 py-3">
          <div className="pb-3 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">
            {group.title}
          </div>
          {group.items.map((item) => {
            const active = isActive(item);
            const baseRowClass = `-mx-3.5 flex items-center justify-between border-l-2 px-3.5 py-[9px] text-[13px] transition-all duration-150 ${
              active
                ? "border-l-accent bg-surface text-fg"
                : "border-l-transparent text-fg-2 hover:text-fg"
            }`;
            const badgeClass = `border px-1.5 py-0.5 font-mono text-[10px] tabular-nums ${
              active
                ? "border-accent-tint bg-surface text-accent"
                : "border-border bg-surface text-muted"
            }`;
            const content = (
              <>
                <span>{item.label}</span>
                {item.num !== undefined && (
                  <span className={badgeClass}>{item.num}</span>
                )}
              </>
            );
            if (!item.href) {
              return (
                <span
                  key={item.label}
                  className={`${baseRowClass} cursor-not-allowed text-dim`}
                  title="預計於後續 phase 上線"
                >
                  {content}
                </span>
              );
            }
            return (
              <Link key={item.label} href={item.href} className={baseRowClass}>
                {content}
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
