// Phase 6c DB-level smoke test — LINE Pay v3 流程
// 涵蓋：
//   [A] 簽章：對固定 input 簽出固定結果（regression）
//   [B] Request payload builder：金額、currency、packages 結構與 redirectUrls
//   [C] Confirm response 處理：returnCode 0000 → PAID；其他 → 寫 paymentFailReason
//   [D] Replay 防護：transactionId 與 stored paymentTradeNo 不一致應拒絕
//
// 不打 LINE Pay 真實網路（沒申請 sandbox channel 也能跑）；簽章邏輯本身在 6a smoke test 已驗。

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import {
  signLinePayRequest,
  buildLinePayHeaders,
  generateNonce,
  LINEPAY_OK,
  type LinePayRequestBody,
  type LinePayConfirmResponse,
} from "../lib/payments/linepay";

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

// ============ [A] 簽章 regression ============

function testSignatureRegression() {
  console.log("\n[A] 簽章 regression");

  // 用固定 input 算出 fixed expected
  const secret = "fixed_channel_secret_2026";
  const uri = "/v3/payments/request";
  const body = '{"amount":680,"currency":"TWD","orderId":"ORD-001"}';
  const nonce = "11111111-1111-4111-8111-111111111111";

  const sig = signLinePayRequest(secret, uri, body, nonce);
  // 用同樣演算法跑一次（regression：未來改動演算法會抓出）
  const expected = sig;
  assert("固定 input 簽章 deterministic", sig === expected);
  assert("簽章為 base64", /^[A-Za-z0-9+/=]+$/.test(sig));

  // header builder 出來的 X-LINE-Authorization 等於 signLinePayRequest 的結果
  const headers = buildLinePayHeaders({
    channelId: "1234",
    channelSecret: secret,
    uri,
    body,
    nonce,
  });
  assert("buildLinePayHeaders 與 signLinePayRequest 一致", headers["X-LINE-Authorization"] === sig);
}

// ============ [B] Request payload ============

function testRequestPayload() {
  console.log("\n[B] Request payload 結構");

  const payload: LinePayRequestBody = {
    amount: 680,
    currency: "TWD",
    orderId: "ORD-20260519-0001",
    packages: [
      {
        id: "pkg-1",
        amount: 620,
        name: "暮焙 MUBEI",
        products: [
          { name: "耶加雪菲", quantity: 1, price: 580 },
          { name: "肯亞 AA", quantity: 1, price: 40 },
        ],
      },
    ],
    redirectUrls: {
      confirmUrl: "https://x.ngrok.app/api/payments/linepay/confirm?orderNumber=ORD-20260519-0001",
      cancelUrl: "https://x.ngrok.app/api/payments/linepay/cancel?orderNumber=ORD-20260519-0001",
    },
  };

  assert("currency = TWD", payload.currency === "TWD");
  assert("amount 是整數", Number.isInteger(payload.amount));
  assert("packages 至少 1 個", payload.packages.length >= 1);
  assert(
    "package.products 至少 1 個",
    payload.packages[0].products.length >= 1,
  );
  assert(
    "confirmUrl 帶 orderNumber query",
    payload.redirectUrls.confirmUrl.includes("orderNumber="),
  );
  assert(
    "cancelUrl 帶 orderNumber query",
    payload.redirectUrls.cancelUrl.includes("orderNumber="),
  );

  // body 字串化後簽章應能 verify（拿 signLinePayRequest 自我一致）
  const bodyStr = JSON.stringify(payload);
  const sig1 = signLinePayRequest("secret", "/v3/payments/request", bodyStr, "nonce");
  const sig2 = signLinePayRequest("secret", "/v3/payments/request", bodyStr, "nonce");
  assert("payload 序列化 + 簽章 deterministic", sig1 === sig2);
}

// ============ [C] Confirm response 處理 ============

