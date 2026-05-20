import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type OrderStatus = "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED";

type OrderListItem = {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: Date;
  items: Array<{
    id: string;
    qty: number;
    productName: string;
  }>;
};

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

const dateFormatter = new Intl.DateTimeFormat("zh-TW", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <>
      {/* ========== Header ========== */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-[var(--max)] px-[var(--gutter)] py-[clamp(40px,5vw,64px)]">
          <div className="mb-3 font-mono text-[11px] tracking-[0.18em] uppercase text-accent">
            <Link href="/account" className="text-muted hover:text-accent">
              ← 會員中心
            </Link>
            <span className="mx-3 text-border">/</span>
            訂單記錄
          </div>
          <h1 className="text-[clamp(28px,3.6vw,44px)] leading-none tracking-[-0.01em]">
            訂單記錄
          </h1>
          <div className="mt-3 font-mono text-[11px] tracking-[0.14em] uppercase text-muted">
            共 {orders.length.toString().padStart(2, "0")} 筆訂單
          </div>
        </div>
      </section>

      {/* ========== Body ========== */}
      <section className="mx-auto max-w-[var(--max)] px-[var(--gutter)] pt-[clamp(32px,4vw,56px)] pb-[clamp(64px,8vw,112px)]">
        {orders.length === 0 ? (
          <EmptyOrders />
        ) : (
          <Panel title="全部訂單">
            {(orders as OrderListItem[]).map((order) => {
              const itemCount = order.items.reduce(
                (s: number, i) => s + i.qty,
                0,
              );
              const summary = order.items
                .slice(0, 3)
                .map((i) => `${i.productName} × ${i.qty}`)
                .join(" · ");
              const more =
                order.items.length > 3
                  ? ` · 等 ${order.items.length} 項`
                  : "";

              return (
                <Link
                  key={order.id}
                  href={`/account/orders/${order.orderNumber}`}
                  className="grid grid-cols-[120px_1fr_auto_auto] items-center gap-[18px] border-b border-border py-[18px] transition-colors duration-150 last:border-b-0 hover:bg-surface-2 max-[700px]:grid-cols-[1fr_auto] max-[700px]:gap-3"
                >
                  <div className="max-[700px]:col-start-1">
                    <div className="font-mono text-[11px] tracking-[0.08em] text-accent">
                      #{order.orderNumber}
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-muted">
                      {dateFormatter.format(order.createdAt)}
                    </div>
                  </div>
                  <div className="text-[14px] text-fg max-[700px]:col-span-full max-[700px]:order-3">
                    <div>{itemCount} 件商品</div>
                    <div className="mt-1 truncate text-[12px] text-muted">
                      {summary}
                      {more}
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 border px-2.5 py-[5px] font-mono text-[10px] tracking-[0.16em] uppercase before:size-1.5 before:rounded-full ${statusPillClasses[order.status as OrderStatus]}`}
                  >
                    {statusLabel[order.status as OrderStatus]}
                  </span>
                  <div className="min-w-[110px] text-right font-serif text-[18px] tabular-nums">
                    <small className="mr-1 font-mono text-[11px] text-muted">
                      NT$
                    </small>
                    {order.total.toLocaleString("zh-TW")}
                  </div>
                </Link>
              );
            })}
          </Panel>
        )}
      </section>
    </>
  );
}

function EmptyOrders() {
  return (
    <div className="border border-border bg-surface px-[var(--gutter)] py-[clamp(64px,8vw,112px)] text-center">
      <p className="text-[24px] leading-[1.4] text-fg-2">
        尚無訂單
      </p>
      <p className="mt-3 font-mono text-[12px] tracking-[0.08em] text-muted">
        從本季單品挑選你的第一支豆。
      </p>
      <div className="mt-8 flex justify-center">
        <Button href="/products" variant="primary">
          前往單品咖啡 →
        </Button>
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-7 py-[22px]">
        <h3 className="text-[22px]">{title}</h3>
      </div>
      <div className="px-7 py-2">{children}</div>
    </div>
  );
}
