// Phase 8c — 物流建單核心 (pure logic with fetch injection)
//
// 抽離自 `app/actions/admin-logistics.ts`：
//   - server action 不允許 fn 參數跨 client/server boundary
//   - smoke test 需要注入 mock fetch，所以把「組 params + POST + 解析」拉到 lib
//
// 不碰 DB / auth / revalidate；那些留在 server action wrapper 內。

import {
  buildCreateShipmentParams,
  parseCreateShipmentResponse,
  ecpayMerchantTradeNo,
} from "./ecpay-logistics";
import type { EcpayLogisticsConfig } from "./ecpay-logistics-config";
import type {
  CreateShipmentResult,
  LogisticsSubType,
  LogisticsType,
} from "./types";

export interface SenderInfo {
  name: string;
  cellPhone: string;
  zipCode: string;
  address: string;
}

export interface PerformCreateShipmentInput {
  config: EcpayLogisticsConfig;
  sender: SenderInfo;
  orderNumber: string;
  total: number;
  goodsName: string;
  recipientName: string;
  recipientPhone: string;
  recipientEmail: string;
  logisticsType: LogisticsType;
  logisticsSubType: LogisticsSubType;
  // CVS
  cvsStoreId?: string;
  // Home
  shippingZipCode?: string;
  shippingAddress?: string;
  now?: Date;
}

export type PerformCreateShipmentResult =
  | { ok: true; logisticsId: string; logisticsSubType: LogisticsSubType }
  | { ok: false; error: string };

/**
 * 純函式：給定 config + order data + fetchImpl，組 params 打 ECPay、解析回應。
 * 不寫 DB。呼叫端負責 update Order.logisticsId / logisticsSubType。
 */
export async function performCreateShipment(
  input: PerformCreateShipmentInput,
  fetchImpl: typeof fetch,
): Promise<PerformCreateShipmentResult> {
  const params = buildCreateShipmentParams({
    merchantId: input.config.merchantId,
    hashKey: input.config.hashKey,
    hashIV: input.config.hashIV,
    merchantTradeNo: ecpayMerchantTradeNo(input.orderNumber),
    logisticsType: input.logisticsType,
    logisticsSubType: input.logisticsSubType,
    goodsAmount: input.total,
    goodsName: input.goodsName,
    senderName: input.sender.name,
    senderCellPhone: input.sender.cellPhone,
    receiverName: input.recipientName,
    receiverCellPhone: input.recipientPhone,
    receiverEmail: input.recipientEmail,
    serverReplyURL: `${input.config.appUrl}/api/logistics/notify`,
    now: input.now,
    ...(input.logisticsType === "CVS"
      ? { receiverStoreId: input.cvsStoreId }
      : {
          senderZipCode: input.sender.zipCode,
          senderAddress: input.sender.address,
          receiverZipCode: input.shippingZipCode,
          receiverAddress: input.shippingAddress,
        }),
  });

  const url = `${input.config.endpoint}/Express/Create`;
  const formBody = new URLSearchParams(
    params as unknown as Record<string, string>,
  ).toString();

  let responseText: string;
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody,
    });
    responseText = await res.text();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return { ok: false, error: `物流 API 連線失敗：${msg}` };
  }

  const parsed: CreateShipmentResult = parseCreateShipmentResponse(responseText);
  if (!parsed.ok) {
    return {
      ok: false,
      error: `物流建單失敗：${parsed.rtnMsg}（${parsed.rtnCode}）`,
    };
  }

  return {
    ok: true,
    logisticsId: parsed.logisticsId,
    logisticsSubType: input.logisticsSubType,
  };
}

// 把 OrderItem[] 串成 GoodsName（綠界限 50 字）
export function buildGoodsName(
  items: Array<{ productName: string; qty: number }>,
): string {
  return items.map((i) => `${i.productName}×${i.qty}`).join(", ");
}

// 從 env 取賣家寄件人資訊（fallback placeholder）
export function getSenderInfoFromEnv(): SenderInfo {
  return {
    name: process.env.SHOP_SENDER_NAME ?? "暮焙咖啡",
    cellPhone: process.env.SHOP_SENDER_CELLPHONE ?? "0900000000",
    zipCode: process.env.SHOP_SENDER_ZIPCODE ?? "10617",
    address:
      process.env.SHOP_SENDER_ADDRESS ?? "10617 台北市大安區羅斯福路四段 1 號",
  };
}
