// Phase 5c DB-level smoke test
// 涵蓋：
//   [A] promoCodeFormSchema + previewDiscount + getPromoCodeStatus 純函式
//   [B] PromoCode CRUD DB（建/重/改/toggle/code unique 衝突）
//   [C] previewDiscount 整合 DB row（撈 seed 的 SUMMER15 / FREESHIP200 跑各情境）

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { DiscountType } from "../generated/prisma/enums";
import {
  promoCodeFormSchema,
  previewDiscount,
  getPromoCodeStatus,
  type PromoCodeFormInput,
} from "../lib/schemas/promo-code";

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

const TEST_CODE_PREFIX = "PHASE5C-TEST-";

async function cleanupTestPromos() {
  await prisma.promoCode.deleteMany({
    where: { code: { startsWith: TEST_CODE_PREFIX } },
  });
}

// ============ [A] schema + pure helpers ============

function testSchemaAndHelpers() {
  console.log("\n[A] promoCodeFormSchema + previewDiscount + getPromoCodeStatus");

  const valid: PromoCodeFormInput = {
    code: "TESTCODE",
    description: "test",
    discountType: "PERCENT",
    discountValue: 15,
    minSubtotal: 0,
    maxUses: 100,
    startsAt: "",
    endsAt: "",
    isActive: true,
  };

  // happy path
  assert("happy path parse 成功", promoCodeFormSchema.safeParse(valid).success);

  // code 格式
  assert(
    "code 含小寫擋下",
    !promoCodeFormSchema.safeParse({ ...valid, code: "summer15" }).success,
  );
  assert(
    "code 太短擋下",
    !promoCodeFormSchema.safeParse({ ...valid, code: "ABC" }).success,
  );
  assert(
    "code 含底線擋下",
    !promoCodeFormSchema.safeParse({ ...valid, code: "FOO_BAR" }).success,
  );

  // PERCENT > 100 擋下
  assert(
    "PERCENT discountValue > 100 擋下",
    !promoCodeFormSchema.safeParse({ ...valid, discountValue: 150 }).success,
  );

  // FIXED 可以 > 100
  assert(
    "FIXED discountValue 5000 OK",
    promoCodeFormSchema.safeParse({
      ...valid,
      discountType: "FIXED",
      discountValue: 5000,
    }).success,
  );

  // endsAt < startsAt 擋下
  const futureStart = new Date(Date.now() + 86_400_000);
  const earlyEnd = new Date(Date.now() + 3_600_000);
  assert(
    "endsAt < startsAt 擋下",
    !promoCodeFormSchema.safeParse({
      ...valid,
      startsAt: futureStart.toISOString().slice(0, 16),
      endsAt: earlyEnd.toISOString().slice(0, 16),
    }).success,
  );

  // maxUses 空字串 → null
  const parsed = promoCodeFormSchema.safeParse({ ...valid, maxUses: "" });
  assert(
    "maxUses 空字串 preprocess 為 null",
    parsed.success && parsed.data.maxUses === null,
  );

  // description 空字串 → null
  const parsed2 = promoCodeFormSchema.safeParse({ ...valid, description: "" });
  assert(
    "description 空字串 preprocess 為 null",
    parsed2.success && parsed2.data.description === null,
  );

  // previewDiscount — PERCENT
  const promo15Pct = {
    discountType: DiscountType.PERCENT,
    discountValue: 15,
    minSubtotal: 0,
    maxUses: null,
    usedCount: 0,
    startsAt: null,
    endsAt: null,
    isActive: true,
  };
  const r1 = previewDiscount(1000, promo15Pct);
  assert(
    "PERCENT 15% on 1000 → discount=150, final=850",
    r1.ok && r1.discount === 150 && r1.finalTotal === 850,
  );

  // PERCENT 無條件捨去
  const r2 = previewDiscount(999, promo15Pct);
  assert(
    "PERCENT 15% on 999 → discount=149（floor）",
    r2.ok && r2.discount === 149,
  );

  // FIXED
  const promo100Fixed = {
    ...promo15Pct,
    discountType: DiscountType.FIXED,
    discountValue: 100,
  };
  const r3 = previewDiscount(500, promo100Fixed);
  assert(
    "FIXED 100 on 500 → discount=100, final=400",
    r3.ok && r3.discount === 100 && r3.finalTotal === 400,
  );

  // FIXED > subtotal 截斷
  const r4 = previewDiscount(50, promo100Fixed);
  assert(
    "FIXED 100 on 50 → discount=50（截斷至 subtotal），final=0",
    r4.ok && r4.discount === 50 && r4.finalTotal === 0,
  );

  // 失效情境
  const inactive = { ...promo15Pct, isActive: false };
  assert(
    "isActive=false → ok:false",
    !previewDiscount(1000, inactive).ok,
  );

  const exhausted = { ...promo15Pct, maxUses: 10, usedCount: 10 };
  const r5 = previewDiscount(1000, exhausted);
  assert(
    "maxUses=usedCount → 已達上限",
    !r5.ok && r5.reason.includes("使用上限"),
  );

  const tooSmall = { ...promo15Pct, minSubtotal: 2000 };
  const r6 = previewDiscount(1000, tooSmall);
  assert(
    "subtotal 低於 minSubtotal → 拒絕",
    !r6.ok && r6.reason.includes("最低消費"),
  );

  const future = { ...promo15Pct, startsAt: new Date(Date.now() + 86_400_000) };
  assert(
    "startsAt > now → 尚未開始",
    !previewDiscount(1000, future).ok,
  );

  const expired = { ...promo15Pct, endsAt: new Date(Date.now() - 86_400_000) };
  assert(
    "endsAt < now → 已過期",
    !previewDiscount(1000, expired).ok,
  );

  // getPromoCodeStatus
  assert(
    "ACTIVE 狀態",
    getPromoCodeStatus(promo15Pct) === "ACTIVE",
  );
  assert(
    "DISABLED 狀態",
    getPromoCodeStatus(inactive) === "DISABLED",
  );
  assert(
    "SCHEDULED 狀態",
    getPromoCodeStatus(future) === "SCHEDULED",
  );
  assert(
    "EXPIRED 狀態",
    getPromoCodeStatus(expired) === "EXPIRED",
  );
  assert(
    "EXHAUSTED 狀態",
    getPromoCodeStatus(exhausted) === "EXHAUSTED",
  );
}

