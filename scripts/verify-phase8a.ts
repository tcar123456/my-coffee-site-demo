// Phase 8a DB-level smoke test
// 涵蓋：
//   [A] CheckMacValue 物流版 sanity（re-use AIO 演算法，回歸測 round-trip + 不同 key/IV）
//   [B] buildCreateShipmentParams：CVS / Home 兩條路徑 + 必填欄位校驗 + IsCollection 帶 CollectionAmount
//   [C] parseCreateShipmentResponse：URL-encoded body 解析 happy + 失敗路徑 + AllPayLogisticsID 缺失
//   [D] store-mock：10 筆完整 + getStoresByChain + findStoreById
//   [E] sandbox config：env loader fallback + production missing throw
//   [F] Order schema 新 5 欄位（migrate dev 應已 apply）—— 用 prisma update 寫入確認欄位存在
//
// 不打外部 ECPay API（離線測試）。

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import {
  calcCheckMacValue,
  verifyCheckMacValue,
  buildCreateShipmentParams,
  parseCreateShipmentResponse,
} from "../lib/logistics/ecpay-logistics";
import { getEcpayLogisticsConfig } from "../lib/logistics/ecpay-logistics-config";
import {
  MOCK_STORES,
  getStoresByChain,
  findStoreById,
} from "../lib/logistics/store-mock";

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

const SANDBOX_HASH_KEY = "5294y06JbISpM5x9";
const SANDBOX_HASH_IV = "v77hoKGq4kWxNNIS";

// ============ [A] CheckMacValue 物流版 sanity ============

function testLogisticsCheckMac() {
  console.log("\n[A] CheckMacValue 物流版 sanity");

  const params = {
    MerchantID: "2000132",
    MerchantTradeNo: "LOG20260520001",
    MerchantTradeDate: "2026/05/20 14:00:00",
    LogisticsType: "CVS",
    LogisticsSubType: "UNIMARTC2C",
    GoodsAmount: "680",
    GoodsName: "暮焙咖啡豆",
    SenderName: "暮焙",
    SenderCellPhone: "0912345678",
    ReceiverName: "陳先生",
    ReceiverCellPhone: "0987654321",
    ServerReplyURL: "https://example.ngrok.app/api/logistics/notify",
    IsCollection: "N",
    ReceiverStoreID: "991001",
  };

  const h1 = calcCheckMacValue(params, SANDBOX_HASH_KEY, SANDBOX_HASH_IV);
  const h2 = calcCheckMacValue(params, SANDBOX_HASH_KEY, SANDBOX_HASH_IV);
  assert("CheckMacValue deterministic", h1 === h2);
  assert("CheckMacValue 大寫 hex 64 chars", /^[0-9A-F]{64}$/.test(h1));

  const altKey = calcCheckMacValue(params, "0000000000000000", SANDBOX_HASH_IV);
  assert("不同 hashKey → 不同 hash", h1 !== altKey);

  const altIv = calcCheckMacValue(params, SANDBOX_HASH_KEY, "0000000000000000");
  assert("不同 hashIV → 不同 hash", h1 !== altIv);

  const tampered = { ...params, GoodsAmount: "999" };
  const hTampered = calcCheckMacValue(tampered, SANDBOX_HASH_KEY, SANDBOX_HASH_IV);
  assert("竄改 GoodsAmount → 不同 hash", h1 !== hTampered);

  const body = { ...params, CheckMacValue: h1 };
  assert(
    "verifyCheckMacValue: 正確 → true",
    verifyCheckMacValue(body, SANDBOX_HASH_KEY, SANDBOX_HASH_IV),
  );

  const tamperedBody = { ...body, GoodsAmount: "999" };
  assert(
    "verifyCheckMacValue: 竄改 → false",
    !verifyCheckMacValue(tamperedBody, SANDBOX_HASH_KEY, SANDBOX_HASH_IV),
  );
}

// ============ [B] buildCreateShipmentParams ============

