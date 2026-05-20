// Phase 7 DB-level smoke test
// 涵蓋：
//   [A] tier 純函式（computeTier / previewTierDiscount / distanceToNextTier）
//   [B] applyPromoCode 拒絕條件邏輯重現（不呼叫 server action 避開 auth）
//   [C] placeOrder transaction promo 區塊重現（usage + usedCount + total + 重複使用）
//   [D] applyPaidEffects（累計 lifetimeSpent + 升等）
//
// 沿用 phase5a / phase5c / phase6d 風格：純函式 + Prisma 重現邏輯。

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { DiscountType } from "../generated/prisma/enums";
import {
  computeTier,
  previewTierDiscount,
  distanceToNextTier,
  TIER_THRESHOLDS,
  TIER_DISCOUNT_AMOUNT,
} from "../lib/tier";
import { previewDiscount } from "../lib/schemas/promo-code";
import { applyPaidEffects } from "../lib/order-paid-effects";
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

const TEST_PREFIX = "PH7-TEST-";
const TEST_USER_EMAIL = `${TEST_PREFIX}user@local`;
const TEST_RECIPIENT = `${TEST_PREFIX}recipient`;

async function cleanup() {
  // 順序：PromoCodeUsage → OrderItem → Order → Address → CartItem → Cart → PromoCode → User
  const testUser = await prisma.user.findUnique({
    where: { email: TEST_USER_EMAIL },
  });
  if (testUser) {
    await prisma.promoCodeUsage.deleteMany({ where: { userId: testUser.id } });
    await prisma.orderItem.deleteMany({
      where: { order: { userId: testUser.id } },
    });
    await prisma.order.deleteMany({ where: { userId: testUser.id } });
    await prisma.address.deleteMany({ where: { userId: testUser.id } });
    const cart = await prisma.cart.findUnique({
      where: { userId: testUser.id },
    });
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      await prisma.cart.delete({ where: { id: cart.id } });
    }
  }
  await prisma.promoCode.deleteMany({
    where: { code: { startsWith: TEST_PREFIX } },
  });
  await prisma.user.deleteMany({ where: { email: TEST_USER_EMAIL } });
}

// ============ [A] tier 純函式 ============

function testTierPureFunctions() {
  console.log("\n[A] tier 純函式");

  // computeTier 門檻邊界
  assert("[A] computeTier(0) === TIER_01", computeTier(0) === "TIER_01");
  assert("[A] computeTier(4999) === TIER_01", computeTier(4999) === "TIER_01");
  assert(
    "[A] computeTier(5000) === TIER_02（邊界）",
    computeTier(5000) === "TIER_02",
  );
  assert(
    "[A] computeTier(14999) === TIER_02",
    computeTier(14999) === "TIER_02",
  );
  assert(
    "[A] computeTier(15000) === TIER_03（邊界）",
    computeTier(15000) === "TIER_03",
  );
  assert(
    "[A] computeTier(99999) === TIER_03",
    computeTier(99999) === "TIER_03",
  );

  // previewTierDiscount
  assert(
    "[A] previewTierDiscount(TIER_01, 1000) === 0",
    previewTierDiscount("TIER_01", 1000) === 0,
  );
  assert(
    "[A] previewTierDiscount(TIER_02, 1000) === 80",
    previewTierDiscount("TIER_02", 1000) === 80,
  );
  assert(
    "[A] previewTierDiscount(TIER_03, 50) === 50（截斷至 subtotal）",
    previewTierDiscount("TIER_03", 50) === 50,
  );
  assert(
    "[A] previewTierDiscount(TIER_03, 10000) === 200",
    previewTierDiscount("TIER_03", 10000) === 200,
  );

  // distanceToNextTier
  const fromZero = distanceToNextTier(0);
  assert(
    "[A] distanceToNextTier(0).nextTier === TIER_02 + remaining=5000",
    fromZero?.nextTier === "TIER_02" && fromZero?.remaining === 5000,
  );
  const atTop = distanceToNextTier(15000);
  assert("[A] distanceToNextTier(15000) === null（最高 tier）", atTop === null);

  // sanity check constants
  assert(
    "[A] TIER_THRESHOLDS / TIER_DISCOUNT_AMOUNT shape",
    TIER_THRESHOLDS.TIER_02 === 5000 &&
      TIER_THRESHOLDS.TIER_03 === 15000 &&
      TIER_DISCOUNT_AMOUNT.TIER_02 === 80 &&
      TIER_DISCOUNT_AMOUNT.TIER_03 === 200,
  );
}

