"use client";

// Phase 5c — 優惠碼列表 row 操作（client）
// 兩顆：編輯 Link / 啟用-停用 toggle（不真刪，usedCount 統計要保留）

import Link from "next/link";
import { useState, useTransition } from "react";
import { togglePromoCodeActive } from "@/app/actions/admin-promo";

const baseBtn =
  "inline-flex items-center justify-center border px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60";

const ghostBtn = `${baseBtn} border-border bg-transparent text-fg-2 hover:border-accent hover:text-accent`;
const toggleBtn = `${baseBtn} border-border-hi bg-transparent text-fg-2 hover:border-accent hover:text-accent`;

export function PromoRowActions({
  promoId,
  isActive,
}: {
  promoId: string;
  isActive: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      const result = await togglePromoCodeActive(promoId);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <Link
          href={`/admin/promo/${promoId}/edit`}
          prefetch={false}
          className={ghostBtn}
        >
          編輯
        </Link>
        <button
          type="button"
          onClick={handleToggle}
          disabled={isPending}
          className={toggleBtn}
        >
          {isActive ? "停用" : "啟用"}
        </button>
      </div>
      {error && (
        <span
          role="alert"
          className="font-mono text-[10px] tracking-[0.04em] text-danger"
        >
          ✗ {error}
        </span>
      )}
    </div>
  );
}
