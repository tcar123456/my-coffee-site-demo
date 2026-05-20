"use server";

// Phase 5a — 賣家後台訂單管理 server actions
// requireSeller：所有 action 入口先擋 role；proxy.ts 雖然已 gate /admin/*，
// 但 server action 也可能被別處（form、client fetch）呼叫，自己 gate 一遍才安全。
// updateOrderStatus：在 transaction 內驗證狀態合法 + 改 status + 該回補就回補。

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { OrderStatus } from "@/generated/prisma/enums";
import {
  isAllowedTransition,
  shouldRestoreStockOnCancel,
} from "@/lib/order-state";
import { applyPaidEffects } from "@/lib/order-paid-effects";

const PAGE_SIZE = 20;
const SHIPPABLE_STATUSES: OrderStatus[] = ["PAID", "SHIPPED", "DELIVERED"];

export type AdminActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function requireSeller(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");
  if (session.user.role !== "SELLER") throw new Error("FORBIDDEN");
  return session.user.id;
}

function revalidateOrderViews(orderNumber?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  if (orderNumber) {
    revalidatePath(`/admin/orders/${orderNumber}`);
    revalidatePath(`/account/orders/${orderNumber}`);
  }
  revalidatePath("/account/orders");
  revalidatePath("/account");
}

export type AdminOrderListItem = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: number;
  createdAt: Date;
  recipientName: string;
  shippingCity: string;
  customerEmail: string;
  customerName: string | null;
  itemCount: number;
};

export type AdminOrderListResult = {
  rows: AdminOrderListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function listOrdersForAdmin(params: {
  status?: OrderStatus | "ALL";
  q?: string;
  page?: number;
}): Promise<AdminOrderListResult> {
  await requireSeller();
  const page = Math.max(1, params.page ?? 1);
  const where: Prisma.OrderWhereInput = {};
  if (params.status && params.status !== "ALL") {
    where.status = params.status;
  }
  const q = params.q?.trim();
  if (q) {
    where.OR = [
      { orderNumber: { contains: q, mode: "insensitive" } },
      { recipientName: { contains: q, mode: "insensitive" } },
      { user: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        createdAt: true,
        recipientName: true,
        shippingCity: true,
        user: { select: { email: true, name: true } },
        _count: { select: { items: true } },
      },
    }),
  ]);

  return {
    rows: rows.map((r) => ({
      id: r.id,
      orderNumber: r.orderNumber,
      status: r.status,
      total: r.total,
      createdAt: r.createdAt,
      recipientName: r.recipientName,
      shippingCity: r.shippingCity,
      customerEmail: r.user.email,
      customerName: r.user.name,
      itemCount: r._count.items,
    })),
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getOrderForAdmin(orderNumber: string) {
  await requireSeller();
  return prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: true,
      user: { select: { id: true, email: true, name: true } },
    },
  });
}

export async function updateOrderStatus(
  orderNumber: string,
  nextStatus: OrderStatus,
): Promise<AdminActionResult> {
  try {
    await requireSeller();
  } catch {
    return { ok: false, error: "權限不足。" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { orderNumber },
        select: {
          id: true,
          status: true,
          userId: true,
          total: true,
          items: { select: { productId: true, qty: true } },
        },
      });
      if (!order) throw new Error("NOT_FOUND");

      const prevStatus = order.status as OrderStatus;
      if (!isAllowedTransition(prevStatus, nextStatus)) {
        throw new Error(`ILLEGAL:${prevStatus}->${nextStatus}`);
      }

      const now = new Date();
      const data: Prisma.OrderUpdateInput = { status: nextStatus };
      if (nextStatus === "PAID") data.paidAt = now;
      if (nextStatus === "SHIPPED") data.shippedAt = now;
      if (nextStatus === "DELIVERED") data.deliveredAt = now;
      if (nextStatus === "CANCELLED") data.cancelledAt = now;

      await tx.order.update({ where: { id: order.id }, data });

      // 取消時若該回補庫存：把每個 OrderItem.qty 加回 Product.stock
      if (nextStatus === "CANCELLED" && shouldRestoreStockOnCancel(prevStatus)) {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.qty } },
          });
        }
      }

      // Phase 7b — 進到 PAID 時更新 user.lifetimeSpent + 重算 tier
      // 限定 prevStatus !== PAID 才呼叫（避免 PAID→SHIPPED→DELIVERED 多次累計）
      if (nextStatus === "PAID" && prevStatus !== "PAID") {
        await applyPaidEffects(tx, {
          userId: order.userId,
          orderTotal: order.total,
        });
      }
    });

    revalidateOrderViews(orderNumber);
    // 取消回補的話前台庫存會變，順手 revalidate
    if (nextStatus === "CANCELLED") {
      revalidatePath("/products");
      revalidatePath("/", "layout");
    }
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "NOT_FOUND") return { ok: false, error: "找不到此訂單。" };
    if (msg.startsWith("ILLEGAL:")) {
      return { ok: false, error: "目前狀態不允許這個轉移。" };
    }
    return { ok: false, error: "更新狀態時發生錯誤。" };
  }
}

