import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "暮焙 MUBEI — 精品單一產地咖啡",
  description: "暮焙 MUBEI：精選單一產地咖啡豆，從產地到杯中的編年敘事。",
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
      <body className="flex min-h-screen flex-col bg-bg text-fg">{children}</body>
    </html>
  );
}
