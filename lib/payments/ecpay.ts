// Phase 6 — ECPay AIO 信用卡 sandbox 純函式層
// CheckMacValue 演算法：sort + concat + URL encode + lowercase + .NET 字元相容轉換 + SHA256 + 大寫 hex
// 參考：ECPay 官方文件「AioCheckOut V5」，EncryptType=1 = SHA256（舊版 MD5 已淘汰）

import crypto from "node:crypto";

export interface EcpayAioParams {
  MerchantID: string;
  MerchantTradeNo: string;
  MerchantTradeDate: string;
  PaymentType: "aio";
  TotalAmount: string;
  TradeDesc: string;
  ItemName: string;
  ReturnURL: string;
  ChoosePayment: "Credit" | "ALL";
  EncryptType: "1";
  ClientBackURL?: string;
  OrderResultURL?: string;
  NeedExtraPaidInfo?: "Y" | "N";
  CheckMacValue?: string;
}

export type EcpayCallbackBody = Record<string, string> & {
  CheckMacValue?: string;
  MerchantID?: string;
  MerchantTradeNo?: string;
  RtnCode?: string;
  RtnMsg?: string;
  TradeNo?: string;
  TradeAmt?: string;
  PaymentDate?: string;
  PaymentType?: string;
  SimulatePaid?: string;
};

const NET_REPLACEMENTS: Array<[RegExp, string]> = [
  [/%20/g, "+"],
  [/!/g, "%21"],
  [/\*/g, "%2a"],
  [/'/g, "%27"],
  [/\(/g, "%28"],
  [/\)/g, "%29"],
];

function netUrlEncode(raw: string): string {
  let s = encodeURIComponent(raw).toLowerCase();
  for (const [pat, rep] of NET_REPLACEMENTS) s = s.replace(pat, rep);
  return s;
}

export function calcCheckMacValue(
  params: Record<string, string | number>,
  hashKey: string,
  hashIV: string,
): string {
  const sorted = Object.keys(params)
    .filter((k) => k !== "CheckMacValue")
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map((k) => `${k}=${params[k]}`)
    .join("&");

  const raw = `HashKey=${hashKey}&${sorted}&HashIV=${hashIV}`;
  const encoded = netUrlEncode(raw);
  return crypto.createHash("sha256").update(encoded).digest("hex").toUpperCase();
}

export function verifyCheckMacValue(
  body: Record<string, string>,
  hashKey: string,
  hashIV: string,
): boolean {
  const received = body.CheckMacValue;
  if (!received) return false;
  const expected = calcCheckMacValue(body, hashKey, hashIV);
  if (received.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(received, "utf8"),
      Buffer.from(expected, "utf8"),
    );
  } catch {
    return false;
  }
}

// MerchantTradeNo 限定 [A-Za-z0-9]，長度 ≤ 20。
// 既有訂單編號格式 ORD-YYYYMMDD-NNNN（含 dash），strip 後變 ORDYYYYMMDDNNNN（15 字）。
export function ecpayMerchantTradeNo(orderNumber: string): string {
  const stripped = orderNumber.replace(/[^A-Za-z0-9]/g, "");
  if (stripped.length > 20) return stripped.slice(0, 20);
  return stripped;
}

// MerchantTradeDate 必須是 Asia/Taipei 的 `yyyy/MM/dd HH:mm:ss`
export function formatTaipeiDateTime(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}/${get("month")}/${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

// ItemName 用 "#" 分隔多項商品，上限 400 字元；TradeDesc 上限 200。
// 不能含 form-breaking 字元（& = #），中文 OK。
export function sanitizeText(input: string, maxLen: number): string {
  const cleaned = input.replace(/[&=#]/g, " ");
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen) : cleaned;
}

export interface BuildAioInput {
  merchantId: string;
  hashKey: string;
  hashIV: string;
  merchantTradeNo: string;
  totalAmount: number;
  tradeDesc: string;
  itemName: string;
  returnURL: string;
  clientBackURL?: string;
  orderResultURL?: string;
  now?: Date;
}

export function buildAioParams(input: BuildAioInput): EcpayAioParams {
  const params: EcpayAioParams = {
    MerchantID: input.merchantId,
    MerchantTradeNo: input.merchantTradeNo,
    MerchantTradeDate: formatTaipeiDateTime(input.now ?? new Date()),
    PaymentType: "aio",
    TotalAmount: String(input.totalAmount),
    TradeDesc: sanitizeText(input.tradeDesc, 200),
    ItemName: sanitizeText(input.itemName, 400),
    ReturnURL: input.returnURL,
    ChoosePayment: "Credit",
    EncryptType: "1",
    NeedExtraPaidInfo: "Y",
  };
  if (input.clientBackURL) params.ClientBackURL = input.clientBackURL;
  if (input.orderResultURL) params.OrderResultURL = input.orderResultURL;
  params.CheckMacValue = calcCheckMacValue(
    params as unknown as Record<string, string>,
    input.hashKey,
    input.hashIV,
  );
  return params;
}
