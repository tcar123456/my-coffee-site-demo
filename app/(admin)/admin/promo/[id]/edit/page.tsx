// Phase 5c — 編輯優惠碼頁
// Server component；撈 promo 後轉成 PromoCodeFormInput（Date → datetime-local string）。

import Link from "next/link";
import { notFound } from "next/navigation";
import { getPromoCodeForAdmin } from "@/app/actions/admin-promo";
import { PromoCodeForm } from "../../PromoCodeForm";
import {
  getPromoCodeStatus,
  type PromoCodeFormInput,
  type PromoCodeStatus,
} from "@/lib/schemas/promo-code";

const STATUS_LABEL: Record<PromoCodeStatus, string> = {
  ACTIVE: "進行中",
  SCHEDULED: "尚未開始",
  EXPIRED: "已過期",
  EXHAUSTED: "次數用罄",
  DISABLED: "已停用",
};

const STATUS_PILL: Record<PromoCodeStatus, string> = {
  ACTIVE: "text-success before:bg-success",
  SCHEDULED: "text-accent before:bg-accent",
  EXPIRED: "text-muted before:bg-muted",
  EXHAUSTED: "text-warn before:bg-warn",
  DISABLED: "text-danger before:bg-danger",
};

// HTML datetime-local input 接受 'YYYY-MM-DDTHH:mm'（不含 timezone）
// 直接用 ISO toLocale 切片即可
function dateToInputValue(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function AdminPromoEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const promo = await getPromoCodeForAdmin(id);
  if (!promo) notFound();

  const status = getPromoCodeStatus(promo);
  const initialValues: PromoCodeFormInput = {
    code: promo.code,
    description: promo.description ?? "",
    discountType: promo.discountType,
    discountValue: promo.discountValue,
    minSubtotal: promo.minSubtotal,
    maxUses: promo.maxUses ?? "",
    startsAt: dateToInputValue(promo.startsAt),
    endsAt: dateToInputValue(promo.endsAt),
    isActive: promo.isActive,
  };

  const usedPct =
    promo.maxUses === null
      ? null
      : Math.min(100, Math.round((promo.usedCount / promo.maxUses) * 100));

  return (
    <section className="bg-bg p-[clamp(28px,3.5vw,48px)]">
      <div className="mb-8 border-b border-border pb-6">
        <div className="mb-3 font-mono text-[11px] tracking-[0.18em] uppercase">
          <Link href="/admin" className="text-muted hover:text-accent">
            後台
          </Link>
          <span className="mx-3 text-border">/</span>
          <Link href="/admin/promo" className="text-muted hover:text-accent">
            優惠碼
          </Link>
          <span className="mx-3 text-border">/</span>
          <span className="text-accent">{promo.code}</span>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-mono text-[clamp(28px,3vw,40px)] font-semibold leading-none tracking-[0.04em] text-fg">
              {promo.code}
            </h1>
            <div className="mt-2.5 flex items-center gap-3 font-mono text-[11px] tracking-[0.14em] uppercase">
              <span
                className={`inline-flex items-center gap-1.5 before:size-1.5 before:rounded-full ${STATUS_PILL[status]}`}
              >
                {STATUS_LABEL[status]}
              </span>
              {promo.description && (
                <span className="text-muted">· {promo.description}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid max-w-[1200px] gap-6">
        {/* 使用統計卡 */}
        <div className="border border-border bg-surface px-7 py-6">
          <h2 className="mb-4 font-mono text-[10px] tracking-[0.22em] uppercase text-accent">
            使用統計
          </h2>
          <div className="grid grid-cols-3 gap-6 max-[600px]:grid-cols-1">
            <Stat
              label="已使用"
              value={promo.usedCount.toString()}
              tone="accent"
            />
            <Stat
              label="使用上限"
              value={promo.maxUses?.toString() ?? "無上限"}
              tone="muted"
            />
            <Stat
              label="使用率"
              value={usedPct !== null ? `${usedPct} %` : "—"}
              tone={
                usedPct === null
                  ? "muted"
                  : usedPct >= 100
                    ? "warn"
                    : "fg"
              }
            />
          </div>
          {usedPct !== null && (
            <div className="mt-5 h-1.5 overflow-hidden border border-border bg-bg">
              <div
                className={`h-full ${usedPct >= 100 ? "bg-warn" : "bg-accent"}`}
                style={{ width: `${usedPct}%` }}
              />
            </div>
          )}
          <p className="mt-4 font-mono text-[10px] tracking-[0.08em] text-muted">
            建立於 {new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium", timeStyle: "short" }).format(promo.createdAt)}
            <span className="mx-2 text-border">·</span>
            最後更新 {new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium", timeStyle: "short" }).format(promo.updatedAt)}
          </p>
        </div>

        <PromoCodeForm
          mode="edit"
          promoId={promo.id}
          initialValues={initialValues}
        />
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "accent" | "muted" | "warn" | "fg";
}) {
  const toneClass = {
    accent: "text-accent",
    muted: "text-muted",
    warn: "text-warn",
    fg: "text-fg",
  }[tone];
  return (
    <div>
      <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted">
        {label}
      </div>
      <div className={`mt-2 font-serif text-[28px] tabular-nums ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}
