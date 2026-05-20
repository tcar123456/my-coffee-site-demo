// Phase 9a — Policy 頁共用 typography primitives
// 3 個 policy 頁共用：Heading（h1 + 更新日期）+ Section（編號 h2 + body）+ Para + List。
// 不過度抽 — 只有出現在 2+ 頁時才提；這 4 個 helper 每頁都用。

export function Heading({
  title,
  updatedAt,
}: {
  title: string;
  updatedAt: string;
}) {
  return (
    <header className="mb-12 border-b border-border pb-8">
      <h1 className="font-serif text-[clamp(36px,4.6vw,56px)] leading-[1.05] tracking-[-0.01em]">
        {title}
      </h1>
      <div className="mt-4 font-mono text-[11px] tracking-[0.16em] uppercase text-muted">
        最後更新 · {updatedAt}
      </div>
    </header>
  );
}

export function Section({
  num,
  title,
  children,
}: {
  num: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-12">
      <h2 className="mb-5 flex items-baseline gap-3 font-serif text-[22px] leading-tight">
        <span className="font-mono text-[11px] tracking-[0.18em] text-accent">
          N° {num}
        </span>
        <span>{title}</span>
      </h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

export function Para({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[15px] leading-[1.75] text-fg-2">{children}</p>
  );
}

export function List({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2 text-[14px] leading-[1.7] text-fg-2">
      {items.map((item) => (
        <li key={item} className="relative pl-5">
          <span className="absolute left-0 top-0 text-accent">—</span>
          {item}
        </li>
      ))}
    </ul>
  );
}