// ============ [B] applyPromoCode 拒絕條件邏輯重現 ============
//
// 不能直接呼叫 applyPromoCode（內部用 auth()，smoke test 無 session）。
// 改重現其邏輯流程，純跑 DB + previewDiscount。

type PromoApplyReason =
  | "NOT_FOUND"
  | "ALREADY_USED"
  | "INACTIVE"
  | "MIN_SUBTOTAL"
  | "EXPIRED"
  | "EXHAUSTED";

async function tryApplyPromo(
  userId: string,
  rawCode: string,
  subtotal: number,
): Promise<{ ok: true; discount: number } | { ok: false; reason: PromoApplyReason | string }> {
  const code = rawCode.trim().toUpperCase();
  if (code.length === 0) return { ok: false, reason: "EMPTY" };

  const promo = await prisma.promoCode.findUnique({ where: { code } });
  if (!promo) return { ok: false, reason: "NOT_FOUND" };

  const usage = await prisma.promoCodeUsage.findUnique({
    where: { userId_promoCodeId: { userId, promoCodeId: promo.id } },
  });
  if (usage) return { ok: false, reason: "ALREADY_USED" };

  const result = previewDiscount(subtotal, promo);
  if (!result.ok) {
    // 根據 previewDiscount 的 reason 字串分類
    if (result.reason.includes("停用")) return { ok: false, reason: "INACTIVE" };
    if (result.reason.includes("最低消費"))
      return { ok: false, reason: "MIN_SUBTOTAL" };
    if (result.reason.includes("過期")) return { ok: false, reason: "EXPIRED" };
    if (result.reason.includes("上限"))
      return { ok: false, reason: "EXHAUSTED" };
    return { ok: false, reason: result.reason };
  }
  return { ok: true, discount: result.discount };
}

async function testApplyPromoRejections(userId: string) {
  console.log("\n[B] applyPromoCode 拒絕條件邏輯重現");

  // 建兩組測試 promo
  const promoOk = await prisma.promoCode.create({
    data: {
      code: `${TEST_PREFIX}OK`,
      discountType: DiscountType.PERCENT,
      discountValue: 10,
      minSubtotal: 500,
      isActive: true,
    },
  });
  const promoInactive = await prisma.promoCode.create({
    data: {
      code: `${TEST_PREFIX}INACTIVE`,
      discountType: DiscountType.PERCENT,
      discountValue: 20,
      isActive: false,
    },
  });

  // B1. 找不到 code
  const r1 = await tryApplyPromo(userId, `${TEST_PREFIX}DOESNOTEXIST`, 1000);
  assert(
    "[B1] 找不到 code → NOT_FOUND",
    !r1.ok && r1.reason === "NOT_FOUND",
  );

  // B2. inactive
  const r2 = await tryApplyPromo(userId, promoInactive.code, 1000);
  assert("[B2] inactive promo → INACTIVE", !r2.ok && r2.reason === "INACTIVE");

  // B3. minSubtotal 不足（promoOk 要求 500）
  const r3 = await tryApplyPromo(userId, promoOk.code, 100);
  assert(
    "[B3] subtotal < minSubtotal → MIN_SUBTOTAL",
    !r3.ok && r3.reason === "MIN_SUBTOTAL",
  );

  // B4. 預先寫一筆 PromoCodeUsage → 再試應拒絕
  await prisma.promoCodeUsage.create({
    data: { userId, promoCodeId: promoOk.id },
  });
  const r4 = await tryApplyPromo(userId, promoOk.code, 1000);
  assert(
    "[B4] 已使用過 → ALREADY_USED",
    !r4.ok && r4.reason === "ALREADY_USED",
  );

  // 清掉 usage 給 [C] 用
  await prisma.promoCodeUsage.deleteMany({ where: { userId } });
}

