"use server";

// Phase 4 — Subscription 假流程 server actions
// 不接金流、不真出貨；status 只在 ACTIVE/PAUSED/CANCELLED 三態切換。

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  SubscriptionPlan,
  SubscriptionCadence,
} from "@/generated/prisma/enums";

export type SubscriptionActionResult =
  | { ok: true }
  | { ok: false; error: string };

// 訂閱方案預設值 — 給 subscribeToPlan / reactivateSubscription 共用。
// 不上金流，所以這裡是 mockup 資料；改動只影響新建訂閱的初始值。
const PLAN_DEFAULTS: Record<
  SubscriptionPlan,
  {
    cadence: SubscriptionCadence;
    pricePerShipment: number;
    totalShipments: number;
    daysUntilNext: number;
  }
> = {
  DUAL_BEANS_BIWEEKLY: {
    cadence: SubscriptionCadence.BIWEEKLY,
    pricePerShipment: 1180,
    totalShipments: 12,
    daysUntilNext: 14,
  },
  SINGLE_BEAN_MONTHLY: {
    cadence: SubscriptionCadence.MONTHLY,
    pricePerShipment: 580,
    totalShipments: 6,
    daysUntilNext: 30,
  },
};

function isSubscriptionPlan(value: unknown): value is SubscriptionPlan {
  return (
    typeof value === "string" &&
    (Object.values(SubscriptionPlan) as string[]).includes(value)
  );
}

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");
  return session.user.id;
}

function revalidateAll() {
  revalidatePath("/account");
  revalidatePath("/account/subscriptions");
}

export async function listSubscriptions() {
  const userId = await requireUserId();
  const rows = await prisma.subscription.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  const order = { ACTIVE: 0, PAUSED: 1, CANCELLED: 2 } as const;
  return rows.sort((a, b) => order[a.status] - order[b.status]);
}

export async function getActiveSubscription() {
  const userId = await requireUserId();
  return prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
}

async function ownedSubscription(id: string, userId: string) {
  const sub = await prisma.subscription.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true },
  });
  if (!sub || sub.userId !== userId) return null;
  return sub;
}

export async function pauseSubscription(id: string): Promise<SubscriptionActionResult> {
  const userId = await requireUserId();
  const sub = await ownedSubscription(id, userId);
  if (!sub) return { ok: false, error: "找不到此訂閱方案。" };
  if (sub.status !== "ACTIVE") return { ok: false, error: "僅限進行中的方案可暫停。" };

  await prisma.subscription.update({
    where: { id },
    data: { status: "PAUSED", pausedAt: new Date() },
  });
  revalidateAll();
  return { ok: true };
}

export async function resumeSubscription(id: string): Promise<SubscriptionActionResult> {
  const userId = await requireUserId();
  const sub = await ownedSubscription(id, userId);
  if (!sub) return { ok: false, error: "找不到此訂閱方案。" };
  if (sub.status !== "PAUSED") return { ok: false, error: "僅限已暫停的方案可恢復。" };

  await prisma.subscription.update({
    where: { id },
    data: { status: "ACTIVE", pausedAt: null },
  });
  revalidateAll();
  return { ok: true };
}

export async function cancelSubscription(id: string): Promise<SubscriptionActionResult> {
  const userId = await requireUserId();
  const sub = await ownedSubscription(id, userId);
  if (!sub) return { ok: false, error: "找不到此訂閱方案。" };
  if (sub.status === "CANCELLED") return { ok: false, error: "此方案已取消。" };

  await prisma.subscription.update({
    where: { id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
  revalidateAll();
  return { ok: true };
}

// 訂閱新方案：同 plan 同時只允許一個 ACTIVE/PAUSED；CANCELLED 不擋（視為歷史）。
export async function subscribeToPlan(
  plan: SubscriptionPlan,
): Promise<SubscriptionActionResult> {
  const userId = await requireUserId();
  if (!isSubscriptionPlan(plan)) {
    return { ok: false, error: "不支援的訂閱方案。" };
  }

  const existing = await prisma.subscription.findFirst({
    where: { userId, plan, status: { in: ["ACTIVE", "PAUSED"] } },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, error: "你已經有同方案的進行中訂閱，無法重複訂閱。" };
  }

  const cfg = PLAN_DEFAULTS[plan];
  const nextShipAt = new Date();
  nextShipAt.setDate(nextShipAt.getDate() + cfg.daysUntilNext);

  await prisma.subscription.create({
    data: {
      userId,
      plan,
      cadence: cfg.cadence,
      status: "ACTIVE",
      nextShipAt,
      pricePerShipment: cfg.pricePerShipment,
      shipmentsDelivered: 0,
      totalShipments: cfg.totalShipments,
    },
  });
  revalidateAll();
  return { ok: true };
}

// FormData 版本入口（給 <form action> 直接呼叫）
// 成功 / 失敗都導向 /account/subscriptions，前者讓使用者看到新建的訂閱、
// 後者讓使用者看到既有訂閱列表並理解為什麼無法重複訂閱。
export async function subscribeToPlanForm(formData: FormData): Promise<void> {
  const plan = formData.get("plan");
  if (!isSubscriptionPlan(plan)) {
    redirect("/subscribe?error=invalid");
  }
  const result = await subscribeToPlan(plan);
  if (!result.ok) {
    redirect(`/subscribe?error=${encodeURIComponent(result.error)}`);
  }
  redirect("/account/subscriptions");
}

// 重新訂閱已取消的方案 — 重置 shipmentsDelivered，建立新一輪。
export async function reactivateSubscription(
  id: string,
): Promise<SubscriptionActionResult> {
  const userId = await requireUserId();
  const sub = await prisma.subscription.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true, plan: true },
  });
  if (!sub || sub.userId !== userId) {
    return { ok: false, error: "找不到此訂閱方案。" };
  }
  if (sub.status !== "CANCELLED") {
    return { ok: false, error: "僅限已取消的方案可重新訂閱。" };
  }

  const duplicate = await prisma.subscription.findFirst({
    where: {
      userId,
      plan: sub.plan,
      status: { in: ["ACTIVE", "PAUSED"] },
    },
    select: { id: true },
  });
  if (duplicate) {
    return { ok: false, error: "你已經有同方案的進行中訂閱。" };
  }

  const cfg = PLAN_DEFAULTS[sub.plan];
  const nextShipAt = new Date();
  nextShipAt.setDate(nextShipAt.getDate() + cfg.daysUntilNext);

  await prisma.subscription.update({
    where: { id },
    data: {
      status: "ACTIVE",
      cancelledAt: null,
      pausedAt: null,
      shipmentsDelivered: 0,
      totalShipments: cfg.totalShipments,
      pricePerShipment: cfg.pricePerShipment,
      cadence: cfg.cadence,
      nextShipAt,
    },
  });
  revalidateAll();
  return { ok: true };
}
