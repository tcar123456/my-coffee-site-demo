// Phase 6c — LINE Pay confirmUrl
// 流程：user 在 LINE Pay 確認付款 → LINE Pay 把瀏覽器 GET redirect 回此 URL
//      query string 帶 transactionId / orderId（我們在 initiate 時已存進 paymentTradeNo）
//      → 後端 POST /v3/payments/{transactionId}/confirm → returnCode "0000" 才 update DB → redirect 到訂單詳情

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  buildLinePayHeaders,
  generateNonce,
  LINEPAY_OK,
  type LinePayConfirmBody,
  type LinePayConfirmResponse,
} from "@/lib/payments/linepay";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const channelId = process.env.LINEPAY_CHANNEL_ID;
  const channelSecret = process.env.LINEPAY_CHANNEL_SECRET;
  const apiBase =
    process.env.LINEPAY_SANDBOX_URL || "https://sandbox-api-pay.line.me";
  // base URL 用 env 而非 req.url；tunnel 開發時 req 的 host 會是 localhost
  const appUrl = process.env.APP_URL || "http://localhost:3000";

  const { searchParams } = new URL(req.url);
  const transactionId = searchParams.get("transactionId");
  const orderNumber = searchParams.get("orderNumber");

  if (!transactionId || !orderNumber) {
    return NextResponse.redirect(new URL("/account/orders", appUrl), 303);
  }

  if (!channelId || !channelSecret) {
    console.warn("[linepay/confirm] 缺 LINEPAY_CHANNEL_ID/SECRET");
    return NextResponse.redirect(
      new URL(`/account/orders/${orderNumber}`, appUrl),
      303,
    );
  }

  const order = await prisma.order.findUnique({ where: { orderNumber } });
  if (!order) {
    return NextResponse.redirect(new URL("/account/orders", appUrl), 303);
  }

  // 防 replay：transactionId 必須跟 initiate 時記錄的一致（即 paymentTradeNo）
  if (order.paymentTradeNo && order.paymentTradeNo !== transactionId) {
    console.warn("[linepay/confirm] transactionId mismatch", {
      stored: order.paymentTradeNo,
      received: transactionId,
    });
    return NextResponse.redirect(
      new URL(`/account/orders/${orderNumber}`, appUrl),
      303,
    );
  }

  // 冪等：已 PAID 直接 redirect 到訂單頁
  if (order.status === "PAID") {
    return NextResponse.redirect(
      new URL(`/account/orders/${orderNumber}`, appUrl),
      303,
    );
  }
  if (order.status !== "PENDING") {
    return NextResponse.redirect(
      new URL(`/account/orders/${orderNumber}`, appUrl),
      303,
    );
  }

  const uri = `/v3/payments/${transactionId}/confirm`;
  const confirmBody: LinePayConfirmBody = {
    amount: order.total,
    currency: "TWD",
  };
  const bodyStr = JSON.stringify(confirmBody);
  const nonce = generateNonce();
  const headers = buildLinePayHeaders({
    channelId,
    channelSecret,
    uri,
    body: bodyStr,
    nonce,
  });

  try {
    const res = await fetch(`${apiBase}${uri}`, {
      method: "POST",
      headers,
      body: bodyStr,
    });
    const json = (await res.json()) as LinePayConfirmResponse;

    if (json.returnCode !== LINEPAY_OK) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentFailedAt: new Date(),
          paymentFailReason: `LINE Pay confirm 失敗：${json.returnCode} ${json.returnMessage}`,
        },
      });
      revalidatePath(`/account/orders/${orderNumber}`);
      return NextResponse.redirect(
        new URL(`/account/orders/${orderNumber}`, appUrl),
        303,
      );
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        paymentTradeNo: String(json.info?.transactionId ?? transactionId),
        paymentFailedAt: null,
        paymentFailReason: null,
      },
    });
    revalidatePath(`/account/orders/${orderNumber}`);
    revalidatePath("/account/orders");
    revalidatePath("/admin");
    revalidatePath("/admin/orders");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentFailedAt: new Date(),
        paymentFailReason: `LINE Pay confirm 連線失敗：${msg}`,
      },
    });
  }

  return NextResponse.redirect(
    new URL(`/account/orders/${orderNumber}`, appUrl),
    303,
  );
}