// ============ [C] placeOrder transaction promo 區塊重現 ============
//
// 重現 placeOrder transaction 內 promo 區塊（不打 cart 系統，直接傳 subtotal）。
// 測：成功 → PromoCodeUsage 寫入 + usedCount++ + discountAmount 寫入 Order + total 正確；
//     重試 → 撞 unique 或 PROMO_ALREADY_USED throw。

async function placeOrderPromoCore(opts: {
  userId: string;
  addressId: string;
  productId: string;
  productName: string;
  productSlug: string;
  unitPrice: number;
  qty: number;
  shippingFee: number;
  promoCode: string;
  tierDiscountAmount: number;
}): Promise<
  | { ok: true; orderId: string; orderNumber: string; total: number; discountAmount: number }
  | { ok: false; reason: string }
> {
  const subtotal = opts.unitPrice * opts.qty;
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1) 重驗 promo
      const promo = await tx.promoCode.findUnique({
        where: { code: opts.promoCode },
      });
      if (!promo) throw new Error("PROMO_NOT_FOUND");

      const usage = await tx.promoCodeUsage.findUnique({
        where: {
          userId_promoCodeId: { userId: opts.userId, promoCodeId: promo.id },
        },
      });
      if (usage) throw new Error("PROMO_ALREADY_USED");

      const preview = previewDiscount(subtotal, promo);
      if (!preview.ok) throw new Error(`PROMO_INVALID:${preview.reason}`);

      const discountAmount = preview.discount;
      const totalDiscount = discountAmount + opts.tierDiscountAmount;
      const discountedSubtotal = Math.max(0, subtotal - totalDiscount);
      const total = discountedSubtotal + opts.shippingFee;

      const number = await generateOrderNumber(tx);
      const created = await tx.order.create({
        data: {
          orderNumber: number,
          userId: opts.userId,
          addressId: opts.addressId,
          shippingMethod: "CVS_711",
          paymentMethod: "CREDIT_CARD",
          subtotal,
          shippingFee: opts.shippingFee,
          promoCodeId: promo.id,
          discountAmount,
          tierDiscountAmount: opts.tierDiscountAmount,
          total,
          recipientName: TEST_RECIPIENT,
          recipientPhone: "0900000000",
          shippingZipCode: "100",
          shippingCity: "台北市",
          shippingDistrict: "中正區",
          shippingStreet: "驗收街 7 號",
          items: {
            create: [
              {
                productId: opts.productId,
                productName: opts.productName,
                productSlug: opts.productSlug,
                unitPrice: opts.unitPrice,
                qty: opts.qty,
              },
            ],
          },
        },
      });

      await tx.promoCodeUsage.create({
        data: {
          userId: opts.userId,
          promoCodeId: promo.id,
          orderId: created.id,
        },
      });
      await tx.promoCode.update({
        where: { id: promo.id },
        data: { usedCount: { increment: 1 } },
      });

      return {
        orderId: created.id,
        orderNumber: number,
        total,
        discountAmount,
      };
    });
    return { ok: true, ...result };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    return { ok: false, reason: msg };
  }
}

