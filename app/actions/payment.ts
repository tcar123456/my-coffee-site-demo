"use server";

// Phase 6 — 付款啟動入口（依 paymentMethod 分派）
// CREDIT_CARD → ECPay：回 `/checkout/processing/[orderNumber]`（內部頁負責 auto-submit form）
// LINE_PAY    → LINE Pay v3：後端打 /v3/payments/request 拿 paymentUrl，回 paymentUrl
// BANK_TRANSFER / COD → manual（沒外部 gateway，client push 到訂單詳情頁顯示匯款資訊）

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { InitiatePaymentResult } from "@/lib/payments/types";
import {
  signLinePayRequest,
  generateNonce,
  LINEPAY_OK,
  type LinePayRequestBody,
  type LinePayRequestResponse,
} from "@/lib/payments/linepay";

export async function initiatePayment(
  orderNumber: string,
): Promise<InitiatePaymentResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "未登入。" };

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true },
  });
  if (!order || order.userId !== session.user.id) {
    return { ok: false, error: "找不到此訂單。" };
  }
  if (order.status !== "PENDING") {
    return { ok: false, error: "此訂單已不是待付款狀態。" };
  }

  switch (order.paymentMethod) {
    case "CREDIT_CARD":
      return initiateEcpay(orderNumber);
    case "LINE_PAY":
      return initiateLinePay(orderNumber);
    case "BANK_TRANSFER":
    case "COD":
      // 沒外部 gateway，回 manual 讓 client push 到訂單詳情頁
      return { ok: true, kind: "manual" };
    default:
      return { ok: false, error: "未支援的付款方式。" };
  }
}

async function initiateEcpay(orderNumber: string): Promise<InitiatePaymentResult> {
  // ECPay AIO 走 HTML form auto-submit，需要 server-render 整頁。
  // 把 user 導到 /checkout/processing/[orderNumber]，那頁 server side 算 CheckMacValue 並 render form。
  // 同時記錄 paymentRequestedAt（之後 callback 可比對時間差）
  await prisma.order.update({
    where: { orderNumber },
    data: { paymentRequestedAt: new Date() },
  });
  return { ok: true, kind: "redirect", url: `/checkout/processing/${orderNumber}` };
}

async function initiateLinePay(orderNumber: string): Promise<InitiatePaymentResult> {
  const channelId = process.env.LINEPAY_CHANNEL_ID;
  const channelSecret = process.env.LINEPAY_CHANNEL_SECRET;
  const apiBase =
    process.env.LINEPAY_SANDBOX_URL || "https://sandbox-api-pay.line.me";
  const appUrl = process.env.APP_URL || "http://localhost:3000";

  if (!channelId || !channelSecret) {
    return {
      ok: false,
      error: "LINE Pay 未設定（請先在 .env.local 設 LINEPAY_CHANNEL_ID / LINEPAY_CHANNEL_SECRET）。",
    };
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true },
  });
  if (!order) return { ok: false, error: "找不到此訂單。" };

  const products = order.items.map((it) => ({
    name: it.productName,
    quantity: it.qty,
    price: it.unitPrice,
  }));

  const body: LinePayRequestBody = {
    amount: order.total,
    currency: "TWD",
    orderId: orderNumber,
    packages: [
      {
        id: `pkg-${order.id.slice(-12)}`,
        amount: order.subtotal + order.shippingFee,
        name: "暮焙 MUBEI 訂單",
        products,
      },
    ],
    redirectUrls: {
      confirmUrl: `${appUrl}/api/payments/linepay/confirm?orderNumber=${orderNumber}`,
      cancelUrl: `${appUrl}/api/payments/linepay/cancel?orderNumber=${orderNumber}`,
    },
  };

  const uri = "/v3/payments/request";
  const nonce = generateNonce();
  const bodyStr = JSON.stringify(body);
  const signature = signLinePayRequest(channelSecret, uri, bodyStr, nonce);

  try {
    const res = await fetch(`${apiBase}${uri}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-LINE-ChannelId": channelId,
        "X-LINE-Authorization-Nonce": nonce,
        "X-LINE-Authorization": signature,
      },
      body: bodyStr,
    });
    const json = (await res.json()) as LinePayRequestResponse;
    if (json.returnCode !== LINEPAY_OK || !json.info?.paymentUrl?.web) {
      await prisma.order.update({
        where: { orderNumber },
        data: {
          paymentFailedAt: new Date(),
          paymentFailReason: `LINE Pay request 失敗：${json.returnCode} ${json.returnMessage}`,
        },
      });
      return {
        ok: false,
        error: `LINE Pay 啟動失敗：${json.returnMessage} (${json.returnCode})`,
      };
    }

    await prisma.order.update({
      where: { orderNumber },
      data: {
        paymentRequestedAt: new Date(),
        paymentTradeNo: String(json.info.transactionId),
      },
    });
    return { ok: true, kind: "redirect", url: json.info.paymentUrl.web };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    await prisma.order.update({
      where: { orderNumber },
      data: {
        paymentFailedAt: new Date(),
        paymentFailReason: `LINE Pay 連線失敗：${msg}`,
      },
    });
    return { ok: false, error: `LINE Pay 連線失敗：${msg}` };
  }
}
