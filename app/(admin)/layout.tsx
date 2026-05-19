// Phase 5a — 後台 layout：proxy.ts 已 gate /admin/* 給 SELLER，這層只負責 chrome。
// side rail 數字用真實 count 撈一次傳給 client component，避免每個子頁重複查詢。
//
// force-dynamic：admin 頁面全部要 runtime auth + DB；
// /account/* 靠 redirect("/login") 自動觸發 dynamic，admin 則靠 proxy.ts 擋未登入，
// 不會走 redirect 路徑，所以這裡顯式宣告，避免 Next.js 嘗試 prerender 時撞 DB。
export const dynamic = "force-dynamic";

import { AdminMasthead } from "@/components/AdminMasthead";
import {
  AdminSideRail,
  type AdminRailGroup,
} from "@/components/AdminSideRail";
import { prisma } from "@/lib/prisma";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [
    orderTotalCount,
    activeSubscriptionCount,
    customerCount,
    productActiveCount,
    lowStockCount,
    activePromoCount,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.count({ where: { isActive: true, stock: { lt: 20 } } }),
    prisma.promoCode.count({ where: { isActive: true } }),
  ]);

  const pad = (n: number) => n.toString().padStart(2, "0");

  const groups: AdminRailGroup[] = [
    {
      title: "營運",
      items: [
        { label: "總覽", href: "/admin", match: "exact" },
        {
          label: "訂單",
          num: pad(orderTotalCount),
          href: "/admin/orders",
          match: "prefix",
        },
        { label: "報表", href: "/admin/reports", match: "prefix" },
        { label: "訂閱", num: pad(activeSubscriptionCount) },
        { label: "顧客", num: pad(customerCount) },
      ],
    },
    {
      title: "商品",
      items: [
        {
          label: "單品咖啡",
          num: pad(productActiveCount),
          href: "/admin/products",
          match: "prefix",
        },
        { label: "禮盒" },
        { label: "器具" },
        {
          label: "庫存",
          num: pad(lowStockCount),
          href: "/admin/stock",
          match: "prefix",
        },
      ],
    },
    {
      title: "內容 / 行銷",
      items: [
        { label: "文章" },
        {
          label: "優惠碼",
          num: pad(activePromoCount),
          href: "/admin/promo",
          match: "prefix",
        },
        { label: "橫幅" },
        { label: "EDM" },
      ],
    },
    {
      title: "系統",
      items: [{ label: "設定" }, { label: "整合" }, { label: "API 金鑰" }],
    },
  ];

  return (
    <>
      <AdminMasthead />
      <div className="grid min-h-[calc(100vh-60px)] grid-cols-[220px_1fr] max-[900px]:grid-cols-1">
        <AdminSideRail groups={groups} />
        <main>{children}</main>
      </div>
    </>
  );
}
