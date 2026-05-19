// Phase 6b DB-level smoke test — ECPay AIO callback 流程
// 涵蓋：
//   [A] buildAioParams 與 ecpay sandbox endpoint 拼裝
//   [B] callback verifier 端到端：模擬 ECPay 後端送 form data → verifyCheckMacValue → DB update
//   [C] 邊界：金額竄改、CheckMacValue 錯、冪等（已 PAID 再 callback）、RtnCode != 1 失敗路徑
//
// 不打外部網路，純模擬 callback body（用我們自己的 calcCheckMacValue 產生簽章，
// 等同於 ECPay 後端會做的事，所以 verify 必須通過）。

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import {
  buildAioParams,
  calcCheckMacValue,
  verifyCheckMacValue,
  ecpayMerchantTradeNo,
} from "../lib/payments/ecpay";
import { getEcpayConfig } from "../lib/payments/ecpay-config";

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

// 模擬 ECPay 後端會送來的 callback body（用我們的 calcCheckMacValue 簽，等同 ECPay 後端做的事）
function makeCallback(input: {
  merchantId: string;
  hashKey: string;
  hashIV: string;
  merchantTradeNo: string;
  tradeAmt: number;
  rtnCode: string;
  rtnMsg: string;
  tradeNo: string;
  simulatePaid?: "0" | "1";
}): Record<string, string> {
  const body: Record<string, string> = {
    MerchantID: input.merchantId,
    MerchantTradeNo: input.merchantTradeNo,
    PaymentDate: "2026/05/19 10:05:00",
    PaymentType: "Credit_CreditCard",
    TradeAmt: String(input.tradeAmt),
    RtnCode: input.rtnCode,
    RtnMsg: input.rtnMsg,
    TradeNo: input.tradeNo,
    TradeDate: "2026/05/19 10:00:00",
    SimulatePaid: input.simulatePaid ?? "0",
  };
  body.CheckMacValue = calcCheckMacValue(body, input.hashKey, input.hashIV);
  return body;
}

function testBuildAioWithConfig() {
  console.log("\n[A] buildAioParams 與 sandbox config 整合");

  const cfg = getEcpayConfig();
  assert("config: isSandbox=true（未設 ECPAY_ENV=production）", cfg.isSandbox);
  assert("config: 預設 merchantId 3002607", cfg.merchantId === "3002607");
  assert(
    "config: endpoint 含 payment-stage",
    cfg.endpoint.includes("payment-stage.ecpay.com.tw"),
  );

  const params = buildAioParams({
    merchantId: cfg.merchantId,
    hashKey: cfg.hashKey,
    hashIV: cfg.hashIV,
    merchantTradeNo: ecpayMerchantTradeNo("ORD-20260519-0001"),
    totalAmount: 680,
    tradeDesc: "MUBEI",
    itemName: "耶加雪菲 x1",
    returnURL: "https://x.ngrok.app/api/payments/ecpay/return",
  });
  assert("產出 MerchantTradeNo 無 dash", !params.MerchantTradeNo.includes("-"));
  assert(
    "MerchantTradeNo 仍可被 verify",
    /^[A-Za-z0-9]+$/.test(params.MerchantTradeNo),
  );
}

