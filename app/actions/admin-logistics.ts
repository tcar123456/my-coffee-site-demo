"use server";

// Phase 8c — 賣家後台「建立物流單」server action（thin wrapper）
//
// 業務邏輯：auth + db 撈/寫，HTTP 部分委派給 lib/logistics/create-shipment.ts
// （那邊純函式 + fetchImpl 注入，方便 smoke test）。

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEcpayLogisticsConfig } from "@/lib/logistics/ecpay-logistics-config";
import { SHIPPING_METHOD_TO_SUBTYPE } from "@/lib/logistics/types";
import {
  performCreateShipment,
  buildGoodsName,
  getSenderInfoFromEnv,
} from "@/lib/logistics/create-shipment";

export type CreateShipmentActionResult =
  | { ok: true; logisticsId: string; logisticsSubType: string }
  | { ok: false; error: string };

async function requireSeller(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");
  if (session.user.role !== "SELLER") throw new Error("FORBIDDEN");
}

export async function createShipmentForOrder(
  orderNumber: string,
): Promise<CreateShipmentActionResult> {
  try {
    await requireSeller();
  } catch {
    return { ok: false, error: "權限不足。" };
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true, user: { select: { email: true } } },
  });
  if (!order) return { ok: false, error: "找不到此訂單。" };

  if (order.status !== "PAID") {
    return { ok: false, error: "訂單必須為已付款狀態才能建立物流單。" };
  }
  if (order.logisticsId) {
    return {
      ok: false,
      error: `此訂單已建立物流單（${order.logisticsId}），不可重複建單。`,
    };
  }

  const mapping =
    SHIPPING_METHOD_TO_SUBTYPE[
      order.shippingMethod as keyof typeof SHIPPING_METHOD_TO_SUBTYPE
    ];
  if (!mapping) {
    return { ok: false, error: "未支援的配送方式。" };
  }

  if (mapping.type === "CVS" && !order.cvsStoreId) {
    return {
      ok: false,
      error: "此 CVS 訂單缺少門市資訊，無法建立物流單。",
    };
  }

  const result = await performCreateShipment(
    {
      config: getEcpayLogisticsConfig(),
      sender: getSenderInfoFromEnv(),
      orderNumber: order.orderNumber,
      total: order.total,
      goodsName: buildGoodsName(order.items),
      recipientName: order.recipientName,
      recipientPhone: order.recipientPhone,
      recipientEmail: order.user.email,
      logisticsType: mapping.type,
      logisticsSubType: mapping.subType,
      cvsStoreId: order.cvsStoreId ?? undefined,
      shippingZipCode: order.shippingZipCode,
      shippingAddress: `${order.shippingCity}${order.shippingDistrict}${order.shippingStreet}`,
    },
    fetch,
  );

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      logisticsId: result.logisticsId,
      logisticsSubType: result.logisticsSubType,
    },
  });

  revalidatePath(`/admin/orders/${orderNumber}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  revalidatePath(`/account/orders/${orderNumber}`);

  return {
    ok: true,
    logisticsId: result.logisticsId,
    logisticsSubType: result.logisticsSubType,
  };
}
