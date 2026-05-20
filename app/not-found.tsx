// Phase 9c — root not-found
// Next.js 觸發於 `notFound()` 或路由不存在；此 page 不繼承 (shop) layout（root 級）
// 自帶最小 chrome：logo 連回首頁。

import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-[var(--gutter)] py-20 text-center">
      <div className="font-mono text-[11px] tracking-[0.24em] uppercase text-accent">
        Error · 404
      </div>
      <h1 className="mt-6 font-serif text-[clamp(56px,8vw,128px)] leading-none tracking-[-0.02em]">
        找不到此頁
      </h1>
      <p className="mt-6 max-w-[40ch] text-[15px] leading-[1.7] text-fg-2">
        你尋找的頁面可能已經移除、改名，或是這趟旅程從來不存在。
      </p>
      <p className="mt-1 font-mono text-[11px] tracking-[0.08em] text-muted">
        要回到單品咖啡，或者品牌的編年敘事都好。
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3.5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 border border-accent bg-accent px-[22px] py-3.5 font-mono text-[12px] font-semibold tracking-[0.16em] text-bg uppercase transition-all duration-200 hover:border-accent-hi hover:bg-accent-hi"
        >
          回首頁 →
        </Link>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 border border-border bg-transparent px-[22px] py-3.5 font-mono text-[12px] tracking-[0.16em] text-fg-2 uppercase transition-colors duration-200 hover:border-accent hover:text-accent"
        >
          看單品咖啡
        </Link>
      </div>

      <div className="mt-16 font-mono text-[10px] tracking-[0.24em] uppercase text-muted">
        MUBEI · EST 2026
      </div>
    </main>
  );
}
