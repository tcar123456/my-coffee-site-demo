// Phase 9c — root loading
// Server component；Next.js streaming render 期間自動 mount。

export default function GlobalLoading() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-[var(--gutter)] py-20 text-center">
      <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.24em] uppercase text-accent">
        <span
          className="inline-block size-2 animate-pulse rounded-full bg-accent"
          aria-hidden="true"
        />
        Loading
      </div>
      <p className="mt-6 font-serif text-[clamp(20px,2.2vw,28px)] leading-tight text-fg-2">
        正在為你溫杯…
      </p>
      <span className="sr-only" role="status" aria-live="polite">
        頁面載入中
      </span>
    </main>
  );
}
