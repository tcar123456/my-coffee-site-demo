import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listAddresses } from "@/app/actions/address";
import { listWishlist } from "@/app/actions/wishlist";
import { getActiveSubscription } from "@/app/actions/subscription";
import { signOutAction } from "@/app/actions/auth";
import type {
  SubscriptionPlan,
  SubscriptionCadence,
} from "@/generated/prisma/enums";

type OrderStatus = "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED";

const statusLabel: Record<OrderStatus, string> = {
  PENDING: "待付款",
  PAID: "已付款",
  SHIPPED: "已出貨",
  DELIVERED: "已送達",
  CANCELLED: "已取消",
};

const statusPillClasses: Record<OrderStatus, string> = {
  PENDING: "text-warn border-[oklch(45%_0.10_70)] before:bg-warn",
  PAID: "text-accent border-accent-tint before:bg-accent",
  SHIPPED: "text-success border-[oklch(40%_0.06_145)] before:bg-success",
  DELIVERED: "text-muted border-border before:bg-muted",
  CANCELLED: "text-danger border-[oklch(40%_0.10_25)] before:bg-danger",
};

const planLabel: Record<SubscriptionPlan, string> = {
  DUAL_BEANS_BIWEEKLY: "雙週兩支 · 一深一淺",
  SINGLE_BEAN_MONTHLY: "單支精選 · 月配",
};

const cadenceLabel: Record<SubscriptionCadence, string> = {
  BIWEEKLY: "每 14 天",
  MONTHLY: "每月",
};

const dateFormatter = new Intl.DateTimeFormat("zh-TW", {
  month: "2-digit",
  day: "2-digit",
});

