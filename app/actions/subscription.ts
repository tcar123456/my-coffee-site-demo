"use server";

// Phase 4 — Subscription 假流程 server actions
// 不接金流、不真出貨；status 只在 ACTIVE/PAUSED/CANCELLED 三態切換。

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type SubscriptionActionResult =
  | { ok: true }
  | { ok: false; error: string };

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
