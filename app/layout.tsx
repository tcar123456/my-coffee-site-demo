import type { Metadata } from "next";
import "./globals.css";

// Phase 9b — SEO root metadata
// metadataBase 從 APP_URL（與金流/物流 callback 共用），無設時 localhost dev fallback。
// title 用 template，let page-level metadata 接續：「商品名 | 暮焙 MUBEI」這樣的尾巴。

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "暮焙 MUBEI — 精品單一產地咖啡",
    template: "%s | 暮焙 MUBEI",
  },
  description:
    "暮焙 MUBEI：精選單一產地咖啡豆，從產地到杯中的編年敘事。台中市烘焙、隔日出貨、每週一新批次。",
  keywords: [
    "精品咖啡",
    "單一產地",
    "手沖咖啡",
    "暮焙",
    "MUBEI",
    "咖啡豆",
    "台中烘豆",
  ],
  authors: [{ name: "暮焙 MUBEI" }],
  creator: "暮焙 MUBEI",
  publisher: "暮焙 MUBEI Coffee Roasters Ltd.",
  openGraph: {
    type: "website",
    locale: "zh_TW",
    url: APP_URL,
    siteName: "暮焙 MUBEI",
    title: "暮焙 MUBEI — 精品單一產地咖啡",
    description:
      "精選單一產地咖啡豆，從產地到杯中的編年敘事。台中市烘焙、隔日出貨、每週一新批次。",
  },
  twitter: {
    card: "summary_large_image",
    title: "暮焙 MUBEI — 精品單一產地咖啡",
    description: "精選單一產地咖啡豆，從產地到杯中的編年敘事。",
  },
  icons: {
    icon: "/favicon.ico",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700&family=Noto+Serif+TC:wght@400;500;600&display=swap"
        />
      </head>
      <body className="flex min-h-screen flex-col bg-bg text-fg">
        <a href="#main-content" className="skip-link">
          跳到主要內容 ↓
        </a>
        {children}
      </body>
    </html>
  );
}
