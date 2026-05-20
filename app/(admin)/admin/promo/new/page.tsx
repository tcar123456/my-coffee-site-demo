// Phase 5c — 新增優惠碼頁
// 純 server shell；建立成功 server action 會 redirect 到 [id]/edit。

import Link from "next/link";
import { PromoCodeForm } from "../PromoCodeForm";

export default function AdminPromoNewPage() {
  return (
    <section className="bg-bg p-[clamp(28px,3.5vw,48px)]">
      <div className="mb-8 border-b border-border pb-6">
        <div className="mb-3 font-mono text-[11px] tracking-[0.18em] uppercase">
          <Link href="/admin" className="text-muted hover:text-accent">
            後台
          </Link>
          <span className="mx-3 text-border">/</span>
          <Link href="/admin/promo" className="text-muted hover:text-accent">
            優惠碼
          </Link>
          <span className="mx-3 text-border">/</span>
          <span className="text-accent">新增</span>
        </div>
        <h1 className="text-[clamp(28px,3vw,40px)] leading-none tracking-[-0.01em]">
          新增優惠碼
        </h1>
        <p className="mt-3 max-w-[60ch] text-[13px] leading-[1.55] text-fg-2">
          建立後會跳轉到編輯頁，可隨時調整折扣或停用。前台兌換邏輯預計 Phase 7a 實作。
        </p>
      </div>

      <div className="max-w-[920px]">
        <PromoCodeForm mode="create" />
      </div>
    </section>
  );
}
