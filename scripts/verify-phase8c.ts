// Phase 8c DB-level smoke test
// 涵蓋：
//   [A] SHIPPING_METHOD_TO_SUBTYPE 對應正確
//   [B] performCreateShipment happy path（mock fetch 回 1|OK）— CVS + Home 兩條
//   [C] performCreateShipment 失敗回應路徑（RtnCode != "1"）
//   [D] performCreateShipment fetch throw（連線失敗）
//   [E] buildGoodsName 串接 + 50 字截斷由 buildCreateShipmentParams 內 sanitizeText 負責
//   [F] DB-level guard：重現 createShipmentForOrder 的 PAID + logisticsId === null 校驗
//   [G] 寫入 Order.logisticsId / logisticsSubType
//
// 完全離線；fetchImpl 注入 mock。

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { SHIPPING_METHOD_TO_SUBTYPE } from "../lib/logistics/types";
import {
  performCreateShipment,
  buildGoodsName,
} from "../lib/logistics/create-shipment";
import { getEcpayLogisticsConfig } from "../lib/logistics/ecpay-logistics-config";
import { generateOrderNumber } from "../lib/order-number";
import { MOCK_STORES } from "../lib/logistics/store-mock";

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

const TEST_EMAIL_PREFIX = "ph8c-test-";

// 簡單的 fetch mock builder
function makeMockFetch(
  responseText: string,
  options: { capture?: { url?: string; body?: string } } = {},
): typeof fetch {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    if (options.capture) {
      options.capture.url = String(url);
      options.capture.body = String(init?.body ?? "");
    }
    return new Response(responseText, {
      status: 200,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  }) as unknown as typeof fetch;
}

function makeThrowingFetch(message: string): typeof fetch {
  return (async () => {
    throw new Error(message);
  }) as unknown as typeof fetch;
}

const cfg = getEcpayLogisticsConfig();

// ============ [A] SHIPPING_METHOD_TO_SUBTYPE 對應 ============

function testMethodMapping() {
  console.log("\n[A] SHIPPING_METHOD_TO_SUBTYPE 對應");

  assert(
    "CVS_711 → CVS/UNIMARTC2C",
    SHIPPING_METHOD_TO_SUBTYPE.CVS_711.type === "CVS" &&
      SHIPPING_METHOD_TO_SUBTYPE.CVS_711.subType === "UNIMARTC2C",
  );
  assert(
    "CVS_FAMILY → CVS/FAMIC2C",
    SHIPPING_METHOD_TO_SUBTYPE.CVS_FAMILY.type === "CVS" &&
      SHIPPING_METHOD_TO_SUBTYPE.CVS_FAMILY.subType === "FAMIC2C",
  );
  assert(
    "HOME_DELIVERY → Home/TCAT",
    SHIPPING_METHOD_TO_SUBTYPE.HOME_DELIVERY.type === "Home" &&
      SHIPPING_METHOD_TO_SUBTYPE.HOME_DELIVERY.subType === "TCAT",
  );
}

// ============ [B] performCreateShipment happy path ============

async function testPerformShipmentHappyCvs() {
  console.log("\n[B] performCreateShipment happy — CVS");

  const capture: { url?: string; body?: string } = {};
  const mockResponse =
    "RtnCode=1&RtnMsg=OK&AllPayLogisticsID=2026052012345678&LogisticsType=CVS&GoodsAmount=680";
  const seven = MOCK_STORES[0];

  const result = await performCreateShipment(
    {
      config: cfg,
      sender: {
        name: "暮焙",
        cellPhone: "0912345678",
        zipCode: "10617",
        address: "10617 台北市大安區羅斯福路四段 1 號",
      },
      orderNumber: "ORD-20260520-0001",
      total: 680,
      goodsName: "耶加雪菲 G1×1",
      recipientName: "陳先生",
      recipientPhone: "0987654321",
      recipientEmail: "buyer@example.com",
      logisticsType: "CVS",
      logisticsSubType: "UNIMARTC2C",
      cvsStoreId: seven.storeId,
      now: new Date("2026-05-20T06:00:00Z"),
    },
    makeMockFetch(mockResponse, { capture }),
  );

  assert("CVS happy: ok === true", result.ok === true);
  if (result.ok) {
    assert(
      "CVS happy: logisticsId 寫回",
      result.logisticsId === "2026052012345678",
    );
    assert(
      "CVS happy: subType 透傳",
      result.logisticsSubType === "UNIMARTC2C",
    );
  }
  // 驗證 fetch 真的被打到對的 endpoint
  assert(
    "fetch URL 走 /Express/Create",
    capture.url?.endsWith("/Express/Create") === true,
  );
  assert(
    "fetch body 含 LogisticsSubType=UNIMARTC2C",
    capture.body?.includes("LogisticsSubType=UNIMARTC2C") === true,
  );
  assert(
    "fetch body 含 ReceiverStoreID=" + seven.storeId,
    capture.body?.includes(`ReceiverStoreID=${seven.storeId}`) === true,
  );
  assert(
    "fetch body 含 CheckMacValue",
    capture.body?.includes("CheckMacValue=") === true,
  );
}

