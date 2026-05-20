// Phase 9a — 法規 3 頁共用 layout
// 提供：disclaimer banner（作品集示範聲明）+ 側欄 nav（3 頁互相切換）+ 容器尺寸對齊 brand page。

import { PolicyNav } from "./PolicyNav";

export default function PolicyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <section className="border-b border-border bg-surface px-[var(--gutter)] py-3.5">
        <p className="mx-auto max-w-[var(--max)] text-center font-mono text-[11px] tracking-[0.12em] leading-[1.6] text-muted">
          本頁為作品集示範文案 · 非真實營運法規 · 實際上線前應由法律顧問審閱
        </p>
      </section>

      <section className="mx-auto grid max-w-[var(--max)] grid-cols-[220px_1fr] items-start gap-14 px-[var(--gutter)] pt-[clamp(40px,5vw,72px)] pb-[clamp(64px,8vw,112px)] max-[900px]:grid-cols-1 max-[900px]:gap-8">
        <PolicyNav />
        <article className="max-w-[68ch]">{children}</article>
      </section>
    </>
  );
}
