// Phase 8b DB-level smoke test
// 涵蓋：
//   [A] CVS 校驗邏輯（重現 placeOrder 內的 CVS 必填 + chain 對齊 + storeId 真實性檢查）
//   [B] HOME_DELIVERY 拒絕帶店資訊
//   [C] placeOrder 直接寫入 Order 的 cvs 三欄 + null 寫入（HOME_DELIVERY）
//   [D] URL searchParam round-trip：模擬 ShippingForm 產出的 query string → payment page 解析還原
//
// 不開瀏覽器、不打 server action（避開 auth() session 限制）。重現 lib + placeOrder 內邏輯。

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { findStoreById, MOCK_STORES } from "../lib/logistics/store-mock";
import { generateOrderNumber } from "../lib/order-number";

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

const TEST_EMAIL_PREFIX = "ph8b-test-";

// ============ 重現 placeOrder 內的 CVS 驗證邏輯 ============

type CvsValidateInput = {
  shippingMethod: "CVS_711" | "CVS_FAMILY" | "HOME_DELIVERY";
  cvsStoreId?: string;
  cvsStoreName?: string;
  cvsAddress?: string;
};
type CvsValidateResult = { ok: true } | { ok: false; error: string };

function validateCvsInput(input: CvsValidateInput): CvsValidateResult {
  const isCvs =
    input.shippingMethod === "CVS_711" || input.shippingMethod === "CVS_FAMILY";
  if (isCvs) {
    if (!input.cvsStoreId || !input.cvsStoreName || !input.cvsAddress) {
      return { ok: false, error: "超商取貨必須選擇門市。" };
    }
    const known = findStoreById(input.cvsStoreId);
    if (!known) {
      return { ok: false, error: "找不到此門市，請重新選擇。" };
    }
    const expectedChain =
      input.shippingMethod === "CVS_711" ? "UNIMART" : "FAMILY";
    if (known.chain !== expectedChain) {
      return { ok: false, error: "門市與超商通路不符，請重新選擇。" };
    }
  } else {
    if (input.cvsStoreId || input.cvsStoreName || input.cvsAddress) {
      return { ok: false, error: "宅配方式不需選擇門市。" };
    }
  }
  return { ok: true };
}

// ============ [A] CVS 校驗 ============

function testCvsValidation() {
  console.log("\n[A] CVS 校驗邏輯");

  const seven = MOCK_STORES.find((s) => s.chain === "UNIMART")!;
  const family = MOCK_STORES.find((s) => s.chain === "FAMILY")!;

  // 7-11 + 7-11 店 → OK
  assert(
    "CVS_711 + UNIMART 店 → ok",
    validateCvsInput({
      shippingMethod: "CVS_711",
      cvsStoreId: seven.storeId,
      cvsStoreName: seven.storeName,
      cvsAddress: seven.address,
    }).ok,
  );

  // 全家 + 全家店 → OK
  assert(
    "CVS_FAMILY + FAMILY 店 → ok",
    validateCvsInput({
      shippingMethod: "CVS_FAMILY",
      cvsStoreId: family.storeId,
      cvsStoreName: family.storeName,
      cvsAddress: family.address,
    }).ok,
  );

  // CVS 缺店 → 拒絕
  const noStore = validateCvsInput({ shippingMethod: "CVS_711" });
  assert("CVS_711 缺店資訊 → 拒絕", !noStore.ok);
  if (!noStore.ok) {
    assert("錯誤訊息含「選擇門市」", noStore.error.includes("選擇門市"));
  }

  // CVS 三欄缺一 → 拒絕
  const partialStore = validateCvsInput({
    shippingMethod: "CVS_711",
    cvsStoreId: seven.storeId,
    cvsStoreName: seven.storeName,
    // 故意缺 cvsAddress
  });
  assert("CVS 三欄缺一 → 拒絕", !partialStore.ok);

  // CVS + 不存在 storeId → 拒絕
  const unknownStore = validateCvsInput({
    shippingMethod: "CVS_711",
    cvsStoreId: "999999",
    cvsStoreName: "Fake 店",
    cvsAddress: "假地址",
  });
  assert("CVS + 不存在 storeId → 拒絕", !unknownStore.ok);
  if (!unknownStore.ok) {
    assert("錯誤訊息含「找不到」", unknownStore.error.includes("找不到"));
  }

  // 7-11 method + 全家店 → 拒絕（chain 不對齊）
  const crossChain = validateCvsInput({
    shippingMethod: "CVS_711",
    cvsStoreId: family.storeId,
    cvsStoreName: family.storeName,
    cvsAddress: family.address,
  });
  assert("CVS_711 + FAMILY 店 → 拒絕", !crossChain.ok);
  if (!crossChain.ok) {
    assert("錯誤訊息含「通路不符」", crossChain.error.includes("通路不符"));
  }

  // 全家 method + 7-11 店 → 拒絕
  const reverseCross = validateCvsInput({
    shippingMethod: "CVS_FAMILY",
    cvsStoreId: seven.storeId,
    cvsStoreName: seven.storeName,
    cvsAddress: seven.address,
  });
  assert("CVS_FAMILY + UNIMART 店 → 拒絕", !reverseCross.ok);
}