const fullDateFormatter = new Intl.DateTimeFormat("zh-TW", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id;
  const [
    addresses,
    wishlistItems,
    activeSubscription,
    recentOrders,
    orderTotalCount,
    subscriptionTotalCount,
    wishlistTotalCount,
    addressTotalCount,
  ] = await Promise.all([
    listAddresses(),
    listWishlist(),
    getActiveSubscription(),
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { items: true },
    }),
    prisma.order.count({ where: { userId } }),
    prisma.subscription.count({ where: { userId } }),
    prisma.wishlistItem.count({ where: { userId } }),
    prisma.address.count({ where: { userId } }),
  ]);

  const { name, email, id, role } = session.user;
  const displayName = name?.trim() || email?.split("@")[0] || "會員";
  const initials = displayName.slice(0, 2).toUpperCase();
  const memberId = `MB-${id.slice(-6).toUpperCase()}`;

  const memberNav: SideNavItem[] = [
    { label: "總覽", num: "→", href: "/account", active: true },
    { label: "訂單", num: pad(orderTotalCount), href: "/account/orders" },
    {
      label: "訂閱配送",
      num: pad(subscriptionTotalCount),
      href: "/account/subscriptions",
    },
    {
      label: "收藏豆款",
      num: pad(wishlistTotalCount),
      href: "/account/wishlist",
    },
    { label: "地址", num: pad(addressTotalCount), href: "/account/addresses" },
    { label: "偏好設定", num: "" },
    { label: "烘焙筆記", num: "" },
  ];

  const accountNav: SideNavItem[] = [
    { label: "個人資料" },
    { label: "付款方式" },
    { label: "密碼" },
  ];

  return (
    <>
      {/* ========== Account header ========== */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-[var(--max)] grid-cols-[auto_1fr_auto] items-center gap-8 px-[var(--gutter)] py-[clamp(40px,5vw,64px)] max-[720px]:grid-cols-[auto_1fr]">
          <div
            className="flex size-20 items-center justify-center rounded-full border border-border-hi font-serif text-[32px] text-accent"
            style={{
              background:
                "linear-gradient(135deg, oklch(35% 0.06 60), oklch(22% 0.03 50))",
            }}
          >
            {initials}
          </div>
          <div>
            <h1 className="font-serif text-[clamp(28px,3.6vw,44px)] leading-none tracking-[-0.01em]">
              早安，{displayName}
            </h1>
            <div className="mt-3 font-mono text-[11px] tracking-[0.14em] uppercase text-muted">
              會員 ID · {memberId} / {email}
              {role === "SELLER" && (
                <Link
                  href="/admin"
                  className="ml-2 inline-flex items-center gap-1 border border-accent-tint px-1.5 py-0.5 text-accent transition-colors hover:border-accent hover:bg-accent-tint"
                >
                  SELLER · 賣家後台 →
                </Link>
              )}
            </div>
          </div>
          <div className="border-l border-border pl-8 text-right max-[720px]:hidden">
            <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted">
              會員等級
            </div>
            <div className="mt-1.5 mb-1 font-serif text-[32px] text-accent">
              TIER 02
            </div>
            <div className="font-mono text-[12px] text-fg-2">
              預計 Phase 7 上線
            </div>
          </div>
        </div>
      </section>

      {/* ========== Account layout ========== */}
      <section className="mx-auto grid max-w-[var(--max)] grid-cols-[220px_1fr] items-start gap-14 px-[var(--gutter)] pt-[clamp(40px,5vw,64px)] pb-[clamp(64px,8vw,112px)] max-[900px]:grid-cols-1 max-[900px]:gap-8">
        {/* Side nav */}
        <aside className="sticky top-20 max-[900px]:static">
          <SideNavTitle>會員 · Member</SideNavTitle>
          {memberNav.map((item) => (
            <SideNavLink key={item.label} {...item} />
          ))}

          <SideNavTitle className="mt-8">帳戶</SideNavTitle>
          {accountNav.map((item) => (
            <SideNavLink key={item.label} {...item} />
          ))}
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full items-center justify-between border-l-2 border-l-transparent py-[11px] pr-3.5 pl-3.5 text-left text-[14px] text-muted transition-all duration-150 hover:text-accent"
            >
              <span>登出 ↗</span>
            </button>
          </form>
        </aside>

        {/* Content */}
        <div className="flex flex-col gap-6">
          {/* Active subscription */}
          {activeSubscription ? (
            <div
              className="relative grid grid-cols-[1fr_auto] items-center gap-8 overflow-hidden border border-accent-tint p-8 max-[720px]:grid-cols-1"
              style={{
                background:
                  "linear-gradient(135deg, var(--surface), oklch(20% 0.02 60))",
              }}
            >
              <div
                className="pointer-events-none absolute -top-10 -right-10 size-[200px]"
                style={{
                  background:
                    "radial-gradient(circle, oklch(45% 0.10 60 / 0.3), transparent 70%)",
                }}
              />
              <div className="relative">
                <div className="mb-3.5 font-mono text-[11px] tracking-[0.18em] uppercase text-accent">
                  進行中 — Active Subscription
                </div>
                <h2 className="mb-3.5 font-serif text-[30px] leading-[1.1]">
                  {planLabel[activeSubscription.plan]}
                </h2>
                <p className="mb-[22px] max-w-[44ch] leading-[1.6] text-fg-2">
                  下次出貨日{" "}
                  <strong className="text-accent">
                    {fullDateFormatter.format(activeSubscription.nextShipAt)}
                  </strong>
                  。每期由主理人選兩支當令豆款配送。
                </p>
                <div className="flex flex-wrap gap-7 font-mono text-[11px] tracking-[0.04em] text-muted">
                  <SubMeta
                    value={`NT$ ${activeSubscription.pricePerShipment.toLocaleString("zh-TW")}`}
                    tail={cadenceLabel[activeSubscription.cadence]}
                  />
                  <SubMeta
                    value={`已配送 ${pad(activeSubscription.shipmentsDelivered)} 期`}
                    tail={`共續訂 ${pad(activeSubscription.totalShipments)} 期`}
                  />
                </div>
              </div>
              <div className="relative z-[2] flex flex-col gap-2.5">
                <Button href="/account/subscriptions" variant="primary">
                  管理訂閱 →
                </Button>
              </div>
            </div>
          ) : (
            <div className="border border-border bg-surface p-8 text-center">
              <p className="font-serif text-[20px] leading-[1.4] text-fg-2">
                尚未訂閱任何方案
              </p>
              <div className="mt-4 flex justify-center">
                <Button href="/account/subscriptions" variant="ghost">
                  了解訂閱配送 →
                </Button>
              </div>
            </div>
          )}

          {/* Recent orders */}
          <Panel
            title="最近訂單"
            action={
              orderTotalCount > 0
                ? {
                    href: "/account/orders",
                    label: `全部 ${pad(orderTotalCount)} 筆 →`,
                  }
                : undefined
            }
          >
            {recentOrders.length === 0 ? (
              <div className="py-6 text-center font-mono text-[12px] text-muted">
                尚無訂單記錄。
              </div>
            ) : (
              recentOrders.map((order) => {
                const summary = order.items
                  .slice(0, 2)
                  .map((i) => `${i.productName} × ${i.qty}`)
                  .join(" · ");
                const more =
                  order.items.length > 2 ? ` · 等 ${order.items.length} 項` : "";
                const status = order.status as OrderStatus;
                return (
                  <Link
                    key={order.id}
                    href={`/account/orders/${order.orderNumber}`}
                    className="grid grid-cols-[80px_1fr_auto_auto] items-center gap-[18px] border-b border-border py-[18px] transition-colors duration-150 last:border-b-0 hover:bg-surface-2 max-[700px]:grid-cols-[1fr_auto]"
                  >
                    <div className="max-[700px]:col-start-1">
                      <div className="font-mono text-[11px] tracking-[0.08em] text-accent">
                        #{order.orderNumber.split("-").slice(-1)[0]}
                      </div>
                      <div className="mt-1 font-mono text-[11px] text-muted">
                        {dateFormatter.format(order.createdAt)}
                      </div>
                    </div>
                    <div className="text-[14px] text-fg max-[700px]:col-span-full">
                      {order.items.length} 件商品
                      <div className="mt-1 truncate text-[12px] text-muted">
                        {summary}
                        {more}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 border px-2.5 py-[5px] font-mono text-[10px] tracking-[0.16em] uppercase before:size-1.5 before:rounded-full ${statusPillClasses[status]}`}
                    >
                      {statusLabel[status]}
                    </span>
                    <div className="min-w-[100px] text-right font-serif text-[18px] tabular-nums">
                      <small className="mr-1 font-mono text-[11px] text-muted">
                        NT$
                      </small>
                      {order.total.toLocaleString("zh-TW")}
                    </div>
                  </Link>
                );
              })
            )}
          </Panel>

          {/* Two-col split: addresses + wishlist */}
          <div className="grid grid-cols-[1.2fr_1fr] gap-6 max-[900px]:grid-cols-1">
            <Panel
              title="常用地址"
              action={{ href: "/account/addresses", label: "+ 管理" }}
            >
              {addresses.length === 0 ? (
                <div className="py-6 text-center font-mono text-[12px] text-muted">
                  尚未新增地址。
                  <Link
                    href="/account/addresses"
                    className="ml-2 text-accent hover:underline"
                  >
                    新增 →
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 max-[580px]:grid-cols-1">
                  {addresses.slice(0, 2).map((a) => (
                    <Link
                      key={a.id}
                      href="/account/addresses"
                      className={`flex flex-col gap-1.5 border p-[22px] transition-colors duration-150 ${
                        a.isDefault
                          ? "border-accent-tint bg-surface-2"
                          : "border-border hover:border-accent-tint"
                      }`}
                    >
                      <div className="mb-1.5 font-mono text-[10px] tracking-[0.16em] uppercase text-accent">
                        {a.isDefault ? "預設" : "其他"}
                      </div>
                      <div className="font-serif text-[18px]">{a.recipient}</div>
                      <div className="text-[13px] text-fg-2">
                        <span className="block">
                          {a.zipCode} {a.city} {a.district}
                        </span>
                        <span className="block">{a.street}</span>
                      </div>
                      <div className="mt-2 font-mono text-[12px] text-muted">
                        {a.phone}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Panel>

            <Panel
              title="收藏豆款"
              action={
                wishlistTotalCount > 0
                  ? {
                      href: "/account/wishlist",
                      label: `${pad(wishlistTotalCount)} →`,
                    }
                  : { href: "/account/wishlist", label: "0 →" }
              }
            >
              {wishlistItems.length === 0 ? (
                <div className="py-6 text-center font-mono text-[12px] text-muted">
                  尚未收藏豆款。
                </div>
              ) : (
                wishlistItems.slice(0, 4).map((item, idx) => {
                  const variantClass = item.product.coverVariant
                    ? `bean-cover--alt-${item.product.coverVariant}`
                    : "";
                  const numLabel = (idx + 1).toString().padStart(2, "0");
                  const originLabel = item.product.origin.split(" · ")[0];
                  return (
                    <Link
                      key={item.id}
                      href={`/products/${item.product.slug}`}
                      className="grid grid-cols-[56px_1fr_auto] items-center gap-4 border-b border-border py-3.5 last:border-b-0 hover:bg-surface-2"
                    >
                      <div
                        className={`bean-cover ${variantClass} aspect-square border border-border`}
                      />
                      <div>
                        <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-muted">
                          N° {numLabel} · {originLabel}
                        </div>
                        <div className="font-serif text-[15px]">
                          {item.product.name}
                        </div>
                      </div>
                      <div className="font-mono text-[13px] text-accent">
                        NT$ {item.product.price.toLocaleString("zh-TW")}
                      </div>
                    </Link>
                  );
                })
              )}
            </Panel>
          </div>
        </div>
      </section>
    </>
  );
}

/* ============ inline helpers ============ */

type SideNavItem = {
  label: string;
  num?: string;
  href?: string;
  active?: boolean;
};

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function SideNavTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mb-3.5 border-b border-border pb-3.5 font-mono text-[11px] tracking-[0.18em] uppercase text-accent ${className}`}
    >
      {children}
    </div>
  );
}

function SideNavLink({ label, num, href, active }: SideNavItem) {
  const className = `flex items-center justify-between border-l-2 py-[11px] pr-3.5 pl-3.5 text-[14px] transition-all duration-150 ${
    active
      ? "border-l-accent bg-surface text-fg"
      : "border-l-transparent text-fg-2 hover:text-accent"
  }`;
  const content = (
    <>
      <span>{label}</span>
      {num !== undefined && (
        <span className="font-mono text-[11px] text-muted">{num}</span>
      )}
    </>
  );
  if (!href) {
    return (
      <span
        className={`${className} cursor-not-allowed text-dim`}
        title="預計於後續 phase 上線"
      >
        {content}
      </span>
    );
  }
  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

function SubMeta({ value, tail }: { value: string; tail?: string }) {
  return (
    <span>
      <strong className="mb-1 block font-serif text-[18px] font-normal text-accent">
        {value}
      </strong>
      {tail}
    </span>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-7 py-[22px]">
        <h3 className="font-serif text-[22px]">{title}</h3>
        {action && (
          <Link
            href={action.href}
            className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted hover:text-accent"
          >
            {action.label}
          </Link>
        )}
      </div>
      <div className="p-7">{children}</div>
    </div>
  );
}
