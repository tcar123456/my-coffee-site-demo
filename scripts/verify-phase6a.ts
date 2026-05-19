// Phase 6a DB-level smoke test
// 涵蓋：
//   [A] ECPay CheckMacValue 純函式（演算法步驟、round-trip、邊界）
//   [B] ECPay buildAioParams + helper（merchantTradeNo strip、台北時區、sanitize）
//   [C] LINE Pay 簽章（HMAC-SHA256 + base64、自我一致、header builder）
//   [D] Order schema 新欄位（paymentRequestedAt / paymentTradeNo / paymentFailedAt / paymentFailReason）

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import {
  calcCheckMacValue,
  verifyCheckMacValue,
  ecpayMerchantTradeNo,
  formatTaipeiDateTime,
  sanitizeText,
  buildAioParams,
} from "../lib/payments/ecpay";
import {
  signLinePayRequest,
  generateNonce,
  buildLinePayHeaders,
  LINEPAY_OK,
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

// ============ [A] ECPay CheckMacValue 純函式 ============

function testEcpayCheckMac() {
  console.log("\n[A] ECPay CheckMacValue 純函式");

  const HASH_KEY = "pwFHCqoQZGmho4w6";
  const HASH_IV = "EkRm7iFT261dpevs";

  // 同 input 必須穩定（deterministic）
  const params1 = {
    MerchantID: "3002607",
    MerchantTradeNo: "ORD202605190001",
    MerchantTradeDate: "2026/05/19 10:00:00",
    PaymentType: "aio",
    TotalAmount: "680",
    TradeDesc: "coffee order",
    ItemName: "耶加雪菲#肯亞 AA",
    ReturnURL: "https://example.ngrok.app/api/payments/ecpay/return",
    ChoosePayment: "Credit",
    EncryptType: "1",
  };
  const h1 = calcCheckMacValue(params1, HASH_KEY, HASH_IV);
  const h2 = calcCheckMacValue(params1, HASH_KEY, HASH_IV);
  assert("CheckMacValue deterministic", h1 === h2);
  assert("CheckMacValue 大寫 hex 64 chars", /^[0-9A-F]{64}$/.test(h1), `got ${h1}`);

  // 不同參數產出不同 hash
  const params2 = { ...params1, TotalAmount: "681" };
  const hDiff = calcCheckMacValue(params2, HASH_KEY, HASH_IV);
  assert("不同 amount 產生不同 hash", h1 !== hDiff);

  // CheckMacValue 自己不參與計算
  const withSelf = { ...params1, CheckMacValue: "GARBAGE" };
  const hSelf = calcCheckMacValue(withSelf, HASH_KEY, HASH_IV);
  assert("CheckMacValue 自身欄位被排除", h1 === hSelf);

  // 不同 HashKey 產出不同 hash
  const hAltKey = calcCheckMacValue(params1, "differentKey1234", HASH_IV);
  assert("不同 HashKey 產生不同 hash", h1 !== hAltKey);

  // verifyCheckMacValue: round-trip
  const body = { ...params1, CheckMacValue: h1 };
  assert("verify: 正確 CheckMacValue → true", verifyCheckMacValue(body, HASH_KEY, HASH_IV));

  // verify: 任一欄位被竄改 → false
  const tampered = { ...body, TotalAmount: "999" };
  assert("verify: amount 被竄改 → false", !verifyCheckMacValue(tampered, HASH_KEY, HASH_IV));

  // verify: CheckMacValue 缺失 → false
  const missing = { ...params1 } as Record<string, string>;
  assert("verify: 缺 CheckMacValue → false", !verifyCheckMacValue(missing, HASH_KEY, HASH_IV));

  // verify: CheckMacValue 長度不對 → false（防 timingSafeEqual throw）
  const shortMac = { ...body, CheckMacValue: "ABC" };
  assert("verify: 短 hash → false（不噴）", !verifyCheckMacValue(shortMac, HASH_KEY, HASH_IV));
}

// ============ [B] ECPay buildAioParams + helpers ============

function testEcpayHelpers() {
  console.log("\n[B] ECPay buildAioParams + helpers");

  // merchantTradeNo strip dash
  assert(
    "ORD-20260519-0001 → ORD202605190001（15 字，無 dash）",
    ecpayMerchantTradeNo("ORD-20260519-0001") === "ORD202605190001",
  );
  assert(
    "已 alphanumeric 保持不變",
    ecpayMerchantTradeNo("ABC123") === "ABC123",
  );
  assert(
    "超過 20 字會 truncate",
    ecpayMerchantTradeNo("A".repeat(25)).length === 20,
  );

  // Taipei time format
  const fixed = new Date("2026-05-19T02:00:00Z"); // = 2026/05/19 10:00:00 Asia/Taipei
  const formatted = formatTaipeiDateTime(fixed);
  assert(
    "formatTaipeiDateTime UTC→Taipei +8",
    formatted === "2026/05/19 10:00:00",
    `got ${formatted}`,
  );

  // sanitizeText
  assert(
    "sanitize 移除 & = #",
    sanitizeText("a&b=c#d", 100) === "a b c d",
  );
  assert(
    "sanitize 超長 truncate",
    sanitizeText("x".repeat(500), 200).length === 200,
  );
  assert(
    "sanitize 中文保留",
    sanitizeText("耶加雪菲 x1", 50) === "耶加雪菲 x1",
  );

  // buildAioParams
  const built = buildAioParams({
    merchantId: "3002607",
    hashKey: "pwFHCqoQZGmho4w6",
    hashIV: "EkRm7iFT261dpevs",
    merchantTradeNo: "ORD202605190001",
    totalAmount: 680,
    tradeDesc: "coffee order",
    itemName: "耶加雪菲 x1",
    returnURL: "https://example.com/api/payments/ecpay/return",
    orderResultURL: "https://example.com/checkout/result",
    now: fixed,
  });
  assert("buildAio: MerchantID 正確", built.MerchantID === "3002607");
  assert("buildAio: PaymentType=aio", built.PaymentType === "aio");
  assert("buildAio: EncryptType=1（SHA256）", built.EncryptType === "1");
  assert("buildAio: NeedExtraPaidInfo=Y", built.NeedExtraPaidInfo === "Y");
  assert("buildAio: TotalAmount string", built.TotalAmount === "680");
  assert("buildAio: MerchantTradeDate 用 Asia/Taipei", built.MerchantTradeDate === "2026/05/19 10:00:00");
  assert("buildAio: CheckMacValue 被加上", !!built.CheckMacValue && /^[0-9A-F]{64}$/.test(built.CheckMacValue));

  // round-trip：buildAioParams 出來的 CheckMacValue 應該能 verify
  const asCallback = built as unknown as Record<string, string>;
  assert(
    "buildAio + verify round-trip",
    verifyCheckMacValue(asCallback, "pwFHCqoQZGmho4w6", "EkRm7iFT261dpevs"),
  );
}

// ============ [C] LINE Pay 簽章 + headers ============

function testLinePaySign() {
  console.log("\n[C] LINE Pay 簽章");

  // 簽章公式自我一致：channelSecret + URI + body + nonce
  const secret = "channel_secret_abc";
  const uri = "/v3/payments/request";
  const body = JSON.stringify({ amount: 250, currency: "TWD", orderId: "ORD-1" });
  const nonce = "fixed-nonce-001";

  const sig1 = signLinePayRequest(secret, uri, body, nonce);
  const sig2 = signLinePayRequest(secret, uri, body, nonce);
  assert("signLinePayRequest deterministic", sig1 === sig2);
  // base64 字串
  assert("簽章是 base64", /^[A-Za-z0-9+/]+=*$/.test(sig1), `got ${sig1}`);

  // 任一變動產生不同 sig
  assert("不同 secret → 不同 sig", signLinePayRequest("other", uri, body, nonce) !== sig1);
  assert("不同 URI → 不同 sig", signLinePayRequest(secret, "/other", body, nonce) !== sig1);
  assert("不同 body → 不同 sig", signLinePayRequest(secret, uri, body + "x", nonce) !== sig1);
  assert("不同 nonce → 不同 sig", signLinePayRequest(secret, uri, body, "nonce-002") !== sig1);

  // generateNonce 是 UUID
  const n1 = generateNonce();
  const n2 = generateNonce();
  assert("generateNonce 每次不同", n1 !== n2);
  assert(
    "generateNonce 是 UUID v4 格式",
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(n1),
    `got ${n1}`,
  );

  // buildLinePayHeaders 含必要 header
  const headers = buildLinePayHeaders({
    channelId: "1234",
    channelSecret: secret,
    uri,
    body,
    nonce,
  });
  assert("headers: Content-Type", headers["Content-Type"] === "application/json");
  assert("headers: X-LINE-ChannelId", headers["X-LINE-ChannelId"] === "1234");
  assert("headers: X-LINE-Authorization-Nonce", headers["X-LINE-Authorization-Nonce"] === nonce);
  assert("headers: X-LINE-Authorization == 簽章", headers["X-LINE-Authorization"] === sig1);

  // LINEPAY_OK 常數
  assert("LINEPAY_OK === '0000'", LINEPAY_OK === "0000");
}

// ============ [D] Order 新欄位 ============

async function testOrderSchema() {
  console.log("\n[D] Order schema 新欄位");

  // 撈一筆 PENDING 訂單（如果有），檢查新 4 欄存在且預設 null
  const sample = await prisma.order.findFirst({ where: { status: "PENDING" } });
  if (!sample) {
    console.log("  (skip) 沒有 PENDING 訂單可驗，建議先 demo 下單");
    return;
  }

  assert("paymentRequestedAt 預設 null", sample.paymentRequestedAt === null);
  assert("paymentTradeNo 預設 null", sample.paymentTradeNo === null);
  assert("paymentFailedAt 預設 null", sample.paymentFailedAt === null);
  assert("paymentFailReason 預設 null", sample.paymentFailReason === null);

  // 寫一次 + 還原（測 read/write round-trip）
  const before = {
    paymentRequestedAt: sample.paymentRequestedAt,
    paymentTradeNo: sample.paymentTradeNo,
    paymentFailedAt: sample.paymentFailedAt,
    paymentFailReason: sample.paymentFailReason,
  };
  try {
    const now = new Date();
    await prisma.order.update({
      where: { id: sample.id },
      data: {
        paymentRequestedAt: now,
        paymentTradeNo: "TEST-TRADE-001",
        paymentFailedAt: now,
        paymentFailReason: "smoke test",
      },
    });
    const reread = await prisma.order.findUnique({ where: { id: sample.id } });
    assert("paymentTradeNo 寫入後可讀", reread?.paymentTradeNo === "TEST-TRADE-001");
    assert("paymentFailReason 寫入後可讀", reread?.paymentFailReason === "smoke test");
    assert("paymentRequestedAt 寫入後可讀", reread?.paymentRequestedAt instanceof Date);
  } finally {
    await prisma.order.update({ where: { id: sample.id }, data: before });
  }
}

// ============ run ============

async function main() {
  testEcpayCheckMac();
  testEcpayHelpers();
  testLinePaySign();
  await testOrderSchema();

  console.log("\n────────────────────────────");
  console.log(`Phase 6a smoke test: ${pass} pass / ${fail} fail`);
  await prisma.$disconnect();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
