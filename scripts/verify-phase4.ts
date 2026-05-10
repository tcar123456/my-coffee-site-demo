// Phase 4 DB-level smoke test
// 直測 wishlist + subscription 邏輯（繞過 server action 的 auth gate）

import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import {
  PrismaClient,
  SubscriptionStatus,
  SubscriptionPlan,
  SubscriptionCadence,
} from "../generated/prisma/client";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

let pass = 0;
let fail = 0;
function assert(label: string, cond: unknown) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.error(`  ✗ ${label}`);
  }
}

async function main() {
  const customer = await prisma.user.findUnique({
    where: { email: "customer@coffee.local" },
  });
  if (!customer) throw new Error("customer demo user missing");

  const product = await prisma.product.findUnique({
    where: { slug: "ethiopia-yirgacheffe-g1-kochere" },
  });
  if (!product) throw new Error("ethiopia product missing");

  console.log("\n[1/3] Wishlist toggle / unique");

  // 清掉先前測試殘留
  await prisma.wishlistItem.deleteMany({
    where: { userId: customer.id, productId: product.id },
  });

  // create
  await prisma.wishlistItem.create({
    data: { userId: customer.id, productId: product.id },
  });
  let count = await prisma.wishlistItem.count({
    where: { userId: customer.id, productId: product.id },
  });
  assert("wishlist create — exactly 1 row", count === 1);

  // unique violation on duplicate
  let dupErrored = false;
  try {
    await prisma.wishlistItem.create({
      data: { userId: customer.id, productId: product.id },
    });
  } catch {
    dupErrored = true;
  }
  assert("wishlist duplicate insert throws (P2002)", dupErrored);

  // delete
  await prisma.wishlistItem.delete({
    where: {
      userId_productId: { userId: customer.id, productId: product.id },
    },
  });
  count = await prisma.wishlistItem.count({
    where: { userId: customer.id, productId: product.id },
  });
  assert("wishlist delete — back to 0", count === 0);

  console.log("\n[2/3] getWishlistedProductIds helper");
  const { getWishlistedProductIds } = await import("../lib/wishlist-server");
  const before = await getWishlistedProductIds(customer.id);
  assert("Set 不含尚未加入的 product", !before.has(product.id));
  await prisma.wishlistItem.create({
    data: { userId: customer.id, productId: product.id },
  });
  const after = await getWishlistedProductIds(customer.id);
  assert("Set 加入後包含 productId", after.has(product.id));
  assert("Set size 比 before 多 1", after.size === before.size + 1);
  const nullSet = await getWishlistedProductIds(null);
  assert("null userId → 空 Set", nullSet.size === 0);

  console.log("\n[3/3] Subscription state machine");

  // Setup: 用一個獨立的測試訂閱（不影響 seed 的）
  const testSub = await prisma.subscription.create({
    data: {
      userId: customer.id,
      plan: SubscriptionPlan.SINGLE_BEAN_MONTHLY,
      cadence: SubscriptionCadence.MONTHLY,
      status: SubscriptionStatus.ACTIVE,
      nextShipAt: new Date("2026-06-01T00:00:00Z"),
      pricePerShipment: 580,
      shipmentsDelivered: 0,
      totalShipments: 6,
    },
  });
  assert("create subscription — status default ACTIVE", testSub.status === "ACTIVE");

  // pause
  const paused = await prisma.subscription.update({
    where: { id: testSub.id },
    data: { status: "PAUSED", pausedAt: new Date() },
  });
  assert("pause — status PAUSED + pausedAt 寫入", paused.status === "PAUSED" && paused.pausedAt !== null);

  // resume
  const resumed = await prisma.subscription.update({
    where: { id: testSub.id },
    data: { status: "ACTIVE", pausedAt: null },
  });
  assert("resume — status ACTIVE + pausedAt null", resumed.status === "ACTIVE" && resumed.pausedAt === null);

  // cancel
  const cancelled = await prisma.subscription.update({
    where: { id: testSub.id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
  assert("cancel — status CANCELLED + cancelledAt 寫入", cancelled.status === "CANCELLED" && cancelled.cancelledAt !== null);

  // listSubscriptions sort
  const all = await prisma.subscription.findMany({
    where: { userId: customer.id },
    orderBy: { createdAt: "desc" },
  });
  const order = { ACTIVE: 0, PAUSED: 1, CANCELLED: 2 } as const;
  const sorted = all.sort((a, b) => order[a.status] - order[b.status]);
  const statusSeq = sorted.map((s) => s.status);
  const isMonotonic = statusSeq.every(
    (s, i) => i === 0 || order[statusSeq[i - 1]] <= order[s],
  );
  assert("listSubscriptions sort: ACTIVE → PAUSED → CANCELLED", isMonotonic);

  // 清理測試訂閱
  await prisma.subscription.delete({ where: { id: testSub.id } });

  // 清理測試 wishlist
  await prisma.wishlistItem.deleteMany({
    where: { userId: customer.id, productId: product.id },
  });

  console.log(`\n=== ${pass} passed, ${fail} failed ===`);
  if (fail > 0) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
