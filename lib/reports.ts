// Phase 5d — 後台報表聚合
// 「已扣款」訂單只算 status ∈ PAID / SHIPPED / DELIVERED（與 admin-orders.ts getAdminOverview 一致）。
// 用 Prisma findMany 撈 createdAt + total 後在記憶體 group by 日期 —— 8 筆 seed 商品 + 個位數訂單量級下夠用。
// 真實流量大時改成 raw SQL `date_trunc('day', created_at)` 比較有效率，留 Phase 10 部署優化再說。

import { prisma as defaultPrisma } from "@/lib/prisma";
import type { PrismaClient } from "@/generated/prisma/client";
import type { OrderStatus } from "@/generated/prisma/enums";

const PAID_STATUSES: OrderStatus[] = ["PAID", "SHIPPED", "DELIVERED"];

export type RevenuePoint = {
  /** YYYY-MM-DD（local date 字串，給 chart x 軸 + tooltip 用） */
  date: string;
  /** 該日已扣款訂單 total 加總 */
  revenue: number;
  /** 該日已扣款訂單筆數 */
  orderCount: number;
};

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * 撈過去 rangeDays 天的每日營收與訂單數。
 * 缺失日期補 0（chart 連線不能有 gap）。
 * 起始日 = 今天往前數 (rangeDays - 1) 天，含今天共 rangeDays 個 bucket。
 */
export async function getRevenueTrend(
  rangeDays: number,
  client: PrismaClient = defaultPrisma,
): Promise<RevenuePoint[]> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(today);
  start.setDate(start.getDate() - (rangeDays - 1));

  const orders = await client.order.findMany({
    where: {
      status: { in: PAID_STATUSES },
      createdAt: { gte: start },
    },
    select: { createdAt: true, total: true },
  });

  // bucket by local date key
  const bucket = new Map<string, { revenue: number; orderCount: number }>();
  for (let i = 0; i < rangeDays; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    bucket.set(localDateKey(d), { revenue: 0, orderCount: 0 });
  }
  for (const o of orders) {
    const key = localDateKey(o.createdAt);
    const slot = bucket.get(key);
    if (slot) {
      slot.revenue += o.total;
      slot.orderCount += 1;
    }
  }

  return Array.from(bucket.entries()).map(([date, v]) => ({
    date,
    revenue: v.revenue,
    orderCount: v.orderCount,
  }));
}

export type RevenueSummary = {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  peakDay: { date: string; revenue: number } | null;
};

export function summarizeRevenue(points: RevenuePoint[]): RevenueSummary {
  const totalRevenue = points.reduce((sum, p) => sum + p.revenue, 0);
  const totalOrders = points.reduce((sum, p) => sum + p.orderCount, 0);
  const peakDay = points.reduce<RevenuePoint | null>(
    (best, p) => (best === null || p.revenue > best.revenue ? p : best),
    null,
  );
  return {
    totalRevenue,
    totalOrders,
    avgOrderValue: totalOrders === 0 ? 0 : Math.round(totalRevenue / totalOrders),
    peakDay: peakDay && peakDay.revenue > 0
      ? { date: peakDay.date, revenue: peakDay.revenue }
      : null,
  };
}