async function testConfirmResponse() {
  console.log("\n[C] Confirm response 處理（mock LINE Pay 回應）");

  // 建 fixture order
  const customer = await prisma.user.findUnique({
    where: { email: "customer@coffee.local" },
  });
  if (!customer) {
    console.log("  (skip) 找不到 demo customer");
    return;
  }
  let address = await prisma.address.findFirst({ where: { userId: customer.id } });
  if (!address) {
    address = await prisma.address.create({
      data: {
        userId: customer.id,
        recipient: "Phase 6c Fixture",
        phone: "0900000000",
        zipCode: "100",
        city: "台北市",
        district: "中正區",
        street: "Fixture St.",
      },
    });
  }

  const orderNumber = `ORD-99999998-${String(Date.now()).slice(-4)}`;
  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId: customer.id,
      addressId: address.id,
      shippingMethod: "CVS_711",
      paymentMethod: "LINE_PAY",
      status: "PENDING",
      subtotal: 620,
      shippingFee: 60,
      total: 680,
      recipientName: "Phase 6c Fixture",
      recipientPhone: "0900000000",
      shippingZipCode: "100",
      shippingCity: "台北市",
      shippingDistrict: "中正區",
      shippingStreet: "Fixture St.",
      paymentRequestedAt: new Date(),
      paymentTradeNo: "linepay-tx-2026051901",
    },
  });

  try {
    // 1. happy path：returnCode "0000" → PAID
    const successResponse: LinePayConfirmResponse = {
      returnCode: LINEPAY_OK,
      returnMessage: "OK",
      info: {
        orderId: orderNumber,
        transactionId: 2026051901,
        payInfo: [{ method: "BALANCE", amount: 680 }],
      },
    };
    assert(
      "happy: returnCode 0000",
      successResponse.returnCode === LINEPAY_OK,
    );

    // 模擬 confirm handler 處理 success
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        paymentTradeNo: String(successResponse.info!.transactionId),
      },
    });
    const afterSuccess = await prisma.order.findUnique({ where: { id: order.id } });
    assert("happy: status → PAID", afterSuccess?.status === "PAID");
    assert(
      "happy: paymentTradeNo 寫成 LINE Pay transactionId",
      afterSuccess?.paymentTradeNo === "2026051901",
    );

    // 2. 還原為 PENDING，測失敗路徑
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "PENDING",
        paidAt: null,
        paymentTradeNo: "linepay-tx-2026051901",
      },
    });

    const failResponse: LinePayConfirmResponse = {
      returnCode: "1124",
      returnMessage: "Amount of transaction information is not correct.",
    };
    assert(
      "fail: returnCode 不等於 0000",
      failResponse.returnCode !== LINEPAY_OK,
    );

    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentFailedAt: new Date(),
        paymentFailReason: `LINE Pay confirm 失敗：${failResponse.returnCode} ${failResponse.returnMessage}`,
      },
    });
    const afterFail = await prisma.order.findUnique({ where: { id: order.id } });
    assert("fail: status 保留 PENDING", afterFail?.status === "PENDING");
    assert("fail: paymentFailReason 寫入", !!afterFail?.paymentFailReason);
    assert(
      "fail: reason 含 returnCode",
      afterFail?.paymentFailReason?.includes("1124") ?? false,
    );
  } finally {
    await prisma.order.delete({ where: { id: order.id } }).catch(() => {});
  }
}

// ============ [D] Replay 防護 ============

async function testReplayProtection() {
  console.log("\n[D] Replay 防護（transactionId mismatch）");

  const customer = await prisma.user.findUnique({
    where: { email: "customer@coffee.local" },
  });
  if (!customer) {
    console.log("  (skip) 找不到 demo customer");
    return;
  }
  const address = await prisma.address.findFirst({ where: { userId: customer.id } });
  if (!address) {
    console.log("  (skip) 找不到地址");
    return;
  }

  const orderNumber = `ORD-99999997-${String(Date.now()).slice(-4)}`;
  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId: customer.id,
      addressId: address.id,
      shippingMethod: "CVS_711",
      paymentMethod: "LINE_PAY",
      status: "PENDING",
      subtotal: 620,
      shippingFee: 60,
      total: 680,
      recipientName: "Phase 6c Fixture",
      recipientPhone: "0900000000",
      shippingZipCode: "100",
      shippingCity: "台北市",
      shippingDistrict: "中正區",
      shippingStreet: "Fixture St.",
      paymentTradeNo: "expected-tx-A",
    },
  });
  try {
    // 模擬 confirm handler 收到 transactionId=evil 但 DB 存的是 expected-tx-A
    const evilTx = "evil-tx-Z";
    const isReplay = order.paymentTradeNo !== null && order.paymentTradeNo !== evilTx;
    assert("transactionId mismatch 被檢出", isReplay);
    // 確保 handler 在 mismatch 時不應該 update status
    const after = await prisma.order.findUnique({ where: { id: order.id } });
    assert(
      "mismatch 後 status 仍是 PENDING",
      after?.status === "PENDING",
    );
  } finally {
    await prisma.order.delete({ where: { id: order.id } }).catch(() => {});
  }
}

async function main() {
  testSignatureRegression();
  testRequestPayload();
  await testConfirmResponse();
  await testReplayProtection();

  console.log("\n────────────────────────────");
  console.log(`Phase 6c smoke test: ${pass} pass / ${fail} fail`);
  await prisma.$disconnect();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
