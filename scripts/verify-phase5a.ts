// Phase 5a DB-level smoke test
// 兩段：
//   [A] 狀態機 pure helpers — 直接 import 測
//   [B] updateOrderStatus transaction 邏輯 — 用 Prisma 重現（仿 Phase 3b/4 風格）
//       測試重點：狀態前進 + 時間戳 + 取消時的庫存回補規則
//   [C] adjustStock 邏輯 + listOrdersForAdmin filter + getAdminOverview shape

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import {
  isAllowedTransition,
  shouldRestoreStockOnCancel,
  nextForwardStatus,
  forwardActionLabel,
  canCancel,
} from "../lib/order-state";
import { generateOrderNumber } from "../lib/order-number";
import type { OrderStatus } from "../generated/prisma/enums";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

let pass = 0;
let fail = 0;
function assert(label: string, cond: unknown, detail?: string) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.error(`  ✗ ${label}${detail ? `\n      ${detail}` : ""}`);
  }
}

// ============ [A] State machine pure helpers ============

function testStateMachine() {
  console.log("\n[A] 狀態機 pure helpers");

  // nextForwardStatus
  assert("nextForwardStatus(PENDING) === 'PAID'", nextForwardStatus("PENDING") === "PAID");
  assert("nextForwardStatus(PAID) === 'SHIPPED'", nextForwardStatus("PAID") === "SHIPPED");
  assert("nextForwardStatus(SHIPPED) === 'DELIVERED'", nextForwardStatus("SHIPPED") === "DELIVERED");
  assert("nextForwardStatus(DELIVERED) === null", nextForwardStatus("DELIVERED") === null);
  assert("nextForwardStatus(CANCELLED) === null", nextForwardStatus("CANCELLED") === null);

  // forwardActionLabel
  assert("forwardActionLabel(PENDING) 有值", !!forwardActionLabel("PENDING"));
  assert("forwardActionLabel(DELIVERED) === null", forwardActionLabel("DELIVERED") === null);

  // canCancel
  assert("canCancel(PENDING) === true", canCancel("PENDING"));
  assert("canCancel(PAID) === true", canCancel("PAID"));
  assert("canCancel(SHIPPED) === true", canCancel("SHIPPED"));
  assert("canCancel(DELIVERED) === false", !canCancel("DELIVERED"));
  assert("canCancel(CANCELLED) === false", !canCancel("CANCELLED"));

  // isAllowedTransition — legal forward
  assert("PENDING → PAID OK", isAllowedTransition("PENDING", "PAID"));
  assert("PAID → SHIPPED OK", isAllowedTransition("PAID", "SHIPPED"));
  assert("SHIPPED → DELIVERED OK", isAllowedTransition("SHIPPED", "DELIVERED"));

  // 不能跳級
  assert("PENDING → SHIPPED 擋", !isAllowedTransition("PENDING", "SHIPPED"));
  assert("PAID → DELIVERED 擋", !isAllowedTransition("PAID", "DELIVERED"));

  // 不能回頭
  assert("PAID → PENDING 擋", !isAllowedTransition("PAID", "PENDING"));
  assert("SHIPPED → PAID 擋", !isAllowedTransition("SHIPPED", "PAID"));

  // cancel
  assert("PENDING → CANCELLED OK", isAllowedTransition("PENDING", "CANCELLED"));
  assert("PAID → CANCELLED OK", isAllowedTransition("PAID", "CANCELLED"));
  assert("SHIPPED → CANCELLED OK", isAllowedTransition("SHIPPED", "CANCELLED"));
  assert("DELIVERED → CANCELLED 擋", !isAllowedTransition("DELIVERED", "CANCELLED"));
  assert("CANCELLED → CANCELLED 擋", !isAllowedTransition("CANCELLED", "CANCELLED"));

  // 同值不允許
  assert("PAID → PAID 擋（無 noop）", !isAllowedTransition("PAID", "PAID"));

  // shouldRestoreStockOnCancel
  assert("PENDING → CANCELLED 回補", shouldRestoreStockOnCancel("PENDING"));
  assert("PAID → CANCELLED 回補", shouldRestoreStockOnCancel("PAID"));
  assert("SHIPPED → CANCELLED 不回補（已出倉）", !shouldRestoreStockOnCancel("SHIPPED"));
}

// ============ [B] updateOrderStatus transaction 重現 ============

// 重現 updateOrderStatus 內 transaction 邏輯（去掉 auth gate / revalidate）
async function tryTransition(orderId: string, nextStatus: OrderStatus): Promise<
  { ok: true } | { ok: false; reason: string }
