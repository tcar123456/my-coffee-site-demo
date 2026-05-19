// Phase 5b — 新增商品頁
// 純 server component shell；表單與互動邏輯在 ProductForm（client）。
// 圖片上傳要等商品存檔有 id 後才能進行，建立成功 server action 會 redirect 到 [id]/edit。

import Link from "next/link";
import { ProductForm } from "../ProductForm";

export default function AdminProductNewPage() {
  return (
    <section className="bg-bg p-[clamp(28px,3.5vw,48px)]">
      {/* Header */}
      <div className="mb-8 border-b border-border pb-6">
        <div className="mb-3 font-mono text-[11px] tracking-[0.18em] uppercase">
          <Link href="/admin" className="text-muted hover:text-accent">
            後台
          </Link>
          <span className="mx-3 text-border">/</span>
          <Link href="/admin/products" className="text-muted hover:text-accent">
            商品管理
          </Link>
          <span className="mx-3 text-border">/</span>
          <span className="text-accent">新增商品</span>
        </div>
        <h1 className="font-serif text-[clamp(28px,3vw,40px)] leading-none tracking-[-0.01em]">
          新增商品
        </h1>
        <p className="mt-3 max-w-[60ch] text-[13px] leading-[1.55] text-fg-2">
          儲存後會自動跳轉到編輯頁，可在那邊上傳商品圖片。
        </p>
      </div>

      <div className="max-w-[920px]">
        <ProductForm mode="create" />
      </div>
    </section>
  );
}
