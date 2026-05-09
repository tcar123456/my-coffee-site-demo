const footerColumns = [
  {
    title: "商品",
    links: ["單品咖啡", "禮盒", "訂閱方案", "器具周邊"],
  },
  {
    title: "關於",
    links: ["品牌故事", "烘焙日誌", "產地夥伴", "媒體報導"],
  },
  {
    title: "客服",
    links: ["配送說明", "退換貨政策", "聯絡我們", "常見問題"],
  },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-bg">
      <div className="mx-auto grid max-w-[var(--max)] grid-cols-[2fr_1fr_1fr_1fr] gap-12 px-[var(--gutter)] pt-[clamp(48px,6vw,80px)] pb-8 max-md:grid-cols-2 max-md:[&>:first-child]:col-span-full">
        <div>
          <span className="font-serif text-[28px] tracking-[0.04em]">暮焙</span>
          <span className="ml-3 font-mono text-[10px] tracking-[0.32em] text-muted">
            MUBEI
          </span>
          <p className="mt-3.5 max-w-[28ch] text-[13px] leading-[1.55] text-muted">
            精品單一產地咖啡 · 台中市烘焙 · 隔日出貨 · 每週一新批次
          </p>
        </div>

        {footerColumns.map((col) => (
          <div key={col.title}>
            <h4 className="mb-4 font-mono text-[11px] tracking-[0.16em] text-accent uppercase">
              {col.title}
            </h4>
            {col.links.map((link) => (
              <a
                key={link}
                href="#"
                className="block py-1 text-[13px] text-fg-2 hover:text-accent"
              >
                {link}
              </a>
            ))}
          </div>
        ))}
      </div>

      <div className="mx-auto flex max-w-[var(--max)] justify-between border-t border-border px-[var(--gutter)] py-[22px] font-mono text-[11px] tracking-[0.1em] text-dim max-md:flex-col max-md:gap-2">
        <span>© 2026 MUBEI Coffee Roasters Ltd.</span>
        <span>台中市 西區 民權路 47 號 — 04 2222 8888</span>
      </div>
    </footer>
  );
}
