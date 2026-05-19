// Phase 5a — 出貨單列印 layout
//
// 為什麼放在 (admin-print) 而不是 (admin)：
//   要跳脫 app/(admin)/layout.tsx 的 AdminMasthead + AdminSideRail（列印時不需要）。
//   Next.js 16 route group 不影響 URL，所以最終 URL 仍是 /admin/orders/[orderNumber]/print，
//   proxy.ts 的 /admin/:path* matcher 也能 cover 到。
//
// 為什麼沒有 <html>/<body>：
//   專案的 root layout 已經在 app/layout.tsx，那裡渲染 <html>/<body> 並 link Google Fonts CSS。
//   既有 root layout 的情況下，本檔只能是 nested layout —— 重複放 <html>/<body> 會產生
//   nested html，React 會炸。改寫 body className 也辦不到（next.js root layout 已決定）。
//   解法：純 wrapper，靠 sibling route group 就足以跳脫 (admin)/layout.tsx 的 chrome。
//
// 不引 globals.css —— app/layout.tsx 已 import 過、Tailwind 全站套用。
//
// force-dynamic：列印頁需要 auth + DB，與 (admin) 子樹相同的理由不能 prerender。
export const dynamic = "force-dynamic";

export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 蓋掉父層 body 的 bg-bg / text-fg；min-h-screen 保證列印時不會留底色
  return (
    <div className="min-h-screen bg-white text-black [color-scheme:light]">
      {children}
    </div>
  );
}
