// Phase 6c — LINE Pay cancelUrl
// user 在 LINE Pay 頁面按「取消」→ redirect 回這裡。訂單仍是 PENDING，user 可重新付款。
// 我們僅記錄 paymentFailedAt + reason，方便顧客看到訊息。

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const { searchParams } = new URL(req.url);
  const orderNumber = searchParams.get("orderNumber");
  if (!orderNumber) {
    return NextResponse.redirect(new URL("/account/orders", appUrl), 303);
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: { id: true, status: true },
  });
  if (order && order.status === "PENDING") {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentFailedAt: new Date(),
        paymentFailReason: "LINE Pay 已取消（user 在付款頁返回）",
      },
    });
    revalidatePath(`/account/orders/${orderNumber}`);
  }

  return NextResponse.redirect(
    new URL(`/account/orders/${orderNumber}`, appUrl),
    303,
  );
}
