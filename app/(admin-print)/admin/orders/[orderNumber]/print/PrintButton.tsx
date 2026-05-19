"use client";

// Phase 5a — 列印按鈕；@media print 隱藏（Tailwind 內建 print:hidden 對應 @media print { display: none }）

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="fixed top-6 right-6 z-50 inline-flex items-center gap-2 border border-black bg-black px-5 py-2.5 font-mono text-[11px] tracking-[0.18em] uppercase text-white shadow-md transition-colors hover:bg-neutral-800 print:hidden"
    >
      列印 ↗
    </button>
  );
}