async function testPlaceOrderPromoFlow(opts: {
  userId: string;
  addressId: string;
  productId: string;
  productName: string;
  productSlug: string;
  unitPrice: number;
}) {
  console.log("\n[C] placeOrder transaction promo 區塊重現");

  // 建一個 PERCENT 15% promo
  const promo = await prisma.promoCode.create({
    data: {
      code: `${TEST_PREFIX}FIRST15`,
      discountType: DiscountType.PERCENT,
      discountValue: 15,
      minSubtotal: 0,
      isActive: true,
    },
  });
  assert("[C0] promo usedCount 初始為 0", promo.usedCount === 0);

  // 第一次：應成功
  const subtotal = opts.unitPrice * 2;
  const expectedDiscount = Math.floor((subtotal * 15) / 100);
  const shippingFee = 80;
  const tierDiscount = 0;
  const expectedTotal = subtotal - expectedDiscount - tierDiscount + shippingFee;

  const r1 = await placeOrderPromoCore({
    userId: opts.userId,
    addressId: opts.addressId,
    productId: opts.productId,
    productName: opts.productName,
    productSlug: opts.productSlug,
    unitPrice: opts.unitPrice,
    qty: 2,
    shippingFee,
    promoCode: promo.code,
    tierDiscountAmount: tierDiscount,
  });
  assert("[C1] 第一次使用 promo 成功", r1.ok);
  if (r1.ok) {
    assert(
      "[C1] discountAmount 寫到 Order",
      r1.discountAmount === expectedDiscount,
    );
    assert(
      "[C1] total = subtotal + shippingFee - discount - tierDiscount",
      r1.total === expectedTotal,
    );

    // 撈 Order 確認 promoCodeId / discountAmount / tierDiscountAmount
    const order = await prisma.order.findUnique({
      where: { id: r1.orderId },
      select: {
        promoCodeId: true,
        discountAmount: true,
        tierDiscountAmount: true,
        total: true,
      },
    });
    assert(
      "[C1] Order.promoCodeId 寫入正確",
      order?.promoCodeId === promo.id,
    );
    assert(
      "[C1] Order.discountAmount 寫入正確",
      order?.discountAmount === expectedDiscount,
    );
    assert(
      "[C1] Order.tierDiscountAmount === 0",
      order?.tierDiscountAmount === 0,
    );
  }

  // PromoCodeUsage 有寫入
  const usage = await prisma.promoCodeUsage.findUnique({
    where: {
      userId_promoCodeId: { userId: opts.userId, promoCodeId: promo.id },
    },
  });
  assert("[C2] PromoCodeUsage 寫入", !!usage);

  // PromoCode.usedCount 變 1
  const promoAfter = await prisma.promoCode.findUnique({
    where: { id: promo.id },
  });
  assert("[C2] PromoCode.usedCount 從 0 → 1", promoAfter?.usedCount === 1);

  // 第二次（同 user 同 promo）：應該 throw PROMO_ALREADY_USED
  const r2 = await placeOrderPromoCore({
    userId: opts.userId,
    addressId: opts.addressId,
    productId: opts.productId,
    productName: opts.productName,
    productSlug: opts.productSlug,
    unitPrice: opts.unitPrice,
    qty: 1,
    shippingFee,
    promoCode: promo.code,
    tierDiscountAmount: 0,
  });
  assert(
    "[C3] 同 user 重複用同 promo → PROMO_ALREADY_USED",
    !r2.ok && r2.reason === "PROMO_ALREADY_USED",
  );

  // 確認 usedCount 沒被誤遞增
  const promoAfter2 = await prisma.promoCode.findUnique({
    where: { id: promo.id },
  });
  assert(
    "[C3] usedCount 仍是 1（rollback 後沒遞增）",
    promoAfter2?.usedCount === 1,
  );

  // 同時測 tierDiscountAmount 一起寫入 — 開新 promo 跑 tier 折抵的 happy path
  // 此處要新 user 避免 promoCodeUsage unique 衝突 → 直接做另一筆訂單但用新 code 跳過 usage 衝突
  const promoB = await prisma.promoCode.create({
    data: {
      code: `${TEST_PREFIX}TIERMIX`,
      discountType: DiscountType.FIXED,
      discountValue: 100,
      minSubtotal: 0,
      isActive: true,
    },
  });
  const tierDiscountB = 80;
  const qtyB = 3;
  const subtotalB = opts.unitPrice * qtyB;
  const expectedDiscountB = Math.min(100, subtotalB);
  const expectedTotalB =
    subtotalB - expectedDiscountB - tierDiscountB + shippingFee;

  const r3 = await placeOrderPromoCore({
    userId: opts.userId,
    addressId: opts.addressId,
    productId: opts.productId,
    productName: opts.productName,
    productSlug: opts.productSlug,
    unitPrice: opts.unitPrice,
    qty: qtyB,
    shippingFee,
    promoCode: promoB.code,
    tierDiscountAmount: tierDiscountB,
  });
  assert("[C4] promo + tier 混合可順利建單", r3.ok);
  if (r3.ok) {
    assert(
      "[C4] total = subtotal - promoDiscount - tierDiscount + shippingFee",
      r3.total === expectedTotalB,
    );
    const orderB = await prisma.order.findUnique({
      where: { id: r3.orderId },
      select: { tierDiscountAmount: true, discountAmount: true },
    });
    assert(
      "[C4] Order.tierDiscountAmount === 80",
      orderB?.tierDiscountAmount === 80,
    );
    assert(
      "[C4] Order.discountAmount === 100 (FIXED)",
      orderB?.discountAmount === expectedDiscountB,
    );
  }
}