// ============ [B] PromoCode CRUD DB ============

async function testCrud() {
  console.log("\n[B] PromoCode CRUD DB");
  await cleanupTestPromos();

  // create
  const created = await prisma.promoCode.create({
    data: {
      code: `${TEST_CODE_PREFIX}ALPHA`,
      description: "smoke test",
      discountType: DiscountType.PERCENT,
      discountValue: 10,
      minSubtotal: 0,
      maxUses: 5,
      isActive: true,
    },
  });
  assert("[B1] create 回傳 id", !!created.id);
  assert("[B1] usedCount 預設 0", created.usedCount === 0);

  // unique code 衝突
  let dupErrored = false;
  try {
    await prisma.promoCode.create({
      data: {
        code: `${TEST_CODE_PREFIX}ALPHA`,
        discountType: DiscountType.PERCENT,
        discountValue: 5,
      },
    });
  } catch {
    dupErrored = true;
  }
  assert("[B2] 重複 code 觸發 P2002", dupErrored);

  // update
  await prisma.promoCode.update({
    where: { id: created.id },
    data: { discountValue: 25, description: "updated" },
  });
  const updated = await prisma.promoCode.findUnique({ where: { id: created.id } });
  assert("[B3] update discountValue 生效", updated?.discountValue === 25);
  assert("[B3] update description 生效", updated?.description === "updated");

  // toggle
  await prisma.promoCode.update({
    where: { id: created.id },
    data: { isActive: !created.isActive },
  });
  const toggled = await prisma.promoCode.findUnique({ where: { id: created.id } });
  assert("[B4] toggleActive 反轉", toggled?.isActive === false);

  // FIXED 類型
  const fixed = await prisma.promoCode.create({
    data: {
      code: `${TEST_CODE_PREFIX}FIXED`,
      discountType: DiscountType.FIXED,
      discountValue: 200,
      minSubtotal: 500,
    },
  });
  assert(
    "[B5] FIXED 200 / minSubtotal 500 寫入正確",
    fixed.discountType === "FIXED" && fixed.discountValue === 200 && fixed.minSubtotal === 500,
  );

  // nullable 欄位
  const nullable = await prisma.promoCode.create({
    data: {
      code: `${TEST_CODE_PREFIX}NULL`,
      discountType: DiscountType.PERCENT,
      discountValue: 5,
      // maxUses / startsAt / endsAt / description 都 null
    },
  });
  assert(
    "[B6] nullable 欄位預設 null",
    nullable.maxUses === null &&
      nullable.startsAt === null &&
      nullable.endsAt === null &&
      nullable.description === null,
  );

  await cleanupTestPromos();
}

// ============ [C] seed promo 整合 previewDiscount ============

async function testSeedPromosIntegration() {
  console.log("\n[C] seed promo + previewDiscount 整合");

  const summer = await prisma.promoCode.findUnique({ where: { code: "SUMMER15" } });
  if (!summer) {
    assert("[C] seed SUMMER15 存在", false, "請跑 pnpm prisma db seed");
    return;
  }
  assert("[C1] SUMMER15 seed 存在 + 啟用", summer.isActive);
  const r1 = previewDiscount(1000, summer);
  assert(
    "[C1] SUMMER15 (15%) on 1000 → discount=150",
    r1.ok && r1.discount === 150,
  );

  const freeship = await prisma.promoCode.findUnique({ where: { code: "FREESHIP200" } });
  if (!freeship) {
    assert("[C] seed FREESHIP200 存在", false);
    return;
  }
  const r2 = previewDiscount(2000, freeship);
  assert(
    "[C2] FREESHIP200 (FIXED 100) on 2000 → discount=100",
    r2.ok && r2.discount === 100,
  );
  // 低於 minSubtotal (1000)
  const r3 = previewDiscount(500, freeship);
  assert(
    "[C2] FREESHIP200 on 500（< minSubtotal）→ 拒絕",
    !r3.ok && r3.reason.includes("最低消費"),
  );
}

async function main() {
  testSchemaAndHelpers();
  await testCrud();
  await testSeedPromosIntegration();

  console.log(`\n─────────────────────────────────────`);
  console.log(`Phase 5c 驗收（DB-level）：${pass} pass / ${fail} fail`);
  if (fail > 0) process.exit(1);
}

main()
  .catch((e) => {
    console.error("\n[FATAL]", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