/**
 * Phase 6d — 手動確認收款（限 BANK_TRANSFER / COD）
 * CREDIT_CARD / LINE_PAY 走 gateway callback，不能手動操作（避免繞過驗章直接 PAID）。
 * 規則：訂單必須是 PENDING + paymentMethod 為 BANK_TRANSFER / COD，才允許後台手動 PAID。
 */
export async function confirmManualPayment(
  orderNumber: string,
): Promise<AdminActionResult> {
  try {
    await requireSeller();
  } catch {
    return { ok: false, error: "權限不足。" };
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: { id: true, status: true, paymentMethod: true, userId: true, total: true },
  });
  if (!order) return { ok: false, error: "找不到此訂單。" };
  if (order.status !== "PENDING") {
    return { ok: false, error: "此訂單已不是待付款狀態。" };
  }
  if (order.paymentMethod !== "BANK_TRANSFER" && order.paymentMethod !== "COD") {
    return { ok: false, error: "此付款方式應由金流 callback 自動更新，不可手動確認。" };
  }

  // Phase 7b — order.status update + lifetimeSpent/tier 重算同 transaction
  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        paymentTradeNo: `MANUAL-${order.paymentMethod}`,
      },
    });
    await applyPaidEffects(tx, {
      userId: order.userId,
      orderTotal: order.total,
    });
  });
  revalidateOrderViews(orderNumber);
  return { ok: true };
}

/**
 * 後台 KPI / 總覽用聚合查詢。
 * 7 日營收：只算 PAID / SHIPPED / DELIVERED（已扣款）的 order.total。
 */
export async function getAdminOverview() {
  await requireSeller();
  const now = new Date();
  const last7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [
    revenueLast7,
    revenuePrev7,
    orderCountLast7,
    orderCountPrev7,
    pendingShipmentCount,
    activeSubscriptionCount,
    recentOrders,
    lowStockProducts,
  ] = await Promise.all([
    prisma.order.aggregate({
      _sum: { total: true },
      where: {
        status: { in: SHIPPABLE_STATUSES },
        createdAt: { gte: last7 },
      },
    }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: {
        status: { in: SHIPPABLE_STATUSES },
        createdAt: { gte: last14, lt: last7 },
      },
    }),
    prisma.order.count({ where: { createdAt: { gte: last7 } } }),
    prisma.order.count({
      where: { createdAt: { gte: last14, lt: last7 } },
    }),
    prisma.order.count({ where: { status: "PAID" } }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        createdAt: true,
        recipientName: true,
        shippingCity: true,
      },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { stock: "asc" },
      take: 4,
      select: { id: true, name: true, slug: true, stock: true },
    }),
  ]);

  return {
    revenue: {
      last7: revenueLast7._sum.total ?? 0,
      prev7: revenuePrev7._sum.total ?? 0,
    },
    orderCount: {
      last7: orderCountLast7,
      prev7: orderCountPrev7,
    },
    pendingShipmentCount,
    activeSubscriptionCount,
    recentOrders,
    lowStockProducts,
  };
}
