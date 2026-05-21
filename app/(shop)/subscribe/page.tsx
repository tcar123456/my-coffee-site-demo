import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/Button";
import { subscribeToPlanForm } from "@/app/actions/subscription";
import { SubscriptionPlan } from "@/generated/prisma/enums";

export const metadata: Metadata = {
  title: "訂閱配送 — 暮焙",
  description:
    "讓主理人替你選豆。雙週兩支或月配單支，省下挑豆的時間，把每週早晨交給暮焙。",
};

type PlanCard = {
  plan: SubscriptionPlan;
  badge?: string;
  title: string;
  detail: string;
  price: number;
  unit: string;
  highlights: string[];
};

const PLAN_CARDS: PlanCard[] = [
  {
    plan: SubscriptionPlan.DUAL_BEANS_BIWEEKLY,
    badge: "最多人選",
    title: "雙週兩支 · 一深一淺",
    detail: "200g × 2 · 含主理人手沖筆記",
    price: 1180,
    unit: "NT / 雙週",
    highlights: [
      "每 14 天出貨一次，可隨時暫停一期",
      "主理人選豆，一支淺焙、一支中深",
      "出貨前 48 小時可調整配送週期",
    ],
  },
  {
    plan: SubscriptionPlan.SINGLE_BEAN_MONTHLY,
    title: "單支精選 · 月配",
    detail: "200g × 1 · 隨季更換",
    price: 580,
    unit: "NT / 月",
    highlights: [
      "每 30 天出貨一次",
      "適合日常用量穩定 1-2 杯 / 天",
      "可加購器具，享訂閱會員價",
    ],
  },
];

type SearchParams = Promise<{ error?: string }>;

export default async function SubscribePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error } = await searchParams;
  const session = await auth();
  const userId = session?.user?.id;

  const activeOrPaused = userId
    ? await prisma.subscription.findMany({
        where: { userId, status: { in: ["ACTIVE", "PAUSED"] } },
        select: { plan: true },
      })
    : [];
  const subscribedPlans = new Set(activeOrPaused.map((s) => s.plan));

  return (
    <>
      {/* ========== Header ========== */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-[var(--max)] px-[var(--gutter)] py-[clamp(48px,6vw,80px)]">
          <div className="mb-4 font-mono text-[11px] tracking-[0.18em] uppercase text-accent">
            <Link href="/" className="text-muted hover:text-accent">
              首頁
            </Link>
            <span className="mx-3 text-border">/</span>
            訂閱配送
          </div>
          <h1 className="max-w-[18ch] text-[clamp(36px,4.6vw,60px)] tracking-[-0.02em] text-fg">
            把選豆這件事，
            <br />
            交給主理人。
          </h1>
          <p className="mt-5 max-w-[52ch] text-[15px] leading-[1.65] text-fg-2">
            訂閱方案不綁約、隨時可暫停或取消。出貨前一週會收到下一支豆款的產地手記與沖煮建議。
          </p>
        </div>
      </section>

      {error && (
        <div className="border-b border-[oklch(45%_0.18_25)]/40 bg-[oklch(28%_0.05_25)]/30 px-[var(--gutter)] py-3">
          <div className="mx-auto max-w-[var(--max)] font-mono text-[12px] tracking-[0.08em] text-[oklch(85%_0.12_25)]">
            {error}
          </div>
        </div>
      )}

      {/* ========== Plans ========== */}
      <section className="mx-auto max-w-[var(--max)] px-[var(--gutter)] pt-[clamp(40px,5vw,72px)] pb-[clamp(64px,8vw,112px)]">
        <div className="grid grid-cols-2 gap-7 max-[860px]:grid-cols-1">
          {PLAN_CARDS.map((card) => {
            const alreadySubscribed = subscribedPlans.has(card.plan);
            return (
              <article
                key={card.plan}
                className="flex flex-col gap-6 border border-border bg-surface p-[clamp(24px,3vw,40px)]"
              >
                {card.badge && (
                  <span className="self-start border border-accent-tint bg-bg px-2.5 py-1 font-mono text-[10px] tracking-[0.18em] uppercase text-accent">
                    {card.badge}
                  </span>
                )}
                <div>
                  <h2 className="text-[clamp(26px,3vw,36px)] text-fg">
                    {card.title}
                  </h2>
                  <div className="mt-2 font-mono text-[12px] tracking-[0.06em] text-muted">
                    {card.detail}
                  </div>
                </div>

                <div className="flex items-baseline gap-2 border-y border-border py-5">
                  <span className="font-mono text-[12px] tracking-[0.12em] text-muted">
                    NT$
                  </span>
                  <span className="font-serif text-[44px] leading-none tabular-nums">
                    {card.price.toLocaleString("zh-TW")}
                  </span>
                  <span className="ml-1 font-mono text-[11px] tracking-[0.14em] text-muted">
                    {card.unit}
                  </span>
                </div>

                <ul className="flex flex-col gap-2.5 font-mono text-[12px] leading-[1.6] tracking-[0.02em] text-fg-2">
                  {card.highlights.map((h) => (
                    <li key={h} className="relative pl-4">
                      <span className="absolute left-0 text-accent">—</span>
                      {h}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-2">
                  {!userId ? (
                    <Button
                      href={`/login?callbackUrl=${encodeURIComponent("/subscribe")}`}
                      variant="primary"
                      block
                    >
                      登入後訂閱 →
                    </Button>
                  ) : alreadySubscribed ? (
                    <Button
                      href="/account/subscriptions"
                      variant="ghost"
                      block
                    >
                      已訂閱 · 查看訂閱
                    </Button>
                  ) : (
                    <form action={subscribeToPlanForm}>
                      <input type="hidden" name="plan" value={card.plan} />
                      <button
                        type="submit"
                        className="inline-flex w-full items-center justify-center gap-2.5 border border-accent bg-accent px-[22px] py-3.5 font-mono text-[12px] font-semibold tracking-[0.16em] uppercase text-bg transition-colors hover:border-accent-hi hover:bg-accent-hi"
                      >
                        立即訂閱 →
                      </button>
                    </form>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {/* ========== FAQ-lite ========== */}
        <div className="mt-[clamp(48px,6vw,96px)] grid grid-cols-3 gap-px border border-border bg-border max-[860px]:grid-cols-1">
          {[
            {
              title: "出貨節奏",
              body: "每週一烘焙、隔日出貨。訂閱會在排定的配送日自動安排下一筆出貨。",
            },
            {
              title: "暫停 / 取消",
              body: "出貨前 48 小時都可在會員中心暫停一期；取消後仍可在訂閱紀錄中重新訂閱。",
            },
            {
              title: "金流方式",
              body: "目前支援信用卡、LINE Pay、轉帳；首期成功扣款後才開始計算訂閱週期。",
            },
          ].map((faq) => (
            <div key={faq.title} className="bg-surface p-7">
              <h3 className="text-[18px] text-fg">{faq.title}</h3>
              <p className="mt-3 text-[13px] leading-[1.7] text-fg-2">
                {faq.body}
              </p>
            </div>
          ))}
        </div>

        {userId && (
          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6 font-mono text-[11px] tracking-[0.14em] uppercase">
            <span className="text-muted">
              已有訂閱方案？前往會員中心管理
            </span>
            <Link
              href="/account/subscriptions"
              className="text-muted transition-colors hover:text-accent"
            >
              管理訂閱 →
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
