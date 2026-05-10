// Phase 3b — 訂單編號 ORD-YYYYMMDD-NNNN
// 用 OrderCounter 表（dailyKey 作 PK）做原子 increment。
// 必須在 transaction 內呼叫，傳入 tx 確保與建單同 transaction（race-safe）。

import type { Prisma } from "../generated/prisma/client";

type Tx = Prisma.TransactionClient;

function dailyKey(date: Date): string {
  const tw = new Date(date.getTime() + 8 * 60 * 60 * 1000); // UTC+8
  const y = tw.getUTCFullYear();
  const m = String(tw.getUTCMonth() + 1).padStart(2, "0");
  const d = String(tw.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export async function generateOrderNumber(tx: Tx, now: Date = new Date()): Promise<string> {
  const key = dailyKey(now);
  const counter = await tx.orderCounter.upsert({
    where: { dailyKey: key },
    update: { lastSeq: { increment: 1 } },
    create: { dailyKey: key, lastSeq: 1 },
    select: { lastSeq: true },
  });
  const seq = String(counter.lastSeq).padStart(4, "0");
  return `ORD-${key}-${seq}`;
}