> {
  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          status: true,
          items: { select: { productId: true, qty: true } },
        },
      });
      if (!order) throw new Error("NOT_FOUND");

      const prevStatus = order.status as OrderStatus;
      if (!isAllowedTransition(prevStatus, nextStatus)) {
        throw new Error(`ILLEGAL:${prevStatus}->${nextStatus}`);
      }

      const now = new Date();
      const data: Record<string, unknown> = { status: nextStatus };
      if (nextStatus === "PAID") data.paidAt = now;
      if (nextStatus === "SHIPPED") data.shippedAt = now;
      if (nextStatus === "DELIVERED") data.deliveredAt = now;
      if (nextStatus === "CANCELLED") data.cancelledAt = now;

      await tx.order.update({ where: { id: order.id }, data });

      if (nextStatus === "CANCELLED" && shouldRestoreStockOnCancel(prevStatus)) {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.qty } },
          });
        }
      }
    });
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    return { ok: false, reason: msg };
  }
}

// 建一筆 status=PENDING 的測試訂單（庫存先扣），回 orderId + productId + 扣前/扣後 stock
async function seedTestOrder(opts: { userId: string; addressId: string; productId: string; qty: number }) {
  const before = await prisma.product.findUnique({
    where: { id: opts.productId },
    select: { name: true, slug: true, price: true, stock: true },
  });
  if (!before) throw new Error("product missing");

  // 扣庫存 + 建單（仿 placeOrder）
  await prisma.product.update({
    where: { id: opts.productId },
    data: { stock: { decrement: opts.qty } },
  });

  const number = await prisma.$transaction(async (tx) => generateOrderNumber(tx));

  const order = await prisma.order.create({
    data: {
      orderNumber: number,
      userId: opts.userId,
      addressId: opts.addressId,
      shippingMethod: "CVS_711",
      paymentMethod: "CREDIT_CARD",
      subtotal: before.price * opts.qty,
      shippingFee: 0,
      total: before.price * opts.qty,
      recipientName: "phase5a-test",
      recipientPhone: "0900111222",
      shippingZipCode: "100",
      shippingCity: "台北市",
      shippingDistrict: "中正區",
      shippingStreet: "驗收街 5a 號",
      items: {
        create: [
          {
            productId: opts.productId,
            productName: before.name,
            productSlug: before.slug,
            unitPrice: before.price,
            qty: opts.qty,
          },
        ],
      },
    },
  });
  return { orderId: order.id, orderNumber: order.orderNumber, stockBefore: before.stock };
}

async function getStock(productId: string): Promise<number> {
  const p = await prisma.product.findUnique({
    where: { id: productId },
    select: { stock: true },
  });
  return p?.stock ?? -1;
}

async function getOrder(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    select: {
      status: true,
      paidAt: true,
      shippedAt: true,
      deliveredAt: true,
      cancelledAt: true,
    },
  });
}

// 清乾淨：刪掉所有測試 order + 還原 stock
// 「是否已被 updateOrderStatus 回補過」判斷：
//   status === CANCELLED 且 shippedAt 為 null
//   （shouldRestoreStockOnCancel 規則：PENDING/PAID → CANCELLED 才回補；
//    SHIPPED → CANCELLED 不回補，但 shippedAt 已被設值，可用此區分）
async function cleanupTestOrders(productId: string) {
  const testOrders = await prisma.order.findMany({
    where: { recipientName: "phase5a-test" },
    select: {
      id: true,
      status: true,
      shippedAt: true,
      items: { select: { productId: true, qty: true } },
    },
  });
  for (const o of testOrders) {
    const alreadyRestored = o.status === "CANCELLED" && o.shippedAt === null;
    if (!alreadyRestored) {
      for (const item of o.items) {
        if (item.productId === productId) {
          await prisma.product.update({
            where: { id: productId },
            data: { stock: { increment: item.qty } },
          });
        }
      }
    }
  }
  await prisma.orderItem.deleteMany({ where: { order: { recipientName: "phase5a-test" } } });
  await prisma.order.deleteMany({ where: { recipientName: "phase5a-test" } });
}