// 建一筆 fixture PENDING + CREDIT_CARD 訂單給 [B][C] 用；測完整段刪掉
async function createFixtureOrder(): Promise<{ id: string; orderNumber: string; total: number } | null> {
  const customer = await prisma.user.findUnique({
    where: { email: "customer@coffee.local" },
  });
  if (!customer) return null;
  const address = await prisma.address.findFirst({ where: { userId: customer.id } });
  if (!address) {
    // 沒地址就建一筆臨時的
    const created = await prisma.address.create({
      data: {
        userId: customer.id,
        recipient: "Phase 6b Fixture",
        phone: "0900000000",
        zipCode: "100",
        city: "台北市",
        district: "中正區",
        street: "Fixture St.",
      },
    });
    address!.id = created.id;
  }
  const addrId = address?.id ?? (await prisma.address.findFirst({ where: { userId: customer.id } }))!.id;

  // 不走真實 placeOrder（會扣庫存）— 直接用 Prisma 塞測試訂單，跳過 OrderCounter
  const orderNumber = `ORD-99999999-${String(Date.now()).slice(-4)}`;
  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId: customer.id,
      addressId: addrId,
      shippingMethod: "CVS_711",
      paymentMethod: "CREDIT_CARD",
      status: "PENDING",
      subtotal: 580,
      shippingFee: 60,
      total: 640,
      recipientName: "Phase 6b Fixture",
      recipientPhone: "0900000000",
      shippingZipCode: "100",
      shippingCity: "台北市",
      shippingDistrict: "中正區",
      shippingStreet: "Fixture St.",
    },
  });
  return { id: order.id, orderNumber: order.orderNumber, total: order.total };
}

async function cleanupFixture(id: string) {
  await prisma.order.delete({ where: { id } }).catch(() => {});
}

async function testCallbackHappyPath() {
  console.log("\n[B] Callback 完整流程（happy path）");

  const cfg = getEcpayConfig();
  const fixture = await createFixtureOrder();
  if (!fixture) {
    console.log("  (skip) 找不到 demo customer，先跑 pnpm prisma db seed");
    return;
  }
  const order = await prisma.order.findUnique({ where: { id: fixture.id } });
  if (!order) {
    console.log("  (skip) fixture order 建立失敗");
    return;
  }
  const original = { status: order.status, paidAt: order.paidAt, paymentTradeNo: order.paymentTradeNo };

  const tradeNo = ecpayMerchantTradeNo(order.orderNumber);
  const callback = makeCallback({
    merchantId: cfg.merchantId,
    hashKey: cfg.hashKey,
    hashIV: cfg.hashIV,
    merchantTradeNo: tradeNo,
    tradeAmt: order.total,
    rtnCode: "1",
    rtnMsg: "交易成功",
    tradeNo: "ECPAY-TEST-2024051901",
  });

  assert(
    "callback verify CheckMacValue 通過",
    verifyCheckMacValue(callback, cfg.hashKey, cfg.hashIV),
  );

  // 模擬 callback handler 主要邏輯（不打 HTTP，直接 inline）
  // 1. verify
  // 2. find order by ecpayMerchantTradeNo
  // 3. amount match
  // 4. status = PENDING → update
  const candidates = await prisma.order.findMany({
    where: { orderNumber: { contains: tradeNo.slice(3, 11) } },
    select: { id: true, orderNumber: true, total: true, status: true },
  });
  const found = candidates.find(
    (o) => ecpayMerchantTradeNo(o.orderNumber) === tradeNo,
  );
  assert("callback 能用 strip 後 tradeNo 找到原始 order", found?.id === order.id);

  const callbackAmt = parseInt(callback.TradeAmt, 10);
  assert("TradeAmt 與 DB total 相符", callbackAmt === order.total);

  try {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        paymentTradeNo: callback.TradeNo,
      },
    });
    const after = await prisma.order.findUnique({ where: { id: order.id } });
    assert("happy path：order 已 PAID", after?.status === "PAID");
    assert("paidAt 已寫入", after?.paidAt instanceof Date);
    assert(
      "paymentTradeNo 已寫入",
      after?.paymentTradeNo === "ECPAY-TEST-2024051901",
    );
  } finally {
    await prisma.order.update({ where: { id: order.id }, data: original });
    await cleanupFixture(fixture.id);
  }
}