async function testPerformShipmentHappyHome() {
  console.log("\n[B'] performCreateShipment happy — Home");

  const capture: { url?: string; body?: string } = {};
  const mockResponse =
    "RtnCode=1&RtnMsg=OK&AllPayLogisticsID=2026052099887766&LogisticsType=Home&GoodsAmount=1200";

  const result = await performCreateShipment(
    {
      config: cfg,
      sender: {
        name: "暮焙",
        cellPhone: "0912345678",
        zipCode: "10617",
        address: "10617 台北市大安區羅斯福路四段 1 號",
      },
      orderNumber: "ORD-20260520-0002",
      total: 1200,
      goodsName: "耶加雪菲×1, 肯亞 AA×1",
      recipientName: "李小姐",
      recipientPhone: "0987654321",
      recipientEmail: "buyer2@example.com",
      logisticsType: "Home",
      logisticsSubType: "TCAT",
      shippingZipCode: "10683",
      shippingAddress: "台北市大安區仁愛路四段 1 號",
      now: new Date("2026-05-20T06:00:00Z"),
    },
    makeMockFetch(mockResponse, { capture }),
  );

  assert("Home happy: ok === true", result.ok === true);
  if (result.ok) {
    assert(
      "Home happy: logisticsId 寫回",
      result.logisticsId === "2026052099887766",
    );
  }
  assert(
    "Home body 含 ReceiverAddress 仁愛路",
    capture.body?.includes("%E4%BB%81%E6%84%9B%E8%B7%AF") === true ||
      capture.body?.includes("仁愛路") === true,
  );
  assert(
    "Home body 含 SenderZipCode=10617",
    capture.body?.includes("SenderZipCode=10617") === true,
  );
  assert(
    "Home body 不含 ReceiverStoreID",
    capture.body?.includes("ReceiverStoreID") !== true,
  );
}

// ============ [C] 失敗回應 ============

async function testPerformShipmentFail() {
  console.log("\n[C] performCreateShipment RtnCode != '1'");

  const result = await performCreateShipment(
    {
      config: cfg,
      sender: {
        name: "暮焙",
        cellPhone: "0912345678",
        zipCode: "10617",
        address: "10617 台北市大安區羅斯福路四段 1 號",
      },
      orderNumber: "ORD-20260520-0003",
      total: 500,
      goodsName: "test",
      recipientName: "test",
      recipientPhone: "0987654321",
      recipientEmail: "test@example.com",
      logisticsType: "CVS",
      logisticsSubType: "UNIMARTC2C",
      cvsStoreId: MOCK_STORES[0].storeId,
    },
    makeMockFetch("RtnCode=10100050&RtnMsg=收件人手機格式錯誤"),
  );

  assert("失敗回應: ok === false", result.ok === false);
  if (!result.ok) {
    assert(
      "錯誤訊息含 rtnMsg",
      result.error.includes("收件人手機格式錯誤"),
    );
    assert("錯誤訊息含 rtnCode", result.error.includes("10100050"));
  }
}

// ============ [D] fetch throw ============

async function testPerformShipmentFetchThrow() {
  console.log("\n[D] performCreateShipment fetch throw");

  const result = await performCreateShipment(
    {
      config: cfg,
      sender: {
        name: "暮焙",
        cellPhone: "0912345678",
        zipCode: "10617",
        address: "10617 台北市大安區羅斯福路四段 1 號",
      },
      orderNumber: "ORD-20260520-0004",
      total: 500,
      goodsName: "test",
      recipientName: "test",
      recipientPhone: "0987654321",
      recipientEmail: "test@example.com",
      logisticsType: "CVS",
      logisticsSubType: "UNIMARTC2C",
      cvsStoreId: MOCK_STORES[0].storeId,
    },
    makeThrowingFetch("ECONNREFUSED"),
  );

  assert("fetch throw: ok === false", result.ok === false);
  if (!result.ok) {
    assert("錯誤訊息含「連線失敗」", result.error.includes("連線失敗"));
    assert("錯誤訊息含 ECONNREFUSED", result.error.includes("ECONNREFUSED"));
  }
}

// ============ [E] buildGoodsName ============

function testBuildGoodsName() {
  console.log("\n[E] buildGoodsName");

  const name = buildGoodsName([
    { productName: "耶加雪菲", qty: 2 },
    { productName: "肯亞 AA", qty: 1 },
  ]);
  assert("buildGoodsName 串接", name === "耶加雪菲×2, 肯亞 AA×1");

  const single = buildGoodsName([{ productName: "test", qty: 5 }]);
  assert("單一品項 buildGoodsName", single === "test×5");

  const empty = buildGoodsName([]);
  assert("空陣列 buildGoodsName", empty === "");
}

// ============ [F] / [G] DB-level guard + write ============

