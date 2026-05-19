"use server";

// Phase 5d — 後台 CSV 匯出 server actions
// 設計：server 端組好 CSV 字串回傳，client 端用 Blob + URL.createObjectURL 觸發下載。
// 比起 Response stream，這條路徑 server action 介面簡單、不需要新開 /api/ route。
// 適用資料量級：8 筆商品 × 數十筆訂單。萬筆以上要改 stream。

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildCsv } from "@/lib/csv";
import { getGrindLabel, getPkgLabel } from "@/lib/cart-options";
import {
  SHIPPING_METHOD_LABELS,
  PAYMENT_METHOD_LABELS,
  type ShippingMethod,
  type PaymentMethod,
} from "@/lib/shipping";
import { ORDER_STATUS_LABEL } from "@/lib/order-state";
import type { OrderStatus } from "@/generated/prisma/enums";

export type CsvExportResult =
  | { ok: true; filename: string; content: string }
  | { ok: false; error: string };

async function requireSeller(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");
  if (session.user.role !== "SELLER") throw new Error("FORBIDDEN");
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function localFilenameDate(): string {
  const d = new Date();
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}`;
}

const ORDER_DATE_FMT = new Intl.DateTimeFormat("zh-TW", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * 訂單匯出：每張訂單一行（多品項以「商品名 × 數量 / ...」串起來）。
 * 含配送資訊 + 金額明細 + 顧客 email + 狀態時間戳。
 */
export async function exportOrdersCsv(params: {
  from?: string;
  to?: string;
}): Promise<CsvExportResult> {
  try {
    await requireSeller();
  } catch {
    return { ok: false, error: "權限不足。" };
  }

  const where: { createdAt?: { gte?: Date; lte?: Date } } = {};
  if (params.from || params.to) {
    where.createdAt = {};
    if (params.from) {
      const d = new Date(params.from);
      if (!Number.isNaN(d.getTime())) where.createdAt.gte = d;
    }
    if (params.to) {
      const d = new Date(params.to);
      if (!Number.isNaN(d.getTime())) where.createdAt.lte = d;
    }
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      items: true,
      user: { select: { email: true, name: true } },
    },
  });

  const headers = [
    "訂單編號",
    "建立時間",
    "狀態",
    "顧客 Email",
    "顧客姓名",
    "收件人",
    "收件電話",
    "郵遞區號",
    "縣市",
    "鄉鎮市區",
    "詳細地址",
    "配送方式",
    "付款方式",
    "小計",
    "運費",
    "總計",
    "品項數",
    "品項明細",
    "付款時間",
    "出貨時間",
    "送達時間",
    "取消時間",
  ];

  const rows = orders.map((o) => {
    const itemsText = o.items
      .map((it) => {
        const grindLabel = it.grind ? getGrindLabel(it.grind) : "";
        const pkgLabel = it.pkg ? getPkgLabel(it.pkg) : "";
        const variant = [grindLabel, pkgLabel].filter(Boolean).join(" / ");
        return variant
          ? `${it.productName}（${variant}）× ${it.qty}`
          : `${it.productName} × ${it.qty}`;
      })
      .join(" | ");
    const status = o.status as OrderStatus;
    const fmtDate = (d: Date | null) =>
      d ? ORDER_DATE_FMT.format(d) : "";
    return [
      o.orderNumber,
      ORDER_DATE_FMT.format(o.createdAt),
      ORDER_STATUS_LABEL[status],
      o.user.email,
      o.user.name ?? "",
      o.recipientName,
      o.recipientPhone,
      o.shippingZipCode,
      o.shippingCity,
      o.shippingDistrict,
      o.shippingStreet,
      SHIPPING_METHOD_LABELS[o.shippingMethod as ShippingMethod] ?? o.shippingMethod,
      PAYMENT_METHOD_LABELS[o.paymentMethod as PaymentMethod] ?? o.paymentMethod,
      o.subtotal,
      o.shippingFee,
      o.total,
      o.items.length,
      itemsText,
      fmtDate(o.paidAt),
      fmtDate(o.shippedAt),
      fmtDate(o.deliveredAt),
      fmtDate(o.cancelledAt),
    ];
  });

  const content = buildCsv({ headers, rows });
  const filename = `orders-${localFilenameDate()}.csv`;
  return { ok: true, filename, content };
}