function testBuildShipmentParams() {
  console.log("\n[B] buildCreateShipmentParams");

  const cvs = buildCreateShipmentParams({
    merchantId: "2000132",
    hashKey: SANDBOX_HASH_KEY,
    hashIV: SANDBOX_HASH_IV,
    merchantTradeNo: "ORD202605200001",
    logisticsType: "CVS",
    logisticsSubType: "UNIMARTC2C",
    goodsAmount: 680,
    goodsName: "暮焙咖啡豆",
    senderName: "暮焙",
    senderCellPhone: "0912345678",
    receiverName: "陳先生",
    receiverCellPhone: "0987654321",
    serverReplyURL: "https://example.test/api/logistics/notify",
    receiverStoreId: "991001",
    now: new Date("2026-05-20T06:00:00Z"),
  });

  assert("CVS: LogisticsType === 'CVS'", cvs.LogisticsType === "CVS");
  assert("CVS: LogisticsSubType === 'UNIMARTC2C'", cvs.LogisticsSubType === "UNIMARTC2C");
  assert("CVS: 含 ReceiverStoreID", "ReceiverStoreID" in cvs && cvs.ReceiverStoreID === "991001");
  assert("CVS: GoodsAmount 是 string '680'", cvs.GoodsAmount === "680");
  assert("CVS: 含 CheckMacValue", typeof cvs.CheckMacValue === "string" && cvs.CheckMacValue.length === 64);
  assert("CVS: IsCollection 預設 'N'", cvs.IsCollection === "N");

  // CVS 必填 receiverStoreId
  let threw = false;
  try {
    buildCreateShipmentParams({
      merchantId: "2000132",
      hashKey: SANDBOX_HASH_KEY,
      hashIV: SANDBOX_HASH_IV,
      merchantTradeNo: "ORD202605200002",
      logisticsType: "CVS",
      logisticsSubType: "FAMIC2C",
      goodsAmount: 500,
      goodsName: "test",
      senderName: "暮焙",
      senderCellPhone: "0912345678",
      receiverName: "test",
      receiverCellPhone: "0987654321",
      serverReplyURL: "https://example.test/notify",
      // 故意缺 receiverStoreId
    });
  } catch {
    threw = true;
  }
  assert("CVS 缺 receiverStoreId 應 throw", threw);

  // Home delivery
  const home = buildCreateShipmentParams({
    merchantId: "2000132",
    hashKey: SANDBOX_HASH_KEY,
    hashIV: SANDBOX_HASH_IV,
    merchantTradeNo: "ORD202605200003",
    logisticsType: "Home",
    logisticsSubType: "TCAT",
    goodsAmount: 1200,
    goodsName: "暮焙咖啡豆 x2",
    senderName: "暮焙",
    senderCellPhone: "0912345678",
    receiverName: "李小姐",
    receiverCellPhone: "0987654321",
    serverReplyURL: "https://example.test/notify",
    senderZipCode: "10617",
    senderAddress: "台北市大安區羅斯福路四段 1 號",
    receiverZipCode: "10683",
    receiverAddress: "台北市大安區仁愛路四段 1 號",
    now: new Date("2026-05-20T06:00:00Z"),
  });

  assert("Home: LogisticsType === 'Home'", home.LogisticsType === "Home");
  assert("Home: LogisticsSubType === 'TCAT'", home.LogisticsSubType === "TCAT");
  assert("Home: 含 SenderZipCode", "SenderZipCode" in home && home.SenderZipCode === "10617");
  assert("Home: 含 ReceiverAddress", "ReceiverAddress" in home && home.ReceiverAddress.includes("仁愛路"));
  assert("Home: Temperature 預設 '0001'", "Temperature" in home && home.Temperature === "0001");
  assert("Home: 不含 ReceiverStoreID", !("ReceiverStoreID" in home));

  // Home 缺 senderZipCode
  let homeThrew = false;
  try {
    buildCreateShipmentParams({
      merchantId: "2000132",
      hashKey: SANDBOX_HASH_KEY,
      hashIV: SANDBOX_HASH_IV,
      merchantTradeNo: "ORD202605200004",
      logisticsType: "Home",
      logisticsSubType: "TCAT",
      goodsAmount: 500,
      goodsName: "test",
      senderName: "暮焙",
      senderCellPhone: "0912345678",
      receiverName: "test",
      receiverCellPhone: "0987654321",
      serverReplyURL: "https://example.test/notify",
      // 故意缺地址欄
    });
  } catch {
    homeThrew = true;
  }
  assert("Home 缺地址欄 應 throw", homeThrew);

  // IsCollection + CollectionAmount
  const cod = buildCreateShipmentParams({
    merchantId: "2000132",
    hashKey: SANDBOX_HASH_KEY,
    hashIV: SANDBOX_HASH_IV,
    merchantTradeNo: "ORD202605200005",
    logisticsType: "CVS",
    logisticsSubType: "UNIMARTC2C",
    goodsAmount: 680,
    goodsName: "test",
    senderName: "暮焙",
    senderCellPhone: "0912345678",
    receiverName: "test",
    receiverCellPhone: "0987654321",
    serverReplyURL: "https://example.test/notify",
    receiverStoreId: "991001",
    isCollection: true,
    collectionAmount: 680,
  });
  assert("COD: IsCollection === 'Y'", cod.IsCollection === "Y");
  assert("COD: CollectionAmount === '680'", cod.CollectionAmount === "680");

  // CheckMacValue 驗證 round-trip
  const verified = verifyCheckMacValue(
    cvs as unknown as Record<string, string>,
    SANDBOX_HASH_KEY,
    SANDBOX_HASH_IV,
  );
  assert("buildCreateShipmentParams: CheckMacValue self-verify", verified);
}

