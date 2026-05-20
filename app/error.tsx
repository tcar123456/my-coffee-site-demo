"use client";

// Phase 9c — root error boundary
// Next.js 自動 mount 此 page 於 server/client runtime error；必須是 client component。
// `reset()` 重新 mount segment（不是整頁 reload）；對 transient error 有用。

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 上 sentry / logger 的話這裡接；目前只 log to console
    console.error("[error boundary]", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-[var(--gutter)] py-20 text-center">
      <div className="font-mono text-[11px] tracking-[0.24em] uppercase text-danger">
        Error · Runtime
      </div>
      <h1 className="mt-6 font-serif text-[clamp(40px,5.5vw,72px)] leading-tight tracking-[-0.01em]">
        頁面遇到了一點問題
      </h1>
      <p className="mt-5 max-w-[44ch] text-[15px] leading-[1.7] text-fg-2">
        可能是暫時的網路波動，也可能是我們這邊的 bug。請稍候片刻再試，
        或回到首頁重新挑豆。
      </p>

      {error.digest && (
        <p className="mt-3 font-mono text-[11px] tracking-[0.08em] text-muted">
          錯誤代碼 · {error.digest}
        </p>
      )}

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3.5">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 border border-accent bg-accent px-[22px] py-3.5 font-mono text-[12px] font-semibold tracking-[0.16em] text-bg uppercase transition-all duration-200 hover:border-accent-hi hover:bg-accent-hi"
        >
          重試 ↻
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 border border-border bg-transparent px-[22px] py-3.5 font-mono text-[12px] tracking-[0.16em] text-fg-2 uppercase transition-colors duration-200 hover:border-accent hover:text-accent"
        >
          回首頁
        </Link>
      </div>
    </main>
  );
}