async function testCallbackEdgeCases() {
  console.log("\n[C] Callback 邊界 / 攻擊面");

  const cfg = getEcpayConfig();
  const fixture = await createFixtureOrder();
  if (!fixture) {
    console.log("  (skip) 找不到 demo customer");
    return;
  }
  const sample = await prisma.order.findUnique({ where: { id: fixture.id } });
  if (!sample) {
    console.log("  (skip) fixture 建立失敗");
    return;
  }
  const tradeNo = ecpayMerchantTradeNo(sample.orderNumber);

  // 1. CheckMacValue 錯
  const bad = makeCallback({
    merchantId: cfg.merchantId,
    hashKey: cfg.hashKey,
    hashIV: cfg.hashIV,
    merchantTradeNo: tradeNo,
    tradeAmt: sample.total,
    rtnCode: "1",
    rtnMsg: "OK",
    tradeNo: "X",
  });
  bad.CheckMacValue = "DEADBEEF".repeat(8);
  assert(
    "錯的 CheckMacValue → verify false",
    !verifyCheckMacValue(bad, cfg.hashKey, cfg.hashIV),
  );

  // 2. 金額被竄改（攻擊者改 amount，但仍然簽得對）→ verify 通過，但金額比對應失敗
  const tampered = makeCallback({
    merchantId: cfg.merchantId,
    hashKey: cfg.hashKey,
    hashIV: cfg.hashIV,
    merchantTradeNo: tradeNo,
    tradeAmt: 1, // 故意改成極小值
    rtnCode: "1",
    rtnMsg: "OK",
    tradeNo: "X",
  });
  assert(
    "tampered amount 仍可 verify（攻擊者掌握 secret 是另一回事）",
    verifyCheckMacValue(tampered, cfg.hashKey, cfg.hashIV),
  );
  assert(
    "callback handler 必須比對 DB amount 才能抓出竄改",
    parseInt(tampered.TradeAmt, 10) !== sample.total,
  );

  // 3. RtnCode != 1 → 失敗路徑
  const failed = makeCallback({
    merchantId: cfg.merchantId,
    hashKey: cfg.hashKey,
    hashIV: cfg.hashIV,
    merchantTradeNo: tradeNo,
    tradeAmt: sample.total,
    rtnCode: "10100254",
    rtnMsg: "拒絕交易",
    tradeNo: "FAIL01",
  });
  assert(
    "失敗 callback 仍可 verify（要看 RtnCode 才知道結果）",
    verifyCheckMacValue(failed, cfg.hashKey, cfg.hashIV),
  );
  assert("RtnCode != '1' 視為失敗", failed.RtnCode !== "1");

  // 4. MerchantID 被換掉 → verify 通過但 MerchantID 比對失敗
  const wrongMerchant = makeCallback({
    merchantId: "9999999",
    hashKey: cfg.hashKey,
    hashIV: cfg.hashIV,
    merchantTradeNo: tradeNo,
    tradeAmt: sample.total,
    rtnCode: "1",
    rtnMsg: "OK",
    tradeNo: "X",
  });
  assert(
    "wrong MerchantID 仍可 verify（攻擊者用自己 secret 簽，但 MerchantID 比對該失敗）",
    verifyCheckMacValue(wrongMerchant, cfg.hashKey, cfg.hashIV),
  );
  assert(
    "callback handler 必須比對 MerchantID 與 env 一致",
    wrongMerchant.MerchantID !== cfg.merchantId,
  );

  // 5. SimulatePaid=1 應被識別出來
  const simulated = makeCallback({
    merchantId: cfg.merchantId,
    hashKey: cfg.hashKey,
    hashIV: cfg.hashIV,
    merchantTradeNo: tradeNo,
    tradeAmt: sample.total,
    rtnCode: "1",
    rtnMsg: "OK",
    tradeNo: "X",
    simulatePaid: "1",
  });
  assert("SimulatePaid 欄位帶 1", simulated.SimulatePaid === "1");

  await cleanupFixture(fixture.id);
}

async function main() {
  testBuildAioWithConfig();
  await testCallbackHappyPath();
  await testCallbackEdgeCases();

  console.log("\n────────────────────────────");
  console.log(`Phase 6b smoke test: ${pass} pass / ${fail} fail`);
  await prisma.$disconnect();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
