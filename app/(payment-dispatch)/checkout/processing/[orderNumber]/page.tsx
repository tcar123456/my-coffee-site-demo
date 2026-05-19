// Phase 6b — ECPay AIO auto-submit form 頁
// 故意放在 sibling route group (payment-dispatch) 而非 /checkout/ 下，
// 因為 placeOrder 已經清空 cart，繼承 /checkout/layout.tsx 的「cart 空 redirect /cart」會把使用者攔截。
// URL 仍是 /checkout/processing/[orderNumber]，proxy.ts 的 /checkout/:path* matcher 仍守門。

import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEcpayConfig } from "@/lib/payments/ecpay-config";
import {
  buildAioParams,
  ecpayMerchantTradeNo,
} from "@/lib/payments/ecpay";

export const dynamic = "force-dynamic";

export default async function EcpayProcessingPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { orderNumber } = await params;
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true },
  });
  if (!order || order.userId !== session.user.id) notFound();
  if (order.paymentMethod !== "CREDIT_CARD") {
    redirect(`/account/orders/${orderNumber}`);
  }
  if (order.status !== "PENDING") {
    redirect(`/account/orders/${orderNumber}`);
  }

  const cfg = getEcpayConfig();
  const itemName = order.items
    .map((i) => `${i.productName} x${i.qty}`)
    .join("#");

  const aioParams = buildAioParams({
    merchantId: cfg.merchantId,
    hashKey: cfg.hashKey,
    hashIV: cfg.hashIV,
    merchantTradeNo: ecpayMerchantTradeNo(orderNumber),
    totalAmount: order.total,
    tradeDesc: "MUBEI coffee order",
    itemName,
    returnURL: `${cfg.appUrl}/api/payments/ecpay/return`,
    orderResultURL: `${cfg.appUrl}/api/payments/ecpay/result`,
    clientBackURL: `${cfg.appUrl}/account/orders/${orderNumber}`,
  });

  const fields = Object.entries(aioParams).filter(
    ([, v]) => v !== undefined && v !== null,
  ) as Array<[string, string]>;

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-[var(--gutter)] py-16">
      <div className="max-w-md border border-border bg-surface p-8 text-center">
        <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-accent">
          Phase 6b · ECPay Sandbox
        </div>
        <h1 className="mt-3 font-serif text-[28px] leading-tight">
          正在前往刷卡頁面…
        </h1>
        <p className="mt-3 text-[13px] leading-[1.7] text-fg-2">
          系統正將你的訂單 <span className="font-mono">#{orderNumber}</span>{" "}
          安全地交給 ECPay。若 3 秒內未跳轉，請按下方按鈕。
        </p>
        <form
          id="ecpay-form"
          method="POST"
          action={cfg.endpoint}
          acceptCharset="UTF-8"
        >
          {fields.map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <button
            type="submit"
            className="mt-6 inline-flex items-center justify-center gap-2.5 border border-accent bg-accent px-[22px] py-3 font-mono text-[12px] font-semibold tracking-[0.16em] text-bg uppercase"
          >
            前往 ECPay 刷卡 →
          </button>
        </form>
        <p className="mt-6 font-mono text-[10px] tracking-[0.08em] text-muted">
          {cfg.isSandbox ? "Sandbox · 測試模式" : "Production"}
        </p>
        <script
          dangerouslySetInnerHTML={{
            __html: `setTimeout(function(){var f=document.getElementById('ecpay-form'); if(f) f.submit();}, 500);`,
          }}
        />
      </div>
    </main>
  );
}
