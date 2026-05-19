// Phase 6b — ECPay ReturnURL（server-to-server callback）
// 真實狀態來源。流程：
//   ECPay 後端 POST formData → 驗 CheckMacValue → 比對 MerchantID/TradeAmt → update order → 回 "1|OK"
// 任何錯誤都仍回 "1|OK" 嗎？不 — 回 "0|<reason>" 讓 ECPay 重試（除非已 PAID 是冪等成功）

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getEcpayConfig } from "@/lib/payments/ecpay-config";
import {
  verifyCheckMacValue,
  ecpayMerchantTradeNo,
} from "@/lib/payments/ecpay";

export const dynamic = "force-dynamic";

function plain(body: string) {
  return new NextResponse(body, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function POST(req: NextRequest) {
  const cfg = getEcpayConfig();
  const formData = await req.formData();
  const body: Record<string, string> = {};
  for (const [k, v] of formData.entries()) body[k] = String(v);

  // 1. 驗 CheckMacValue
  if (!verifyCheckMacValue(body, cfg.hashKey, cfg.hashIV)) {
    console.warn("[ecpay/return] CheckMacValue 驗證失敗", { body });
    return plain("0|CheckMacValueInvalid");
  }

  // 2. MerchantID 比對
  if (body.MerchantID !== cfg.merchantId) {
    console.warn("[ecpay/return] MerchantID 不符", body.MerchantID);
    return plain("0|MerchantIDMismatch");
  }

  const tradeNo = body.MerchantTradeNo;
  if (!tradeNo) return plain("0|MissingMerchantTradeNo");

  // 3. 比對 DB 訂單（MerchantTradeNo = ecpayMerchantTradeNo(orderNumber)）
  // 既有訂單編號 ORD-YYYYMMDD-NNNN 被 strip 成 ORDYYYYMMDDNNNN，反查需 like
  // 安全做法：撈所有可能 candidate（同前綴），確認 strip 後是否 match
  const candidates = await prisma.order.findMany({
    where: { orderNumber: { contains: tradeNo.slice(3, 11) } },
    select: { id: true, orderNumber: true, total: true, status: true, userId: true },
  });
  const order = candidates.find(
    (o) => ecpayMerchantTradeNo(o.orderNumber) === tradeNo,
  );
  if (!order) {
    console.warn("[ecpay/return] 找不到對應訂單", { tradeNo });
    return plain("0|OrderNotFound");
  }

  // 4. 金額竄改防護
  const callbackAmt = parseInt(body.TradeAmt || "0", 10);
  if (callbackAmt !== order.total) {
    console.warn("[ecpay/return] TradeAmt 與 DB total 不符", {
      callbackAmt,
      dbTotal: order.total,
    });
    return plain("0|AmountMismatch");
  }

  // 5. 冪等：已 PAID 直接回 1|OK（不再寫 DB）
  if (order.status === "PAID") {
    return plain("1|OK");
  }
  if (order.status !== "PENDING") {
    // 已 SHIPPED/DELIVERED/CANCELLED 不該被 callback 影響
    console.warn("[ecpay/return] 訂單已非 PENDING", { status: order.status });
    return plain("0|InvalidStatus");
  }

  const rtnCode = body.RtnCode;
  const ecpayTradeNo = body.TradeNo;

  // 6. 失敗路徑
  if (rtnCode !== "1") {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentFailedAt: new Date(),
        paymentFailReason: `${rtnCode} ${body.RtnMsg ?? ""}`.trim(),
        paymentTradeNo: ecpayTradeNo ?? null,
      },
    });
    revalidatePath(`/account/orders/${order.orderNumber}`);
    // 失敗仍回 1|OK，因為 ECPay 已盡到通知義務，不需重試
    return plain("1|OK");
  }

  // 7. 成功路徑：PENDING → PAID
  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "PAID",
      paidAt: new Date(),
      paymentTradeNo: ecpayTradeNo ?? null,
      paymentFailedAt: null,
      paymentFailReason: null,
    },
  });
  revalidatePath(`/account/orders/${order.orderNumber}`);
  revalidatePath("/account/orders");
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  return plain("1|OK");
}
