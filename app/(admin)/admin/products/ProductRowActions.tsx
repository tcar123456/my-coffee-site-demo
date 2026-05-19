"use client";

// Phase 5b — 商品列表 row 操作按鈕（client）
// 三顆操作：編輯（Link）/ 上下架 toggle / 刪除
// 用 useTransition 管理 pending；刪除前 window.confirm；失敗訊息 inline 顯示在按鈕下方。

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  toggleProductActive,
  deleteProduct,
} from "@/app/actions/admin-products";

const DELETE_CONFIRM_MESSAGE =
  "永久刪除此商品？此操作無法恢復。若商品已有訂單記錄，會自動擋下並提示改用「下架」。";

const baseBtn =
  "inline-flex items-center justify-center border px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60";

const ghostBtn = `${baseBtn} border-border bg-transparent text-fg-2 hover:border-accent hover:text-accent`;
const toggleBtn = `${baseBtn} border-border-hi bg-transparent text-fg-2 hover:border-accent hover:text-accent`;
const dangerBtn = `${baseBtn} border-[oklch(40%_0.10_25)] bg-transparent text-danger hover:border-danger hover:bg-[oklch(26%_0.06_25)]`;

export function ProductRowActions({
  productId,
  isActive,
}: {
  productId: string;
  isActive: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      const result = await toggleProductActive(productId);
      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  function handleDelete() {
    if (isPending) return;
    const ok = window.confirm(DELETE_CONFIRM_MESSAGE);
    if (!ok) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteProduct(productId);
      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <Link
          href={`/admin/products/${productId}/edit`}
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
          {isActive ? "下架" : "上架"}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className={dangerBtn}
        >
          刪除
        </button>
      </div>
      {error && (
        <span
          role="alert"
          className="max-w-[280px] text-right font-mono text-[10px] leading-[1.45] tracking-[0.04em] text-danger"
        >
          ✗ {error}
        </span>
      )}
    </div>
  );
}
