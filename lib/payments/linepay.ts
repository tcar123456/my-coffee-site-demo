// Phase 6 — LINE Pay v3 sandbox 純函式層
// 兩段式流程：
//   1) POST /v3/payments/request → 拿 info.paymentUrl.web
//   2) user 在 LINE Pay 確認後 GET 回我們的 confirmUrl（帶 transactionId/orderId）
//   3) POST /v3/payments/{transactionId}/confirm → 收到 returnCode "0000" 才算成功
//
// 簽章：Base64(HMAC-SHA256(channelSecret, channelSecret + URI + body + nonce))
// 來源：developers-pay.line.me/online-api-v3

import crypto from "node:crypto";

export function generateNonce(): string {
  return crypto.randomUUID();
}

/**
 * LINE Pay v3 簽章。`bodyOrQuery` 給 POST 用 JSON.stringify 過的 body；
 * GET 則放 sorted query string（不含 leading `?`）。
 */
export function signLinePayRequest(
  channelSecret: string,
  uri: string,
  bodyOrQuery: string,
  nonce: string,
): string {
  const message = channelSecret + uri + bodyOrQuery + nonce;
  return crypto.createHmac("sha256", channelSecret).update(message).digest("base64");
}

export interface LinePayProduct {
  name: string;
  quantity: number;
  price: number;
  imageUrl?: string;
}

export interface LinePayPackage {
  id: string;
  amount: number;
  name?: string;
  products: LinePayProduct[];
}

export interface LinePayRequestBody {
  amount: number;
  currency: "TWD" | "USD" | "THB";
  orderId: string;
  packages: LinePayPackage[];
  redirectUrls: {
    confirmUrl: string;
    cancelUrl: string;
  };
}

export interface LinePayRequestResponse {
  returnCode: string;
  returnMessage: string;
  info?: {
    transactionId: number;
    paymentAccessToken?: string;
    paymentUrl: {
      web: string;
      app?: string;
    };
  };
}

export interface LinePayConfirmBody {
  amount: number;
  currency: "TWD" | "USD" | "THB";
}

export interface LinePayConfirmResponse {
  returnCode: string;
  returnMessage: string;
  info?: {
    orderId: string;
    transactionId: number;
    payInfo?: Array<{ method: string; amount: number }>;
  };
}

export const LINEPAY_OK = "0000";

export interface BuildHeadersInput {
  channelId: string;
  channelSecret: string;
  uri: string;
  body: string;
  nonce?: string;
}

export function buildLinePayHeaders(input: BuildHeadersInput): Record<string, string> {
  const nonce = input.nonce ?? generateNonce();
  const signature = signLinePayRequest(
    input.channelSecret,
    input.uri,
    input.body,
    nonce,
  );
  return {
    "Content-Type": "application/json",
    "X-LINE-ChannelId": input.channelId,
    "X-LINE-Authorization-Nonce": nonce,
    "X-LINE-Authorization": signature,
  };
}
