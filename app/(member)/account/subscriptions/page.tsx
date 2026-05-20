import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listSubscriptions } from "@/app/actions/subscription";
import { Button } from "@/components/ui/Button";
import { SubscriptionActions } from "./SubscriptionActions";
import type {
  SubscriptionStatus,
  SubscriptionPlan,
  SubscriptionCadence,
} from "@/generated/prisma/enums";

const planLabel: Record<SubscriptionPlan, string> = {
  DUAL_BEANS_BIWEEKLY: "雙週兩支 · 一深一淺",
  SINGLE_BEAN_MONTHLY: "單支精選 · 月配",
};

const cadenceLabel: Record<SubscriptionCadence, string> = {
  BIWEEKLY: "每 14 天",
  MONTHLY: "每月一次",
};

const statusLabel: Record<SubscriptionStatus, string> = {
  ACTIVE: "進行中",
  PAUSED: "已暫停",
  CANCELLED: "已取消",
};

const statusPillClasses: Record<SubscriptionStatus, string> = {
  ACTIVE: "text-accent border-accent-tint before:bg-accent",
  PAUSED: "text-warn border-[oklch(45%_0.10_70)] before:bg-warn",
  CANCELLED: "text-muted border-border before:bg-muted",
};

const dateFormatter = new Intl.DateTimeFormat("zh-TW", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export default async function SubscriptionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const subs = await listSubscriptions();

  return (
    <>
      {/* ========== Header ========== */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-[var(--max)] px-[var(--gutter)] py-[clamp(40px,5vw,64px)]">
          <div className="mb-3 font-mono text-[11px] tracking-[0.18em] uppercase text-accent">
            <Link href="/account" className="text-muted hover:text-accent">
              ← 會員中心
            </Link>
            <span className="mx-3 text-border">/</span>
            訂閱配送
          </div>
          <h1 className="text-[clamp(28px,3.6vw,44px)] leading-none tracking-[-0.01em]">
            訂閱配送
          </h1>
          <div className="mt-3 font-mono text-[11px] tracking-[0.14em] uppercase text-muted">
            共 {subs.length.toString().padStart(2, "0")} 個方案
          </div>
        </div>
      </section>

      {/* ========== Body ========== */}
      <section className="mx-auto max-w-[var(--max)] px-[var(--gutter)] pt-[clamp(32px,4vw,56px)] pb-[clamp(64px,8vw,112px)]">
        {subs.length === 0 ? (
          <div className="border border-border bg-surface px-[var(--gutter)] py-[clamp(64px,8vw,112px)] text-center">
            <p className="text-[24px] leading-[1.4] text-fg-2">
              尚未訂閱任何方案
            </p>
            <p className="mt-3 font-mono text-[12px] tracking-[0.08em] text-muted">
              讓主理人替你選豆，省下挑豆的時間。
            </p>
            <div className="mt-8 flex justify-center">
              <Button href="#" variant="primary">
                了解訂閱配送 →
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {subs.map((s) => {
              const cancelled = s.status === "CANCELLED";
              const paused = s.status === "PAUSED";
              return (
                <div
                  key={s.id}
                  className={`grid grid-cols-[1fr_auto] items-start gap-8 border p-[clamp(20px,3vw,32px)] max-[720px]:grid-cols-1 ${
                    cancelled
                      ? "border-border bg-surface opacity-70"
                      : paused
                        ? "border-[oklch(45%_0.10_70)]/40 bg-surface"
                        : "border-accent-tint bg-surface-2"
                  }`}
                >
                  <div>
                    <div className="mb-3 flex flex-wrap items-center gap-3">
                      <span className="font-mono text-[11px] tracking-[0.18em] uppercase text-accent">
                        {planLabel[s.plan]}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 border px-2.5 py-[5px] font-mono text-[10px] tracking-[0.16em] uppercase before:size-1.5 before:rounded-full ${statusPillClasses[s.status]}`}
                      >
                        {statusLabel[s.status]}
                      </span>
                    </div>
                    <h2 className="mb-3 text-[26px] leading-[1.1]">
                      {planLabel[s.plan]}
                    </h2>
                    <div className="flex flex-wrap gap-x-8 gap-y-3 font-mono text-[11px] tracking-[0.04em] text-muted">
                      <SubMeta
                        value={`NT$ ${s.pricePerShipment.toLocaleString("zh-TW")}`}
                        tail={cadenceLabel[s.cadence]}
                      />
                      <SubMeta
                        value={`已配送 ${s.shipmentsDelivered.toString().padStart(2, "0")} 期`}
                        tail={`共續訂 ${s.totalShipments.toString().padStart(2, "0")} 期`}
                      />
                      {!cancelled && (
                        <SubMeta
                          value={`下次出貨 ${dateFormatter.format(s.nextShipAt)}`}
                          tail={paused ? "暫停中 · 不會出貨" : undefined}
                        />
                      )}
                      {cancelled && s.cancelledAt && (
                        <SubMeta
                          value={`已於 ${dateFormatter.format(s.cancelledAt)} 取消`}
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 max-[720px]:items-start">
                    <SubscriptionActions
                      subscriptionId={s.id}
                      status={s.status}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

function SubMeta({ value, tail }: { value: string; tail?: string }) {
  return (
    <span>
      <strong className="mb-1 block font-serif text-[18px] font-normal text-accent">
        {value}
      </strong>
      {tail}
    </span>
  );
}