// ============ [B] HOME_DELIVERY 排除 ============

function testHomeDeliveryRejectsStore() {
  console.log("\n[B] HOME_DELIVERY 拒絕帶店資訊");

  // 不帶 → OK
  assert(
    "HOME_DELIVERY 無店 → ok",
    validateCvsInput({ shippingMethod: "HOME_DELIVERY" }).ok,
  );

  const seven = MOCK_STORES[0];

  // 帶 storeId → 拒絕
  const withId = validateCvsInput({
    shippingMethod: "HOME_DELIVERY",
    cvsStoreId: seven.storeId,
  });
  assert("HOME_DELIVERY + storeId → 拒絕", !withId.ok);
  if (!withId.ok) {
    assert(
      "錯誤訊息含「不需選擇門市」",
      withId.error.includes("不需選擇門市"),
    );
  }

  // 帶 storeName → 拒絕
  assert(
    "HOME_DELIVERY + storeName → 拒絕",
    !validateCvsInput({
      shippingMethod: "HOME_DELIVERY",
      cvsStoreName: "fake",
    }).ok,
  );

  // 帶 storeAddress → 拒絕
  assert(
    "HOME_DELIVERY + storeAddress → 拒絕",
    !validateCvsInput({
      shippingMethod: "HOME_DELIVERY",
      cvsAddress: "fake",
    }).ok,
  );
}

// ============ [C] Order.create 寫入 3 欄 ============

