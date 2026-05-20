import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWishlistedProductIds } from "@/lib/wishlist-server";
import { UserCartView } from "./UserCartView";
import { GuestCartView } from "./GuestCartView";

type CrossSellItem = {
  no: string;
  roast: string;
  origin: string;
  name: string;
  notes: string;
  price: number;
  weight: string;
  coverVariant?: 1 | 2 | 3 | 4 | 5;
};

const crossSell: CrossSellItem[] = [
  {
    no: "N° 01",
    roast: "淺焙",
    origin: "ETHIOPIA · 衣索比亞",
    name: "耶加雪菲 G1 科契爾 水洗",
    notes: "「蕁麻草、佛手柑、白桃。」",
    price: 580,
    weight: "200g",
  },
  {
    no: "N° 04",
    roast: "中淺",
    origin: "KENYA · 肯亞",
    name: "涅里 卡里魯 AA",
    notes: "「黑醋栗、番茄汁、葡萄柚。」",
    price: 620,
    weight: "200g",
    coverVariant: 2,
  },
  {
    no: "器具",
    roast: "手沖組",
    origin: "EQUIPMENT · 器具",
    name: "HARIO V60 × 暮焙 限定濾杯",
    notes: "「陶瓷材質，附 60 張濾紙。」",
    price: 1280,
    weight: "02 杯份",
    coverVariant: 3,
  },
];

export default async function CartPage() {
  const session = await auth();
  const user = session?.user;

  let dbItems: Awaited<ReturnType<typeof loadDbItems>> = [];
  let wishlistedIds: string[] = [];
  let tier: "TIER_01" | "TIER_02" | "TIER_03" = "TIER_01";
  if (user) {
    const [items, wishlist, dbUser] = await Promise.all([
      loadDbItems(user.id),
      getWishlistedProductIds(user.id).then((s) => Array.from(s)),
      prisma.user.findUnique({
        where: { id: user.id },
        select: { tier: true },
      }),
    ]);
    dbItems = items;
    wishlistedIds = wishlist;
    tier = dbUser?.tier ?? "TIER_01";
  }

  return (
    <>
      {/* Step indicator */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-[var(--max)] items-center justify-center gap-8 px-[var(--gutter)] py-[18px] font-mono text-[11px] tracking-[0.18em] uppercase max-[720px]:gap-3">
          <Step no="01" label="購物車" state="active" />
          <StepRule />
          <Step no="02" label="配送 / 付款" />
          <StepRule />
          <Step no="03" label="確認" />
        </div>
      </section>

      {/* Header */}
      <section className="border-b border-border px-[var(--gutter)] pt-[clamp(40px,5vw,64px)] pb-[clamp(24px,3vw,32px)] text-center">
        <h1 className="text-[clamp(36px,4.6vw,56px)] leading-none">
          你的購物車
        </h1>
        <div className="mt-3.5 font-mono text-[12px] tracking-[0.14em] text-muted">
          {user ? "已登入" : "訪客模式 · 登入後可同步至會員帳號"}
        </div>
      </section>

      {/* Cart body */}
      {user ? (
        <UserCartView
          items={dbItems}
          wishlistedProductIds={wishlistedIds}
          tier={tier}
        />
      ) : (
        <GuestCartView />
      )}

      {/* Cross-sell */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-[var(--max)] px-[var(--gutter)] py-[clamp(48px,6vw,80px)]">
          <div className="mb-[clamp(32px,5vw,64px)] grid grid-cols-[1fr_auto] items-end gap-6 border-b border-border pb-6 max-[640px]:grid-cols-1">
            <div>
              <span className="mb-3.5 block font-mono text-[11px] tracking-[0.18em] uppercase text-accent">
                你可能也會喜歡
              </span>
              <h2 className="text-[32px] leading-[1.1]">
                其他人結帳前還加了這些
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 max-[900px]:grid-cols-2 max-[580px]:grid-cols-1">
            {crossSell.map((item) => (
              <article
                key={item.no + item.name}
                className="group flex flex-col border border-border bg-surface transition-all duration-300 hover:-translate-y-[3px] hover:border-border-hi"
              >
                <div
                  className={`bean-cover ${
                    item.coverVariant
                      ? `bean-cover--alt-${item.coverVariant}`
                      : ""
                  } relative aspect-[4/5] overflow-hidden`}
                >
                  <span className="absolute top-4 left-4 z-10 font-mono text-[10px] tracking-[0.22em] text-fg-2">
                    {item.no}
                  </span>
                  <span className="absolute top-4 right-4 z-10 font-mono text-[10px] tracking-[0.16em] uppercase text-accent">
                    {item.roast}
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-3 p-5">
                  <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted">
                    {item.origin}
                  </span>
                  <h3 className="text-[20px] leading-[1.2] text-fg">
                    {item.name}
                  </h3>
                  <p className="text-[13px] italic leading-[1.5] text-fg-2">
                    {item.notes}
                  </p>
                  <div className="mt-auto flex items-end justify-between border-t border-border pt-4">
                    <div>
                      <div className="font-serif text-[22px] tabular-nums">
                        <span className="mr-1 font-mono text-[11px] tracking-[0.08em] text-muted">
                          NT$
                        </span>
                        {item.price.toLocaleString("zh-TW")}
                      </div>
                      <div className="font-mono text-[10px] tracking-[0.14em] text-muted">
                        {item.weight}
                      </div>
                    </div>
                    <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-accent">
                      加入 →
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

async function loadDbItems(userId: string) {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
        include: {
          product: {
            select: {
              id: true,
              slug: true,
              name: true,
              origin: true,
              price: true,
              weightGram: true,
              stock: true,
              coverVariant: true,
            },
          },
        },
      },
    },
  });
  return cart?.items ?? [];
}

function Step({
  no,
  label,
  state = "idle",
}: {
  no: string;
  label: string;
  state?: "idle" | "active" | "done";
}) {
  const tone =
    state === "active"
      ? "text-accent"
      : state === "done"
        ? "text-accent"
        : "text-muted";
  const numTone =
    state === "active"
      ? "border-accent bg-accent text-bg"
      : state === "done"
        ? "border-accent text-accent"
        : "border-border-hi";
  return (
    <div className={`flex items-center gap-3 ${tone}`}>
      <span
        className={`flex h-[26px] w-[26px] items-center justify-center rounded-full border text-[11px] max-[720px]:h-[22px] max-[720px]:w-[22px] ${numTone}`}
      >
        {no}
      </span>
      <span>{label}</span>
    </div>
  );
}

function StepRule() {
  return (
    <span className="h-px w-12 bg-border max-[720px]:w-4" aria-hidden="true" />
  );
}