async function testTransactionFlow() {
  console.log("\n[B] updateOrderStatus transaction（DB）");

  const customer = await prisma.user.findUnique({ where: { email: "customer@coffee.local" } });
  if (!customer) throw new Error("customer demo user missing");

  // 找/建一個測試地址
  let address = await prisma.address.findFirst({
    where: { userId: customer.id, recipient: "phase5a-test" },
  });
  if (!address) {
    address = await prisma.address.create({
      data: {
        userId: customer.id,
        recipient: "phase5a-test",
        phone: "0900111222",
        zipCode: "100",
        city: "台北市",
        district: "中正區",
        street: "驗收街 5a 號",
        isDefault: false,
      },
    });
  }

  // 找一個庫存夠 (>= 10) 的商品
  const product = await prisma.product.findFirst({
    where: { stock: { gte: 10 } },
    orderBy: { stock: "desc" },
  });
  if (!product) throw new Error("沒有 stock >= 10 的商品；先 reseed 庫存");

  // 預先 cleanup（避免上次測試殘留）
  await cleanupTestOrders(product.id);

  const stockBaseline = (await prisma.product.findUnique({
    where: { id: product.id },
    select: { stock: true },
  }))!.stock;

  // ── B1. PENDING → PAID → SHIPPED → DELIVERED 全程前進（不取消 → 不回補）
  console.log("\n  [B1] PENDING → PAID → SHIPPED → DELIVERED 線性前進");
  const o1 = await seedTestOrder({ userId: customer.id, addressId: address.id, productId: product.id, qty: 2 });
  assert("[B1] seed 後 stock 少 2", (await getStock(product.id)) === stockBaseline - 2);

  let r = await tryTransition(o1.orderId, "PAID");
  assert("[B1] PENDING → PAID ok=true", r.ok);
  let row = await getOrder(o1.orderId);
  assert("[B1] status === PAID", row?.status === "PAID");
  assert("[B1] paidAt 有值", !!row?.paidAt);
  assert("[B1] PAID 後 stock 不變", (await getStock(product.id)) === stockBaseline - 2);

  r = await tryTransition(o1.orderId, "SHIPPED");
  assert("[B1] PAID → SHIPPED ok=true", r.ok);
  row = await getOrder(o1.orderId);
  assert("[B1] status === SHIPPED", row?.status === "SHIPPED");
  assert("[B1] shippedAt 有值", !!row?.shippedAt);

  r = await tryTransition(o1.orderId, "DELIVERED");
  assert("[B1] SHIPPED → DELIVERED ok=true", r.ok);
  row = await getOrder(o1.orderId);
  assert("[B1] status === DELIVERED", row?.status === "DELIVERED");
  assert("[B1] deliveredAt 有值", !!row?.deliveredAt);

  // ── B2. PENDING → CANCELLED：庫存回補
  console.log("\n  [B2] PENDING → CANCELLED 回補庫存");
  const stockBeforeB2 = await getStock(product.id);
  const o2 = await seedTestOrder({ userId: customer.id, addressId: address.id, productId: product.id, qty: 3 });
  assert("[B2] seed 後 stock 少 3", (await getStock(product.id)) === stockBeforeB2 - 3);

  r = await tryTransition(o2.orderId, "CANCELLED");
  assert("[B2] PENDING → CANCELLED ok=true", r.ok);
  row = await getOrder(o2.orderId);
  assert("[B2] status === CANCELLED", row?.status === "CANCELLED");
  assert("[B2] cancelledAt 有值", !!row?.cancelledAt);
  assert("[B2] stock 回補到 cancel 前的值", (await getStock(product.id)) === stockBeforeB2);

  // ── B3. PAID → CANCELLED：庫存回補
  console.log("\n  [B3] PAID → CANCELLED 回補庫存");
  const stockBeforeB3 = await getStock(product.id);
  const o3 = await seedTestOrder({ userId: customer.id, addressId: address.id, productId: product.id, qty: 4 });
  await tryTransition(o3.orderId, "PAID");
  assert("[B3] PAID 後 stock 少 4", (await getStock(product.id)) === stockBeforeB3 - 4);

  r = await tryTransition(o3.orderId, "CANCELLED");
  assert("[B3] PAID → CANCELLED ok=true", r.ok);
  row = await getOrder(o3.orderId);
  assert("[B3] status === CANCELLED", row?.status === "CANCELLED");
  assert("[B3] stock 回補", (await getStock(product.id)) === stockBeforeB3);

  // ── B4. SHIPPED → CANCELLED：不回補
  console.log("\n  [B4] SHIPPED → CANCELLED 不回補（已出倉）");
  const stockBeforeB4 = await getStock(product.id);
  const o4 = await seedTestOrder({ userId: customer.id, addressId: address.id, productId: product.id, qty: 2 });
  await tryTransition(o4.orderId, "PAID");
  await tryTransition(o4.orderId, "SHIPPED");
  assert("[B4] SHIPPED 後 stock 少 2", (await getStock(product.id)) === stockBeforeB4 - 2);

  r = await tryTransition(o4.orderId, "CANCELLED");
  assert("[B4] SHIPPED → CANCELLED ok=true", r.ok);
  row = await getOrder(o4.orderId);
  assert("[B4] status === CANCELLED", row?.status === "CANCELLED");
  assert("[B4] stock 不變（仍少 2）", (await getStock(product.id)) === stockBeforeB4 - 2);

  // ── B5. 非法轉移擋下
  console.log("\n  [B5] 非法轉移擋下");
  const o5 = await seedTestOrder({ userId: customer.id, addressId: address.id, productId: product.id, qty: 1 });

  r = await tryTransition(o5.orderId, "SHIPPED"); // 跳級
  assert("[B5] PENDING → SHIPPED 應失敗", !r.ok && r.reason.startsWith("ILLEGAL:"));

  await tryTransition(o5.orderId, "PAID");
  r = await tryTransition(o5.orderId, "DELIVERED"); // 跳級
  assert("[B5] PAID → DELIVERED 應失敗", !r.ok && r.reason.startsWith("ILLEGAL:"));

  await tryTransition(o5.orderId, "SHIPPED");
  await tryTransition(o5.orderId, "DELIVERED");
  r = await tryTransition(o5.orderId, "CANCELLED");
  assert("[B5] DELIVERED → CANCELLED 應失敗", !r.ok && r.reason.startsWith("ILLEGAL:"));

  // ── 最終 cleanup
  await cleanupTestOrders(product.id);
  const stockEnd = await getStock(product.id);
  assert("[B6] cleanup 後 stock 回到 baseline", stockEnd === stockBaseline);
}

