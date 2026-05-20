// Phase 8a — 綠界物流 sandbox 純函式層
//
// CheckMacValue 演算法：與 AIO 採用相同的 SHA256 規格（綠界統一在 v5 後走 SHA256，
// 物流文件 sandbox 入口參數含 `EncryptType=1`）。
// 直接 re-use `lib/payments/ecpay.ts` 的 `calcCheckMacValue` / `verifyCheckMacValue`
// / `formatTaipeiDateTime`，避免 duplicate 6 字元 .NET URL encode 規則。
//
// 推測標注（**動工 8c 串真 API 前要驗**）：
//   - 物流 CreateShipment 的 success response body 假設是 URL-encoded form
//     （`RtnCode=1&AllPayLogisticsID=...&CheckMacValue=...`）。若實際是 plain text
//     `1|...` 或 JSON，這個 parser 要改。
//   - LogisticsSubType 對應（7-11=UNIMARTC2C / 全家=FAMIC2C / 宅配=TCAT）依綠界
//     文件最新版本，sandbox 需確認啟用了哪些 subType。

import {
  calcCheckMacValue,
  verifyCheckMacValue,
  formatTaipeiDateTime,
  sanitizeText,
  ecpayMerchantTradeNo,
} from "@/lib/payments/ecpay";
import type {
  CreateShipmentRequest,
  CreateShipmentResponseRaw,
  CreateShipmentResult,
  LogisticsSubType,
  LogisticsType,
} from "./types";

// 與 AIO 共用：sort + URLencode (.NET) + SHA256 + uppercase hex
export {
  calcCheckMacValue,
  verifyCheckMacValue,
  formatTaipeiDateTime,
  sanitizeText,
  ecpayMerchantTradeNo,
};

export interface BuildCreateShipmentInput {
  merchantId: string;
  hashKey: string;
  hashIV: string;
  merchantTradeNo: string;
  logisticsType: LogisticsType;
  logisticsSubType: LogisticsSubType;
  goodsAmount: number;
  goodsName: string;
  senderName: string;
  senderCellPhone: string;
  receiverName: string;
  receiverCellPhone: string;
  receiverEmail?: string;
  serverReplyURL: string;
  clientReplyURL?: string;
  isCollection?: boolean;
  collectionAmount?: number;

  // CVS only
  receiverStoreId?: string;

  // Home only
  senderZipCode?: string;
  senderAddress?: string;
  receiverZipCode?: string;
  receiverAddress?: string;
  temperature?: "0001" | "0002" | "0003";
  distance?: "00" | "01" | "02";
  specification?: "0001" | "0002" | "0003" | "0004";

  now?: Date;
}

export function buildCreateShipmentParams(
  input: BuildCreateShipmentInput,
): CreateShipmentRequest {
  const base = {
    MerchantID: input.merchantId,
    MerchantTradeNo: input.merchantTradeNo,
    MerchantTradeDate: formatTaipeiDateTime(input.now ?? new Date()),
    LogisticsType: input.logisticsType,
    LogisticsSubType: input.logisticsSubType,
    GoodsAmount: String(input.goodsAmount),
    GoodsName: sanitizeText(input.goodsName, 50),
    SenderName: sanitizeText(input.senderName, 10),
    SenderCellPhone: input.senderCellPhone,
    ReceiverName: sanitizeText(input.receiverName, 10),
    ReceiverCellPhone: input.receiverCellPhone,
    ServerReplyURL: input.serverReplyURL,
    IsCollection: (input.isCollection ? "Y" : "N") as "Y" | "N",
  };

  let params: CreateShipmentRequest;
  if (input.logisticsType === "CVS") {
    if (!input.receiverStoreId) {
      throw new Error("CVS shipment 必須帶 receiverStoreId");
    }
    params = {
      ...base,
      LogisticsType: "CVS",
      ReceiverStoreID: input.receiverStoreId,
    };
  } else {
    if (
      !input.senderZipCode ||
      !input.senderAddress ||
      !input.receiverZipCode ||
      !input.receiverAddress
    ) {
      throw new Error(
        "Home shipment 必須帶 senderZipCode / senderAddress / receiverZipCode / receiverAddress",
      );
    }
    params = {
      ...base,
      LogisticsType: "Home",
      SenderZipCode: input.senderZipCode,
      SenderAddress: input.senderAddress,
      ReceiverZipCode: input.receiverZipCode,
      ReceiverAddress: input.receiverAddress,
      Temperature: input.temperature ?? "0001",
      Distance: input.distance ?? "00",
      Specification: input.specification ?? "0001",
    };
  }

  if (input.receiverEmail) params.ReceiverEmail = input.receiverEmail;
  if (input.clientReplyURL) params.ClientReplyURL = input.clientReplyURL;
  if (input.isCollection && input.collectionAmount !== undefined) {
    params.CollectionAmount = String(input.collectionAmount);
  }

  params.CheckMacValue = calcCheckMacValue(
    params as unknown as Record<string, string>,
    input.hashKey,
    input.hashIV,
  );
  return params;
}

/**
 * 把 ECPay 物流 CreateShipment 的 URL-encoded form response 解析成 result。
 * 推測：sandbox 回 application/x-www-form-urlencoded body（與其他 ECPay endpoint 一致）。
 * 動工 8c 真打 sandbox 前要驗證 response Content-Type。
 *
 * 規則：
 *   - RtnCode === "1" 且有 AllPayLogisticsID → 成功
 *   - 否則 → 失敗，回 RtnCode + RtnMsg 給後台顯示
 *   - CheckMacValue 不在這裡驗（建單 response 用 outbound 同把 hashKey 算的，呼叫端有需要再加驗）
 */
export function parseCreateShipmentResponse(
  body: string,
): CreateShipmentResult {
  const params = new URLSearchParams(body);
  const raw: CreateShipmentResponseRaw = {};
  for (const [key, value] of params.entries()) {
    (raw as Record<string, string>)[key] = value;
  }

  if (raw.RtnCode === "1" && raw.AllPayLogisticsID) {
    return {
      ok: true,
      logisticsId: raw.AllPayLogisticsID,
      logisticsType: raw.LogisticsType ?? "",
      goodsAmount: parseInt(raw.GoodsAmount ?? "0", 10),
      raw,
    };
  }
  return {
    ok: false,
    rtnCode: raw.RtnCode ?? "0",
    rtnMsg: raw.RtnMsg ?? "未知錯誤",
  };
}