async function testOrderCreate() {
  console.log("\n[C] Order 寫入 cvs 三欄");

  // 建測試 user + address + product
  const user = await prisma.user.create({
    data: {
      email: `${TEST_EMAIL_PREFIX}${Date.now()}@local`,
      name: "phase8b test",
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
      street: "測試路 8b 號",
    },
  });
  const product = await prisma.product.findFirst({
    where: { isActive: true, price: { gt: 0 } },
    orderBy: { price: "desc" },
  });
  if (!product) {
    console.error("  ! 找不到 active product，跳過 [C]");
    await prisma.address.delete({ where: { id: address.id } });
    await prisma.user.delete({ where: { id: user.id } });
    return;
  }

  const seven = MOCK_STORES.find((s) => s.chain === "UNIMART")!;

  // [C1] 建 CVS 訂單寫入 3 欄
  const cvsOrder = await prisma.$transaction(async (tx) => {
    const number = await generateOrderNumber(tx);
    return tx.order.create({
      data: {
        orderNumber: number,
        userId: user.id,
        addressId: address.id,
        shippingMethod: "CVS_711",
        paymentMethod: "BANK_TRANSFER",
        subtotal: product.price,
        shippingFee: 60,
        total: product.price + 60,
        recipientName: address.recipient,
        recipientPhone: address.phone,
        shippingZipCode: address.zipCode,
        shippingCity: address.city,
        shippingDistrict: address.district,
        shippingStreet: address.street,
        cvsStoreId: seven.storeId,
        cvsStoreName: seven.storeName,
        cvsAddress: seven.address,
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
      },
    });
  });
  assert("CVS Order: cvsStoreId 寫入", cvsOrder.cvsStoreId === seven.storeId);
  assert("CVS Order: cvsStoreName 寫入", cvsOrder.cvsStoreName === seven.storeName);
  assert("CVS Order: cvsAddress 寫入", cvsOrder.cvsAddress === seven.address);
  assert("CVS Order: logisticsId 仍是 null（8a 預設）", cvsOrder.logisticsId === null);

  // [C2] HOME_DELIVERY 訂單，cvs 三欄都 null
  const homeOrder = await prisma.$transaction(async (tx) => {
    const number = await generateOrderNumber(tx);
    return tx.order.create({
      data: {
        orderNumber: number,
        userId: user.id,
        addressId: address.id,
        shippingMethod: "HOME_DELIVERY",
        paymentMethod: "BANK_TRANSFER",
        subtotal: product.price,
        shippingFee: 100,
        total: product.price + 100,
        recipientName: address.recipient,
        recipientPhone: address.phone,
        shippingZipCode: address.zipCode,
        shippingCity: address.city,
        shippingDistrict: address.district,
        shippingStreet: address.street,
        cvsStoreId: null,
        cvsStoreName: null,
        cvsAddress: null,
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
      },
    });
  });
  assert("HOME Order: cvsStoreId === null", homeOrder.cvsStoreId === null);
  assert("HOME Order: cvsStoreName === null", homeOrder.cvsStoreName === null);
  assert("HOME Order: cvsAddress === null", homeOrder.cvsAddress === null);

  // cleanup
  await prisma.orderItem.deleteMany({
    where: { orderId: { in: [cvsOrder.id, homeOrder.id] } },
  });
  await prisma.order.deleteMany({
    where: { id: { in: [cvsOrder.id, homeOrder.id] } },
  });
  await prisma.address.delete({ where: { id: address.id } });
  await prisma.user.delete({ where: { id: user.id } });
}

// ============ [D] URL searchParam round-trip ============

function testUrlRoundTrip() {
  console.log("\n[D] URL searchParam round-trip");

  const seven = MOCK_STORES.find((s) => s.chain === "UNIMART")!;

  // 模擬 ShippingForm 產出的 URL
  const params = new URLSearchParams({
    addressId: "addr_xxx",
    shipping: "CVS_711",
    cvsStoreId: seven.storeId,
    cvsStoreName: seven.storeName,
    cvsAddress: seven.address,
  });
  const url = `/checkout/payment?${params.toString()}`;
  assert("URL 含 cvsStoreId", url.includes(`cvsStoreId=${seven.storeId}`));

  // 重新 parse（模擬 payment page 解析）
  const parsed = new URL(`https://example.com${url}`);
  const cvsStoreId = parsed.searchParams.get("cvsStoreId");
  const cvsStoreName = parsed.searchParams.get("cvsStoreName");
  const cvsAddress = parsed.searchParams.get("cvsAddress");
  assert("parse: cvsStoreId 還原", cvsStoreId === seven.storeId);
  assert("parse: cvsStoreName 還原（中文不破壞）", cvsStoreName === seven.storeName);
  assert("parse: cvsAddress 還原", cvsAddress === seven.address);

  // 含特殊字元（地址有空格 + 中文）的 store 也能 round-trip
  const family = MOCK_STORES.find(
    (s) => s.chain === "FAMILY" && s.storeName.includes("松菸"),
  );
  if (family) {
    const p2 = new URLSearchParams({
      cvsStoreId: family.storeId,
      cvsStoreName: family.storeName,
      cvsAddress: family.address,
    });
    const url2 = `https://example.com/?${p2.toString()}`;
    const back = new URL(url2);
    assert(
      "URL encode/decode：中文店名 round-trip",
      back.searchParams.get("cvsStoreName") === family.storeName,
    );
    assert(
      "URL encode/decode：含空格地址 round-trip",
      back.searchParams.get("cvsAddress") === family.address,
    );
  }
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
    testCvsValidation();
    testHomeDeliveryRejectsStore();
    await testOrderCreate();
    testUrlRoundTrip();
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