async function testDbGuardAndWrite() {
  console.log("\n[F]/[G] DB-level guard + write logisticsId");

  // 建測試 user + address + product + 3 種狀態的 order
  const user = await prisma.user.create({
    data: {
      email: `${TEST_EMAIL_PREFIX}${Date.now()}@local`,
      name: "phase8c test",
      role: "CUSTOMER",
    },
  });
  const address = await prisma.address.create({
    data: {
      userId: user.id,
      recipient: "test",
      phone: "0900000000",
      zipCode: "100",
      city: "台北市",
      district: "中正區",
      street: "測試路 8c 號",
    },
  });
  const product = await prisma.product.findFirst({
    where: { isActive: true, price: { gt: 0 } },
    orderBy: { price: "desc" },
  });
  if (!product) {
    console.error("  ! 找不到 active product，跳過 [F]/[G]");
    await prisma.address.delete({ where: { id: address.id } });
    await prisma.user.delete({ where: { id: user.id } });
    return;
  }

  const createOrder = async (
    status: "PENDING" | "PAID" | "SHIPPED",
    extraData: Record<string, unknown> = {},
  ) => {
    const number = await prisma.$transaction(async (tx) => generateOrderNumber(tx));
    return prisma.order.create({
      data: {
        orderNumber: number,
        userId: user.id,
        addressId: address.id,
        shippingMethod: "CVS_711",
        paymentMethod: "BANK_TRANSFER",
        status,
        subtotal: product.price,
        shippingFee: 60,
        total: product.price + 60,
        recipientName: address.recipient,
        recipientPhone: address.phone,
        shippingZipCode: address.zipCode,
        shippingCity: address.city,
        shippingDistrict: address.district,
        shippingStreet: address.street,
        cvsStoreId: MOCK_STORES[0].storeId,
        cvsStoreName: MOCK_STORES[0].storeName,
        cvsAddress: MOCK_STORES[0].address,
        items: {
          create: [
            {
              productId: product.id,
              productName: product.name,
              productSlug: product.slug,
              unitPrice: product.price,
              qty: 1,
            },
          ],
        },
        ...extraData,
      },
    });
  };

  // 重現 createShipmentForOrder 內的 guard 邏輯
  const guard = (order: { status: string; logisticsId: string | null }): { ok: true } | { ok: false; reason: string } => {
    if (order.status !== "PAID") return { ok: false, reason: "NOT_PAID" };
    if (order.logisticsId) return { ok: false, reason: "ALREADY_HAS_LOGISTICS" };
    return { ok: true };
  };

  const pendingOrder = await createOrder("PENDING");
  assert(
    "PENDING order 被擋下",
    !guard(pendingOrder).ok &&
      (guard(pendingOrder) as { reason: string }).reason === "NOT_PAID",
  );

  const paidOrder = await createOrder("PAID", {
    paidAt: new Date(),
    paymentTradeNo: "TEST123",
  });
  assert("PAID + 無 logisticsId 通過 guard", guard(paidOrder).ok);

  const alreadyShippedOrder = await createOrder("PAID", {
    paidAt: new Date(),
    logisticsId: "EXISTING-123",
    logisticsSubType: "UNIMARTC2C",
  });
  assert(
    "PAID + 已有 logisticsId 被擋下",
    !guard(alreadyShippedOrder).ok &&
      (guard(alreadyShippedOrder) as { reason: string }).reason ===
        "ALREADY_HAS_LOGISTICS",
  );

  // [G] 寫入 logisticsId 後可以讀回
  await prisma.order.update({
    where: { id: paidOrder.id },
    data: {
      logisticsId: "NEW-LOGISTICS-001",
      logisticsSubType: "UNIMARTC2C",
    },
  });
  const reread = await prisma.order.findUnique({
    where: { id: paidOrder.id },
    select: { logisticsId: true, logisticsSubType: true },
  });
  assert("update 後 logisticsId 寫入", reread?.logisticsId === "NEW-LOGISTICS-001");
  assert("update 後 logisticsSubType 寫入", reread?.logisticsSubType === "UNIMARTC2C");

  // cleanup
  const orderIds = [pendingOrder.id, paidOrder.id, alreadyShippedOrder.id];
  await prisma.orderItem.deleteMany({
    where: { orderId: { in: orderIds } },
  });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.address.delete({ where: { id: address.id } });
  await prisma.user.delete({ where: { id: user.id } });
}

// ============ cleanup helper ============

async function cleanupStaleTestData() {
  const users = await prisma.user.findMany({
    where: { email: { startsWith: TEST_EMAIL_PREFIX } },
    select: { id: true },
  });
  if (users.length === 0) return;
  const userIds = users.map((u) => u.id);
  const orderIds = (
    await prisma.order.findMany({
      where: { userId: { in: userIds } },
      select: { id: true },
    })
  ).map((o) => o.id);
  if (orderIds.length > 0) {
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  }
  await prisma.address.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

// ============ main ============

async function main() {
  try {
    await cleanupStaleTestData();
    testMethodMapping();
    await testPerformShipmentHappyCvs();
    await testPerformShipmentHappyHome();
    await testPerformShipmentFail();
    await testPerformShipmentFetchThrow();
    testBuildGoodsName();
    await testDbGuardAndWrite();
  } finally {
    await cleanupStaleTestData();
    await prisma.$disconnect();
  }
  console.log(`\n總計 ${pass + fail} · 通過 ${pass} · 失敗 ${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
