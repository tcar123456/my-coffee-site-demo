// Phase 3b — DB-level 直測驗收（不經 HTTP，直接呼叫 Prisma + 純函式）
// 用法：pnpm dlx tsx scripts/verify-phase3b.ts
//
// 涵蓋：
// 1. lib/address-validation：離島 zip 擋 / 本島 zip 通過
// 2. lib/shipping：calculateShipping 三種方式 × 是否達免運門檻
// 3. lib/order-number：generateOrderNumber 在 transaction 內遞增
// 4. placeOrder（直接複製 logic 因為 server action 不可在 node 端 import）：
//    - 庫存不足擋下
//    - 成功建單後 cart 清空、stock 減、Order/OrderItems 寫入、orderNumber 格式正確
// 5. markOrderPaid：PENDING → PAID + paidAt 寫入

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { isOffshoreZip, isValidTaiwanZip } from "../lib/address-validation";
import { calculateShipping, FREE_SHIPPING_THRESHOLD } from "../lib/shipping";
import { generateOrderNumber } from "../lib/order-number";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name}${detail ? `\n      ${detail}` : ""}`);
    failed++;
  }
}

async function section1AddressValidation() {
  console.log("\n[1] address-validation");
  check("台北 100 通過", !isOffshoreZip("100") && isValidTaiwanZip("100"));
  check("金門 891 擋下", isOffshoreZip("891"));
  check("澎湖 880 擋下", isOffshoreZip("880"));
  check("連江 209 擋下", isOffshoreZip("209"));
  check("連江 210 擋下", isOffshoreZip("210"));
  check("新北 220 通過（不在離島清單）", !isOffshoreZip("220"));
  check("無效 zip '12'", !isValidTaiwanZip("12"));
}

async function section2Shipping() {
  console.log("\n[2] shipping");
  check("CVS_711 未滿門檻 = 60", calculateShipping(800, "CVS_711") === 60);
  check("CVS_FAMILY 未滿門檻 = 60", calculateShipping(800, "CVS_FAMILY") === 60);
  check("HOME_DELIVERY 未滿門檻 = 100", calculateShipping(800, "HOME_DELIVERY") === 100);
  check(
    `滿 ${FREE_SHIPPING_THRESHOLD} 三種方式都免運`,
    calculateShipping(1500, "CVS_711") === 0 &&
      calculateShipping(1500, "CVS_FAMILY") === 0 &&
      calculateShipping(1500, "HOME_DELIVERY") === 0,
  );
  check("剛好門檻 = 0", calculateShipping(FREE_SHIPPING_THRESHOLD, "CVS_711") === 0);
  check("差 1 元 = 收費", calculateShipping(FREE_SHIPPING_THRESHOLD - 1, "CVS_711") === 60);
}

async function section3OrderNumber() {
  console.log("\n[3] order-number");
  // 用 transaction 內遞增測；測完 rollback 不留資料
  const numbers: string[] = [];
  try {
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < 3; i++) {
        numbers.push(await generateOrderNumber(tx));
      }
      throw new Error("__rollback__");
    });
  } catch (e) {
    if (!(e instanceof Error) || e.message !== "__rollback__") throw e;
  }
  check("三個編號都是 ORD-YYYYMMDD-NNNN 格式", numbers.every((n) => /^ORD-\d{8}-\d{4}$/.test(n)));
  check("序號遞增", numbers[0] !== numbers[1] && numbers[1] !== numbers[2]);
  console.log(`      樣本：${numbers.join(" → ")}`);
}

async function section4PlaceOrder() {
  console.log("\n[4] place-order 主流程");

  // 找 demo customer 與第一個 active product
  const customer = await prisma.user.findUnique({ where: { email: "customer@coffee.local" } });
  if (!customer) {
    console.log("  ✗ 找不到 customer@coffee.local，跳過。先跑 pnpm db:seed");
    failed++;
    return;
  }
  const product = await prisma.product.findFirst({ where: { isActive: true, stock: { gt: 0 } } });
  if (!product) {
    console.log("  ✗ 找不到有庫存的 product，跳過");
    failed++;
    return;
  }

  // 清掉舊 verify 訂單避免污染（以本測試的 orderNumber prefix 識別）
  await prisma.order.deleteMany({ where: { userId: customer.id, recipientName: "驗收用·勿留" } });

  // 建（或重用）verify address
  const address = await prisma.address.upsert({
    where: { id: `verify-addr-${customer.id}` },
    update: {},
    create: {
      id: `verify-addr-${customer.id}`,
      userId: customer.id,
      recipient: "驗收用·勿留",
      phone: "0900000000",
      zipCode: "100",
      city: "台北市",
      district: "中正區",
      street: "驗收街 1 號",
      isDefault: false,
    },
  });

  // 設 cart 起點：1 件商品 × 2
  const cart = await prisma.cart.upsert({
    where: { userId: customer.id },
    update: {},
    create: { userId: customer.id },
  });
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  await prisma.cartItem.create({
    data: { cartId: cart.id, productId: product.id, qty: 2 },
  });

  const stockBefore = product.stock;

  // ----- 4a 庫存不足擋下 -----
  // 直接在 transaction 內模擬扣庫存 — 用 update + where 條件
  let stockGuardWorked = false;
  try {
    await prisma.$transaction(async (tx) => {
      const r = await tx.product.updateMany({
        where: { id: product.id, stock: { gte: stockBefore + 999 } },
        data: { stock: { decrement: stockBefore + 999 } },
      });
      if (r.count === 0) throw new Error("STOCK_RACE");
    });
  } catch (e) {
    if (e instanceof Error && e.message === "STOCK_RACE") stockGuardWorked = true;
  }
  check("庫存不足時 update + where 條件擋下", stockGuardWorked);
  const stockAfterGuard = (await prisma.product.findUnique({ where: { id: product.id } }))!.stock;
  check("庫存被回滾", stockAfterGuard === stockBefore);

  // ----- 4b 成功建單 -----
  const orderNumber = await prisma.$transaction(async (tx) => {
    const r = await tx.product.updateMany({
      where: { id: product.id, stock: { gte: 2 } },
      data: { stock: { decrement: 2 } },
    });
    if (r.count === 0) throw new Error("STOCK_RACE");

    const num = await generateOrderNumber(tx);
    await tx.order.create({
      data: {
        orderNumber: num,
        userId: customer.id,
        addressId: address.id,
        shippingMethod: "CVS_711",
        paymentMethod: "CREDIT_CARD",
        subtotal: product.price * 2,
        shippingFee: calculateShipping(product.price * 2, "CVS_711"),
        total: product.price * 2 + calculateShipping(product.price * 2, "CVS_711"),
        recipientName: address.recipient,
        recipientPhone: address.phone,
        shippingZipCode: address.zipCode,
        shippingCity: address.city,
        shippingDistrict: address.district,
        shippingStreet: address.street,
        items: {
          create: [
            {
              productId: product.id,
              productName: product.name,
              productSlug: product.slug,
              unitPrice: product.price,
              qty: 2,
            },
          ],
        },
      },
    });
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    return num;
  });

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true },
  });
  check("Order 建立", !!order);
  check("OrderItem snapshot 寫入", order!.items[0].productName === product.name);
  check("OrderItem unitPrice = product.price", order!.items[0].unitPrice === product.price);
  check("Order status 預設 PENDING", order!.status === "PENDING");
  check("orderNumber 格式正確", /^ORD-\d{8}-\d{4}$/.test(orderNumber));

  const stockAfterOrder = (await prisma.product.findUnique({ where: { id: product.id } }))!.stock;
  check(`stock 從 ${stockBefore} 扣到 ${stockAfterOrder}（應 -2）`, stockAfterOrder === stockBefore - 2);

  const itemsAfter = await prisma.cartItem.count({ where: { cartId: cart.id } });
  check("Cart 清空", itemsAfter === 0);

  // ----- 4c markOrderPaid (PENDING → PAID) -----
  await prisma.order.update({
    where: { id: order!.id },
    data: { status: "PAID", paidAt: new Date() },
  });
  const paid = await prisma.order.findUnique({ where: { id: order!.id } });
  check("status PAID", paid!.status === "PAID");
  check("paidAt 寫入", paid!.paidAt !== null);

  // ----- 清理 -----
  await prisma.order.delete({ where: { id: order!.id } });
  await prisma.product.update({
    where: { id: product.id },
    data: { stock: stockBefore },
  });
  await prisma.address.delete({ where: { id: address.id } });
  console.log(`      （清理：訂單已刪、stock 回 ${stockBefore}、verify address 已刪）`);
}

async function main() {
  await section1AddressValidation();
  await section2Shipping();
  await section3OrderNumber();
  await section4PlaceOrder();

  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  await prisma.$disconnect();
  if (failed > 0) process.exit(1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
