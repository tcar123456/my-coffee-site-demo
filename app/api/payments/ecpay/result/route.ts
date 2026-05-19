// Phase 6b — ECPay OrderResultURL（瀏覽器 redirect 落點）
// 純展示用，不更新 DB。POST body 跟 ReturnURL 幾乎一樣。
// 直接 redirect 回 /account/orders/[orderNumber] 讓 user 看真實狀態（從 DB 讀，由 ReturnURL 寫入）

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ecpayMerchantTradeNo } from "@/lib/payments/ecpay";
import { getEcpayConfig } from "@/lib/payments/ecpay-config";

export const dynamic = "force-dynamic";

// 注意：base URL 用 cfg.appUrl 而非 req.url。
// 開發環境走 cloudflared / ngrok tunnel 時，Next.js 收到的 Host header 會是 localhost:3000（tunnel 內部 forward），
// 用 req.url 算 redirect 會跑到 https://localhost:3000，瀏覽器打不開。

export async function POST(req: NextRequest) {
  const cfg = getEcpayConfig();
  const formData = await req.formData();
  const tradeNo = formData.get("MerchantTradeNo")?.toString();

  if (!tradeNo) {
    return NextResponse.redirect(new URL("/account/orders", cfg.appUrl), 303);
  }

  const candidates = await prisma.order.findMany({
    where: { orderNumber: { contains: tradeNo.slice(3, 11) } },
    select: { orderNumber: true },
  });
  const order = candidates.find(
    (o) => ecpayMerchantTradeNo(o.orderNumber) === tradeNo,
  );

  const dest = order
    ? `/account/orders/${order.orderNumber}`
    : "/account/orders";
  return NextResponse.redirect(new URL(dest, cfg.appUrl), 303);
}
