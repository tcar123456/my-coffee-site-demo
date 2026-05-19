// 一次性診斷腳本：撈 demo customer 最近 10 筆訂單，看狀態 + 付款追蹤欄位
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const customer = await prisma.user.findUnique({
    where: { email: "customer@coffee.local" },
    select: { id: true, email: true },
  });
  if (!customer) {
    console.error("找不到 customer@coffee.local，先跑 pnpm prisma db seed");
    process.exit(1);
  }

  const orders = await prisma.order.findMany({
    where: { userId: customer.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      orderNumber: true,
      status: true,
      paymentMethod: true,
      total: true,
      createdAt: true,
      paymentRequestedAt: true,
      paymentTradeNo: true,
      paymentFailedAt: true,
      paymentFailReason: true,
    },
  });

  if (orders.length === 0) {
    console.log("\n沒有任何訂單。");
  } else {
    console.log(`\n${customer.email} 最近 ${orders.length} 筆訂單：\n`);
    for (const o of orders) {
      console.log(`  #${o.orderNumber}`);
      console.log(`    建立      ${o.createdAt.toISOString()}`);
      console.log(`    狀態      ${o.status}`);
      console.log(`    付款方式  ${o.paymentMethod}`);
      console.log(`    金額      NT$ ${o.total}`);
      console.log(`    pay req   ${o.paymentRequestedAt?.toISOString() ?? "—"}`);
      console.log(`    tradeNo   ${o.paymentTradeNo ?? "—"}`);
      console.log(`    failed    ${o.paymentFailedAt?.toISOString() ?? "—"}`);
      if (o.paymentFailReason) console.log(`    reason    ${o.paymentFailReason}`);
      console.log();
    }
  }

  // 順便看 cart 狀態
  const cart = await prisma.cart.findUnique({
    where: { userId: customer.id },
    include: { items: { select: { qty: true, product: { select: { name: true } } } } },
  });
  console.log(`購物車目前 ${cart?.items.length ?? 0} 項：`);
  for (const it of cart?.items ?? []) {
    console.log(`  - ${it.product.name} × ${it.qty}`);
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