// ============ [D] applyPaidEffects 累計 + 升等 ============

async function testApplyPaidEffects(userId: string) {
  console.log("\n[D] applyPaidEffects 累計 + 升等");

  // 重設 user lifetimeSpent=0, tier=TIER_01
  await prisma.user.update({
    where: { id: userId },
    data: { lifetimeSpent: 0, tier: "TIER_01" },
  });

  // D1. orderTotal=4000 → lifetimeSpent=4000, tier=TIER_01（未達 5000）
  const r1 = await prisma.$transaction(async (tx) =>
    applyPaidEffects(tx, { userId, orderTotal: 4000 }),
  );
  assert(
    "[D1] applyPaidEffects(4000) → lifetimeSpent=4000",
    r1.newLifetimeSpent === 4000,
  );
  assert("[D1] tier 仍是 TIER_01", r1.newTier === "TIER_01");
  let userRow = await prisma.user.findUnique({
    where: { id: userId },
    select: { lifetimeSpent: true, tier: true },
  });
  assert(
    "[D1] DB 寫入 lifetimeSpent=4000 + tier=TIER_01",
    userRow?.lifetimeSpent === 4000 && userRow?.tier === "TIER_01",
  );

  // D2. 再加 1500 → 5500, 升等 TIER_02
  const r2 = await prisma.$transaction(async (tx) =>
    applyPaidEffects(tx, { userId, orderTotal: 1500 }),
  );
  assert(
    "[D2] applyPaidEffects(+1500) → lifetimeSpent=5500",
    r2.newLifetimeSpent === 5500,
  );
  assert("[D2] tier 升為 TIER_02", r2.newTier === "TIER_02");
  userRow = await prisma.user.findUnique({
    where: { id: userId },
    select: { lifetimeSpent: true, tier: true },
  });
  assert(
    "[D2] DB 寫入 lifetimeSpent=5500 + tier=TIER_02",
    userRow?.lifetimeSpent === 5500 && userRow?.tier === "TIER_02",
  );

  // D3. 再加 10000 → 15500, 升等 TIER_03
  const r3 = await prisma.$transaction(async (tx) =>
    applyPaidEffects(tx, { userId, orderTotal: 10000 }),
  );
  assert(
    "[D3] applyPaidEffects(+10000) → lifetimeSpent=15500",
    r3.newLifetimeSpent === 15500,
  );
  assert("[D3] tier 升為 TIER_03", r3.newTier === "TIER_03");
  userRow = await prisma.user.findUnique({
    where: { id: userId },
    select: { lifetimeSpent: true, tier: true },
  });
  assert(
    "[D3] DB 寫入 lifetimeSpent=15500 + tier=TIER_03",
    userRow?.lifetimeSpent === 15500 && userRow?.tier === "TIER_03",
  );

  // D4. 「呼叫端責任」模擬：建一筆 PENDING Order → 模擬轉 PAID 時呼叫一次 applyPaidEffects
  //     重點：helper 本身不擋多次呼叫；正確 flow 是呼叫端只在「真的 PENDING/non-PAID → PAID」時呼叫。
  await prisma.user.update({
    where: { id: userId },
    data: { lifetimeSpent: 0, tier: "TIER_01" },
  });

  const address = await prisma.address.findFirst({ where: { userId } });
  if (!address) throw new Error("D4: missing test address");
  const product = await prisma.product.findFirst({
    where: { isActive: true, price: { gt: 0 } },
  });
  if (!product) throw new Error("D4: no active product");

  const number = await prisma.$transaction(async (tx) => generateOrderNumber(tx));
  const pendingOrder = await prisma.order.create({
    data: {
      orderNumber: number,
      userId,
      addressId: address.id,
      shippingMethod: "CVS_711",
      paymentMethod: "BANK_TRANSFER",
      status: "PENDING",
      subtotal: 6000,
      shippingFee: 0,
      total: 6000,
      recipientName: TEST_RECIPIENT,
      recipientPhone: "0900000000",
      shippingZipCode: "100",
      shippingCity: "台北市",
      shippingDistrict: "中正區",
      shippingStreet: "驗收街 7 號",
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

  // 模擬「PENDING → PAID」單次轉換 + 呼叫一次 applyPaidEffects
  const r4 = await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: pendingOrder.id },
      data: { status: "PAID", paidAt: new Date() },
    });
    return applyPaidEffects(tx, {
      userId,
      orderTotal: pendingOrder.total,
    });
  });
  assert(
    "[D4] 單次 PENDING→PAID 呼叫 applyPaidEffects → lifetimeSpent=6000",
    r4.newLifetimeSpent === 6000,
  );
  assert("[D4] tier 升 TIER_02", r4.newTier === "TIER_02");

  // 不再呼叫第二次（重點：PAID→SHIPPED→DELIVERED 不應重複累計）
  // 模擬 SHIPPED 推進但不再呼叫 applyPaidEffects
  await prisma.order.update({
    where: { id: pendingOrder.id },
    data: { status: "SHIPPED", shippedAt: new Date() },
  });
  const userRowFinal = await prisma.user.findUnique({
    where: { id: userId },
    select: { lifetimeSpent: true, tier: true },
  });
  assert(
    "[D5] SHIPPED 推進後 lifetimeSpent 不變（呼叫端只在 PAID 時 trigger）",
    userRowFinal?.lifetimeSpent === 6000 && userRowFinal?.tier === "TIER_02",
  );
}

