// Phase 9a — Footer
// 4 column 商品/關於/客服/法規 + LINE Add Friend block。
// 內部已實作路由用 next/link；未實作用 # placeholder（mockup）標記。
// LINE 加好友：佔位 SVG QR Code + 連結到 line.me/R/ti/p/@xxxx（作品集情境用 placeholder ID）。

import Link from "next/link";

type FooterLink = { label: string; href: string };

const COLUMNS: Array<{ title: string; links: FooterLink[] }> = [
  {
    title: "商品",
    links: [
      { label: "單品咖啡", href: "/products" },
      { label: "禮盒", href: "#" },
      { label: "訂閱方案", href: "/account/subscriptions" },
      { label: "器具周邊", href: "#" },
    ],
  },
  {
    title: "關於",
    links: [
      { label: "品牌故事", href: "/brand" },
      { label: "烘焙日誌", href: "#" },
      { label: "產地夥伴", href: "#" },
      { label: "媒體報導", href: "#" },
    ],
  },
  {
    title: "客服",
    links: [
      { label: "配送說明", href: "#" },
      { label: "常見問題", href: "#" },
      { label: "聯絡我們（LINE）", href: "https://line.me/R/ti/p/@mubei-demo" },
    ],
  },
  {
    title: "法規",
    links: [
      { label: "隱私權政策", href: "/policy/privacy" },
      { label: "退換貨政策", href: "/policy/refund" },
      { label: "7 日鑑賞期", href: "/policy/seven-day-right" },
    ],
  },
];

// 佔位 QR Code（純 SVG，5×5 矩陣的 demo 風格圖樣；非真實掃碼）
function PlaceholderQrCode() {
  // 25×25 cells；隨機但 deterministic 的圖樣
  const PATTERN = [
    "1111111001010101001111111",
    "1000001011001110101000001",
    "1011101010110100101011101",
    "1011101001011001001011101",
    "1011101011001110101011101",
    "1000001001110001001000001",
    "1111111010101010101111111",
    "0000000011011001000000000",
    "1010110110010110110101100",
    "0110011001101001011011010",
    "1101101010110010001100110",
    "0011000101001110110010101",
    "1100110011010101011001010",
    "0101011010011010110011001",
    "1010100110110001010110110",
    "0011011001011011001001001",
    "1100110110010100110110110",
    "0000000010101011001011001",
    "1111111001110010111010101",
    "1000001011010110100011001",
    "1011101010001011111011010",
    "1011101001110110001010101",
    "1011101011011001110110011",
    "1000001000110101010001100",
    "1111111011001011001110101",
  ];
  return (
    <svg
      viewBox="0 0 25 25"
      width="96"
      height="96"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className="bg-white"
    >
      {PATTERN.flatMap((row, y) =>
        row.split("").map((c, x) =>
          c === "1" ? (
            <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#1a1a1a" />
          ) : null,
        ),
      )}
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-bg">
      <div className="mx-auto grid max-w-[var(--max)] grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-10 px-[var(--gutter)] pt-[clamp(48px,6vw,80px)] pb-8 max-lg:grid-cols-[2fr_1fr_1fr] max-md:grid-cols-2 max-md:[&>:first-child]:col-span-full">
        <div>
          <span className="font-serif text-[28px] tracking-[0.04em]">暮焙</span>
          <span className="ml-3 font-mono text-[10px] tracking-[0.32em] text-muted">
            MUBEI
          </span>
          <p className="mt-3.5 max-w-[28ch] text-[13px] leading-[1.55] text-muted">
            精品單一產地咖啡 · 台中市烘焙 · 隔日出貨 · 每週一新批次
          </p>

          {/* LINE Add Friend block */}
          <div className="mt-7 flex items-start gap-4 border border-border bg-surface p-4 max-w-[300px]">
            <PlaceholderQrCode />
            <div className="flex-1">
              <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-accent">
                LINE 官方帳號
              </div>
              <div className="mt-1.5 text-[15px] leading-tight">
                掃碼或點擊加好友
              </div>
              <a
                href="https://line.me/R/ti/p/@mubei-demo"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 border border-accent bg-accent px-3 py-1.5 font-mono text-[10px] font-semibold tracking-[0.14em] text-bg uppercase transition-colors hover:bg-accent-hi"
                aria-label="加入暮焙 LINE 官方帳號"
              >
                Add Friend →
              </a>
            </div>
          </div>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h4 className="mb-4 font-mono text-[11px] tracking-[0.16em] text-accent uppercase">
              {col.title}
            </h4>
            {col.links.map((link) => {
              const isExternal = link.href.startsWith("http");
              return isExternal ? (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block py-1 text-[13px] text-fg-2 hover:text-accent"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.label}
                  href={link.href}
                  className="block py-1 text-[13px] text-fg-2 hover:text-accent"
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mx-auto flex max-w-[var(--max)] justify-between border-t border-border px-[var(--gutter)] py-[22px] font-mono text-[11px] tracking-[0.1em] text-dim max-md:flex-col max-md:gap-2">
        <span>© 2026 MUBEI Coffee Roasters Ltd. · 作品集示範站</span>
        <span>台中市 西區 民權路 47 號 — 04 2222 8888</span>
      </div>
    </footer>
  );
}
