// Phase 3b 補測 — 庫存併發 race condition
// 模擬：stock = 1 的商品，兩個 user 同時下單 qty=1，預期一成功一失敗。
// 用 Prisma transaction + update + where stock>=qty 的邏輯（與 placeOrder 相同）。

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { generateOrderNumber } from "../lib/order-number";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  console.log(`  ${cond ? "✓" : "✗"} ${name}${!cond && detail ? `\n      ${detail}` : ""}`);
  cond ? passed++ : failed++;
}

async function attemptOrder(userId: string, addressId: string, productId: string, qty: number) {
  try {
    return await prisma.$transaction(async (tx) => {
      const r = await tx.product.updateMany({
        where: { id: productId, stock: { gte: qty } },
        data: { stock: { decrement: qty } },
      });
      if (r.count === 0) throw new Error("STOCK_RACE");
      const num = await generateOrderNumber(tx);
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { name: true, slug: true, price: true },
      });
      await tx.order.create({
        data: {
          orderNumber: num,
          userId,
          addressId,
          shippingMethod: "CVS_711",
          paymentMethod: "CREDIT_CARD",
          subtotal: product!.price * qty,
          shippingFee: 0,
          total: product!.price * qty,
          recipientName: "race-test",
          recipientPhone: "0900000000",
          shippingZipCode: "100",
          shippingCity: "台北市",
          shippingDistrict: "中正區",
          shippingStreet: "race 測試街 1 號",
          items: {
            create: [
              {
                productId,
                productName: product!.name,
                productSlug: product!.slug,
                unitPrice: product!.price,
                qty,
              },
            ],
          },
        },
      });
      return { ok: true as const, orderNumber: num };
    });
  } catch (e) {
    if (e instanceof Error && e.message === "STOCK_RACE") {
      return { ok: false as const, reason: "STOCK_RACE" };
    }
    throw e;
  }
}

async function main() {
  const customer = await prisma.user.findUnique({ where: { email: "customer@coffee.local" } });
  const seller = await prisma.user.findUnique({ where: { email: "seller@coffee.local" } });
  if (!customer || !seller) {
    console.error("缺 demo users，先 pnpm db:seed");
    process.exit(1);
  }

  const product = await prisma.product.findFirst({
    where: { isActive: true },
    orderBy: { stock: "desc" },
  });
  if (!product) throw new Error("no products");

  const stockBefore = product.stock;

  const addrA = await prisma.address.upsert({
    where: { id: `race-addr-A-${customer.id}` },
    update: {},
    create: {
      id: `race-addr-A-${customer.id}`,
      userId: customer.id,
      recipient: "race A",
      phone: "0900000001",
      zipCode: "100",
      city: "台北市",
      district: "中正區",
      street: "race A 街 1 號",
      isDefault: false,
    },
  });
  const addrB = await prisma.address.upsert({
    where: { id: `race-addr-B-${seller.id}` },
    update: {},
    create: {
      id: `race-addr-B-${seller.id}`,
      userId: seller.id,
      recipient: "race B",
      phone: "0900000002",
      zipCode: "100",
      city: "台北市",
      district: "中正區",
      street: "race B 街 2 號",
      isDefault: false,
    },
  });

  // 把 stock 設成 1
  await prisma.product.update({ where: { id: product.id }, data: { stock: 1 } });

  console.log("\n[race] stock=1 下兩個 user 並發下單 qty=1");

  const [resA, resB] = await Promise.all([
    attemptOrder(customer.id, addrA.id, product.id, 1),
    attemptOrder(seller.id, addrB.id, product.id, 1),
  ]);

  const oks = [resA, resB].filter((r) => r.ok).length;
  const races = [resA, resB].filter((r) => !r.ok).length;

  check("恰一個成功（A=" + (resA.ok ? "ok" : "race") + " B=" + (resB.ok ? "ok" : "race") + "）", oks === 1);
  check("恰一個失敗於 STOCK_RACE", races === 1);

  const stockAfter = (await prisma.product.findUnique({ where: { id: product.id } }))!.stock;
  check("stock 從 1 扣到 0", stockAfter === 0);

  // 第三次 attempt 應立刻失敗
  const resC = await attemptOrder(customer.id, addrA.id, product.id, 1);
  check("stock=0 時第三次下單擋下", !resC.ok && resC.reason === "STOCK_RACE");

  // ----- 清理 -----
  const successOrderNumbers = [resA, resB].filter((r) => r.ok).map((r) => (r as { ok: true; orderNumber: string }).orderNumber);
  await prisma.order.deleteMany({ where: { orderNumber: { in: successOrderNumbers } } });
  await prisma.product.update({ where: { id: product.id }, data: { stock: stockBefore } });
  await prisma.address.delete({ where: { id: addrA.id } });
  await prisma.address.delete({ where: { id: addrB.id } });
  console.log(`      （清理：成功訂單已刪、stock 回 ${stockBefore}、race address 已刪）`);

  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  await prisma.$disconnect();
  if (failed > 0) process.exit(1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