// ============ main ============

async function main() {
  // 起手 cleanup
  await cleanup();

  // 建測試 user + address
  const user = await prisma.user.create({
    data: {
      email: TEST_USER_EMAIL,
      name: "Phase 7 Test User",
      role: "CUSTOMER",
      tier: "TIER_01",
      lifetimeSpent: 0,
    },
  });
  const address = await prisma.address.create({
    data: {
      userId: user.id,
      recipient: TEST_RECIPIENT,
      phone: "0900000000",
      zipCode: "100",
      city: "台北市",
      district: "中正區",
      street: "驗收街 7 號",
    },
  });
  // 找一個 active 且 price > 0 的 product 作為 OrderItem snapshot
  const product = await prisma.product.findFirst({
    where: { isActive: true, price: { gt: 0 } },
    orderBy: { price: "desc" },
  });
  if (!product) throw new Error("active product missing — run pnpm prisma db seed");

  try {
    testTierPureFunctions();
    await testApplyPromoRejections(user.id);
    await testPlaceOrderPromoFlow({
      userId: user.id,
      addressId: address.id,
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      unitPrice: product.price,
    });
    await testApplyPaidEffects(user.id);
  } finally {
    await cleanup();
  }

  console.log(`\n─────────────────────────────────────`);
  console.log(
    `Phase 7 驗收：總計 ${pass + fail} · 通過 ${pass} · 失敗 ${fail}`,
  );
  process.exit(fail > 0 ? 1 : 0);
}

main()
  .catch(async (e) => {
    console.error("\n[FATAL]", e);
    try {
      await cleanup();
    } catch {}
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