// ============ [C] adjustStock + listOrdersForAdmin + getAdminOverview ============

async function testStockAndListing() {
  console.log("\n[C] adjustStock + listOrdersForAdmin filter + getAdminOverview");

  // C1. adjustStock 邏輯（直接 prisma update + zod 範圍 0-99999；負值/超大值由 zod 擋，這裡測 happy path）
  const p = await prisma.product.findFirst({ where: { isActive: true } });
  if (!p) throw new Error("active product missing");
  const original = p.stock;

  await prisma.product.update({ where: { id: p.id }, data: { stock: 999 } });
  let after = (await prisma.product.findUnique({ where: { id: p.id }, select: { stock: true } }))!.stock;
  assert("[C1] adjustStock 設為 999", after === 999);

  await prisma.product.update({ where: { id: p.id }, data: { stock: 0 } });
  after = (await prisma.product.findUnique({ where: { id: p.id }, select: { stock: true } }))!.stock;
  assert("[C1] adjustStock 設為 0", after === 0);

  // 還原
  await prisma.product.update({ where: { id: p.id }, data: { stock: original } });
  after = (await prisma.product.findUnique({ where: { id: p.id }, select: { stock: true } }))!.stock;
  assert("[C1] 還原 stock", after === original);

  // C2. listOrdersForAdmin filter shape（重現 where + count）
  const totalAll = await prisma.order.count();
  const totalPending = await prisma.order.count({ where: { status: "PENDING" } });
  assert("[C2] count(all) >= count(PENDING)", totalAll >= totalPending);

  const pendingOrders = await prisma.order.findMany({
    where: { status: "PENDING" },
    take: 5,
  });
  assert(
    "[C2] PENDING 篩選結果全部 status===PENDING",
    pendingOrders.every((o) => o.status === "PENDING"),
  );

  // search by recipient — 用 phase5a-test 殘留搜（但前面 cleanup 過所以該找不到）
  const searched = await prisma.order.findMany({
    where: { recipientName: { contains: "phase5a-test", mode: "insensitive" } },
  });
  assert("[C2] cleanup 後搜 phase5a-test 為 0", searched.length === 0);

  // C3. getAdminOverview shape — 重現 aggregation
  const now = new Date();
  const last7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const revenue = await prisma.order.aggregate({
    _sum: { total: true },
    where: {
      status: { in: ["PAID", "SHIPPED", "DELIVERED"] },
      createdAt: { gte: last7 },
    },
  });
  assert("[C3] 7 日營收 aggregate 不爆", typeof (revenue._sum.total ?? 0) === "number");

  const lowStock = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { stock: "asc" },
    take: 4,
  });
  assert("[C3] lowStock take 4 回傳 <=4 筆", lowStock.length <= 4);
  assert("[C3] lowStock 已依 stock 升冪", lowStock.every((p, i) => i === 0 || p.stock >= lowStock[i - 1].stock));
}

async function main() {
  testStateMachine();
  await testTransactionFlow();
  await testStockAndListing();

  console.log(`\n─────────────────────────────────────`);
  console.log(`Phase 5a 驗收：${pass} pass / ${fail} fail`);
  if (fail > 0) process.exit(1);
}

main()
  .catch((e) => {
    console.error("\n[FATAL]", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