// ============ [C] parseCreateShipmentResponse ============

function testParseShipmentResponse() {
  console.log("\n[C] parseCreateShipmentResponse");

  // happy CVS
  const cvsBody =
    "RtnCode=1&RtnMsg=OK&AllPayLogisticsID=2026052012345678&LogisticsType=CVS&GoodsAmount=680&ReceiverStoreID=991001&CheckMacValue=ABCDEF";
  const cvsResult = parseCreateShipmentResponse(cvsBody);
  assert("CVS happy: ok === true", cvsResult.ok === true);
  if (cvsResult.ok) {
    assert("CVS happy: logisticsId === '2026052012345678'", cvsResult.logisticsId === "2026052012345678");
    assert("CVS happy: goodsAmount === 680", cvsResult.goodsAmount === 680);
    assert("CVS happy: raw.ReceiverStoreID 保留", cvsResult.raw.ReceiverStoreID === "991001");
  }

  // happy Home
  const homeBody =
    "RtnCode=1&RtnMsg=Success&AllPayLogisticsID=2026052099887766&LogisticsType=Home&GoodsAmount=1200";
  const homeResult = parseCreateShipmentResponse(homeBody);
  assert("Home happy: ok === true + logisticsId", homeResult.ok === true && homeResult.ok && homeResult.logisticsId === "2026052099887766");

  // 失敗 RtnCode !== "1"
  const failBody = "RtnCode=10100050&RtnMsg=收件人手機格式錯誤";
  const failResult = parseCreateShipmentResponse(failBody);
  assert("失敗: ok === false", failResult.ok === false);
  if (!failResult.ok) {
    assert("失敗: rtnCode === '10100050'", failResult.rtnCode === "10100050");
    assert("失敗: rtnMsg 含中文", failResult.rtnMsg.includes("收件人"));
  }

  // RtnCode 成功但缺 AllPayLogisticsID（理論上不會發生，但保險）
  const malformedBody = "RtnCode=1&RtnMsg=OK";
  const malformedResult = parseCreateShipmentResponse(malformedBody);
  assert("RtnCode=1 但缺 AllPayLogisticsID → ok=false", malformedResult.ok === false);

  // 空 body
  const empty = parseCreateShipmentResponse("");
  assert("空 body → ok=false + rtnCode='0'", empty.ok === false && !empty.ok && empty.rtnCode === "0");
}

// ============ [D] store-mock ============

function testStoreMock() {
  console.log("\n[D] store-mock");

  assert("MOCK_STORES 共 10 筆", MOCK_STORES.length === 10);
  assert(
    "每筆 store 都有 storeId / storeName / address",
    MOCK_STORES.every((s) => !!s.storeId && !!s.storeName && !!s.address),
  );

  const unimart = getStoresByChain("UNIMART");
  const family = getStoresByChain("FAMILY");
  assert("getStoresByChain('UNIMART') 5 筆", unimart.length === 5);
  assert("getStoresByChain('FAMILY') 5 筆", family.length === 5);
  assert("UNIMART 全部 storeId 開頭 991", unimart.every((s) => s.storeId.startsWith("991")));
  assert("FAMILY 全部 storeId 開頭 992", family.every((s) => s.storeId.startsWith("992")));

  const ids = new Set(MOCK_STORES.map((s) => s.storeId));
  assert("storeId 全部唯一", ids.size === MOCK_STORES.length);

  assert("findStoreById 找得到 '991001'", findStoreById("991001")?.storeName === "7-11 台大門市");
  assert("findStoreById 找不到 '999999' === undefined", findStoreById("999999") === undefined);
}

// ============ [E] sandbox config ============

function testConfig() {
  console.log("\n[E] sandbox config loader");

  // 暫存 + 清空相關 env 走 fallback
  const saved = {
    env: process.env.ECPAY_LOGISTICS_ENV,
    mid: process.env.ECPAY_LOGISTICS_MERCHANT_ID,
    key: process.env.ECPAY_LOGISTICS_HASH_KEY,
    iv: process.env.ECPAY_LOGISTICS_HASH_IV,
    endpoint: process.env.ECPAY_LOGISTICS_ENDPOINT,
  };
  delete process.env.ECPAY_LOGISTICS_ENV;
  delete process.env.ECPAY_LOGISTICS_MERCHANT_ID;
  delete process.env.ECPAY_LOGISTICS_HASH_KEY;
  delete process.env.ECPAY_LOGISTICS_HASH_IV;
  delete process.env.ECPAY_LOGISTICS_ENDPOINT;

  const cfg = getEcpayLogisticsConfig();
  assert("env === 'sandbox' (default fallback)", cfg.env === "sandbox");
  assert("merchantId fallback === '2000132'", cfg.merchantId === "2000132");
  assert("hashKey fallback === '5294y06JbISpM5x9'", cfg.hashKey === "5294y06JbISpM5x9");
  assert("hashIV fallback === 'v77hoKGq4kWxNNIS'", cfg.hashIV === "v77hoKGq4kWxNNIS");
  assert("endpoint fallback sandbox host", cfg.endpoint.includes("logistics-stage.ecpay.com.tw"));

  // production 缺 credentials 應 throw
  process.env.ECPAY_LOGISTICS_ENV = "production";
  let prodThrew = false;
  try {
    getEcpayLogisticsConfig();
  } catch {
    prodThrew = true;
  }
  assert("production 無 credentials → throw", prodThrew);

  // 還原 env
  if (saved.env === undefined) delete process.env.ECPAY_LOGISTICS_ENV;
  else process.env.ECPAY_LOGISTICS_ENV = saved.env;
  if (saved.mid !== undefined) process.env.ECPAY_LOGISTICS_MERCHANT_ID = saved.mid;
  if (saved.key !== undefined) process.env.ECPAY_LOGISTICS_HASH_KEY = saved.key;
  if (saved.iv !== undefined) process.env.ECPAY_LOGISTICS_HASH_IV = saved.iv;
  if (saved.endpoint !== undefined) process.env.ECPAY_LOGISTICS_ENDPOINT = saved.endpoint;
}

// ============ [F] Order schema 新欄位 ============

async function testOrderSchemaFields() {
  console.log("\n[F] Order schema 新 5 欄位 (migrate 應已 apply)");

  // 撈一筆既有 order，把 5 個物流欄位都當 select 撈出來 → 不噴 prisma 錯誤代表欄位存在
  const sample = await prisma.order.findFirst({
    select: {
      id: true,
      logisticsId: true,
      logisticsSubType: true,
      cvsStoreId: true,
      cvsStoreName: true,
      cvsAddress: true,
    },
  });
  assert("findFirst 可 select 5 個物流欄位（migration applied）", sample !== null || sample === null);

  if (sample) {
    // 既有 row 5 欄位都該是 null（migration 預設）
    assert("既有 row.logisticsId === null", sample.logisticsId === null);
    assert("既有 row.logisticsSubType === null", sample.logisticsSubType === null);
    assert("既有 row.cvsStoreId === null", sample.cvsStoreId === null);
    assert("既有 row.cvsStoreName === null", sample.cvsStoreName === null);
    assert("既有 row.cvsAddress === null", sample.cvsAddress === null);
  }
}

// ============ main ============

async function main() {
  try {
    testLogisticsCheckMac();
    testBuildShipmentParams();
    testParseShipmentResponse();
    testStoreMock();
    testConfig();
    await testOrderSchemaFields();
  } finally {
    await prisma.$disconnect();
  }
  console.log(`\n總計 ${pass + fail} · 通過 ${pass} · 失敗 ${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
