import Image from "next/image";
import { Button } from "@/components/ui/Button";

const featuredBeans = [
  {
    no: "01",
    roast: "淺焙",
    origin: "ETHIOPIA · 衣索比亞",
    name: ["耶加雪菲 G1", "科契爾 水洗"],
    notes: "蕁麻草、佛手柑、白桃 — 喉韻像剛開封的紅茶。",
    price: 580,
    weight: "200g · 全豆/中粗研磨",
    image: {
      url: "https://images.unsplash.com/photo-1597974909271-513c5d42290c?w=900&q=80",
      alt: "耶加雪菲 淺焙咖啡豆",
    },
  },
  {
    no: "02",
    roast: "中焙",
    origin: "COLOMBIA · 哥倫比亞",
    name: ["拉斯佛羅雷斯", "厭氧 72 小時"],
    notes: "蘭姆酒、葡萄乾、黑可可 — 收尾帶一絲威士忌的甜。",
    price: 720,
    weight: "200g · 全豆/中粗研磨",
    image: {
      url: "https://images.unsplash.com/photo-1597816792530-f6d57bd2bf9e?w=900&q=80",
      alt: "成熟的紅色咖啡櫻桃 — 哥倫比亞 Las Flores",
    },
  },
  {
    no: "03",
    roast: "淺焙",
    origin: "PANAMA · 巴拿馬",
    name: ["翡翠莊園", "藝伎 紅標"],
    notes: "茉莉、蜂蜜、白色花卉 — 是一杯像會香水般綻放的咖啡。",
    price: 1680,
    weight: "100g · 全豆 · 數量稀少",
    image: {
      url: "https://images.unsplash.com/photo-1442550528053-c431ecb55509?w=900&q=80",
      alt: "翡翠藝伎 精品淺焙咖啡豆",
    },
  },
];

const dispatches = [
  {
    lead: true,
    label: "ROASTING ROOM / 04",
    date: "FIELD NOTE / 05.02 — 五分鐘閱讀",
    title: "為什麼我們堅持每週一才烘豆 — 而不是「現點現烘」",
    deck: "一支咖啡豆從烘焙完成到風味最穩定，需要 7 至 10 天的「養豆期」。把這個過程透明化，是我們對熟客的承諾。",
    byline: "文 / 主理人 林子翔 — Roastmaster",
    image: {
      url: "https://images.unsplash.com/photo-1736592506186-6bc73c7d1424?w=1200&q=80",
      alt: "圍裙烘豆師舀取烘焙完成的咖啡豆",
    },
  },
  {
    lead: false,
    label: "GESHA SCREENING",
    date: "PRODUCER / 04.18",
    title: "翡翠莊園藝伎到貨：今年最香的一批",
    deck: "連續 14 屆 BoP 冠軍的莊園，今年我們只拿到 12 公斤紅標。先到先得。",
    byline: "文 / Ada Yu",
    image: {
      url: "https://images.unsplash.com/photo-1561742727-74fee4d4de60?w=1000&q=80",
      alt: "翡翠莊園 藝伎咖啡豆批次篩選",
    },
  },
  {
    lead: false,
    label: "HARIO V60",
    date: "BREW GUIDE / 04.10",
    title: "淺焙手沖：給新手的三個關鍵刻度",
    deck: "水溫、研磨度、注水節奏 — 把這三件事做對，普通豆也能喝出酸甜平衡。",
    byline: "文 / 林子翔",
    image: {
      url: "https://images.unsplash.com/photo-1595827295672-97a059484442?w=1000&q=80",
      alt: "鵝頸壺手沖 V60 滴濾咖啡",
    },
  },
];

const plans = [
  {
    no: "01",
    name: "每週一支",
    detail: "200g · 主理人選豆 · 隨季更換",
    price: 580,
    unit: "NT / 週",
    active: false,
  },
  {
    no: "02",
    name: "雙週兩支 — 最多人選",
    detail: "200g × 2 · 一深一淺 · 含手沖筆記",
    price: 1180,
    unit: "NT / 雙週",
    active: true,
  },
  {
    no: "03",
    name: "月選大禮盒",
    detail: "200g × 4 · 含送禮卡與器具優惠",
    price: 2280,
    unit: "NT / 月",
    active: false,
  },
];

const origins = [
  { lat: "06.34° N", country: "衣索比亞", region: "Yirgacheffe / Kochere" },
  { lat: "04.71° N", country: "哥倫比亞", region: "Huila · Las Flores" },
  { lat: "08.55° N", country: "巴拿馬", region: "Boquete / Hacienda Esmeralda" },
  { lat: "00.42° S", country: "肯亞", region: "Nyeri · Karirū AA" },
  { lat: "14.55° N", country: "瓜地馬拉", region: "Antigua · Sta. Catalina" },
];

export default function HomePage() {
  return (
    <>
      {/* ========== Hero ========== */}
      <section className="relative overflow-hidden border-b border-border px-[var(--gutter)] pt-[clamp(56px,7vw,96px)] pb-[clamp(64px,8vw,112px)]">
        <div className="mx-auto grid max-w-[var(--max)] grid-cols-[1.1fr_1fr] items-stretch gap-[clamp(32px,5vw,80px)] max-[860px]:grid-cols-1">
          <div className="flex flex-col justify-center">
            <div className="mb-7 flex items-center gap-[18px]">
              <span className="font-mono text-[11px] tracking-[0.22em] text-muted">
                VOL. 24 — MAY 2026
              </span>
              <span className="h-px flex-1 bg-border" />
              <span className="font-mono text-[11px] tracking-[0.18em] text-accent">
                本週烘焙 / 05.06
              </span>
            </div>

            <h1 className="mb-7 text-[clamp(44px,6.4vw,92px)] leading-[0.98] tracking-[-0.025em]">
              每一杯，
              <br />
              都是一段
              <em className="not-italic text-accent italic">產地手記</em>。
            </h1>

            <p className="mb-9 max-w-[38ch] text-[clamp(17px,1.4vw,20px)] leading-[1.55] text-fg-2">
              我們向 9 個國家的小型莊園採購生豆，每週一在台中烘焙、隔日出貨。從淺焙的明亮花果，到深焙的菸草與黑糖 — 替你挑出 8 支當季最值得喝的單品。
            </p>

            <div className="flex flex-wrap gap-4">
              <Button href="/products" variant="primary">
                瀏覽當季單品
              </Button>
              <Button href="/brand" variant="ghost">
                關於暮焙 →
              </Button>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-6 border-t border-border pt-8">
              <Stat num="8" label="當季 單品" />
              <Stat num="9" label="產地 國家" />
              <Stat
                num={
                  <>
                    7<span className="text-[18px] text-muted"> 天</span>
                  </>
                }
                label="烘焙到出貨"
              />
            </div>
          </div>

          <div className="hero-art relative aspect-[4/5] overflow-hidden border border-border max-[860px]:aspect-[3/4] max-[860px]:max-h-[60vh]">
            <Image
              src="https://images.unsplash.com/photo-1707303644088-e4dd2be82d2a?w=1400&q=80"
              alt="暮焙烘焙坊內景 — 紅磚牆與烘豆機"
              fill
              priority
              sizes="(max-width: 860px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,oklch(8%_0.01_50_/_0.7)_100%)]" />
            <div className="absolute bottom-6 left-6 z-10 font-mono text-[10px] leading-[1.6] tracking-[0.22em] uppercase text-[oklch(95%_0.01_60_/_0.7)]">
              <strong className="block font-normal text-accent">本月精選</strong>
              哥倫比亞 拉斯佛羅雷斯
              <br />
              厭氧處理 · 中焙
            </div>
          </div>
        </div>
      </section>

      {/* ========== Featured beans ========== */}
      <section className="px-[var(--gutter)] py-[clamp(56px,8vw,112px)]">
        <div className="mx-auto max-w-[var(--max)]">
          <SectionHead
            eyebrow="當季精選 — Featured Lots"
            title="三支正在嚐起來最對的時候"
            link={{ href: "/products", label: "所有單品 →" }}
          />

          <div className="grid grid-cols-3 gap-8 max-[900px]:grid-cols-2 max-[580px]:grid-cols-1">
            {featuredBeans.map((bean) => (
              <article
                key={bean.no}
                className="group flex flex-col border border-border bg-surface transition-all duration-300 hover:-translate-y-[3px] hover:border-border-hi"
              >
                <div className="bean-cover relative aspect-[4/5] overflow-hidden">
                  <Image
                    src={bean.image.url}
                    alt={bean.image.alt}
                    fill
                    sizes="(max-width: 580px) 100vw, (max-width: 900px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,oklch(8%_0.01_50_/_0.35)_0%,transparent_30%,transparent_70%,oklch(8%_0.01_50_/_0.45)_100%)]" />
                  <span className="absolute top-4 left-4 z-10 font-mono text-[10px] tracking-[0.22em] text-fg-2">
                    N° {bean.no}
                  </span>
                  <span className="absolute top-4 right-4 z-10 font-mono text-[10px] tracking-[0.16em] uppercase text-accent">
                    {bean.roast}
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-3 p-6">
                  <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted">
                    {bean.origin}
                  </span>
                  <h3 className="text-[22px] leading-[1.15] text-fg">
                    {bean.name.map((line, i) => (
                      <span key={i} className="block">
                        {line}
                      </span>
                    ))}
                  </h3>
                  <p className="text-[13px] italic leading-[1.5] text-fg-2">
                    {bean.notes}
                  </p>
                  <div className="mt-auto flex items-end justify-between border-t border-border pt-[18px]">
                    <div>
                      <div className="font-serif text-[22px] tabular-nums">
                        <span className="mr-1 font-mono text-[11px] tracking-[0.08em] text-muted">
                          NT$
                        </span>
                        {bean.price.toLocaleString("zh-TW")}
                      </div>
                      <div className="font-mono text-[10px] tracking-[0.14em] text-muted">
                        {bean.weight}
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

      {/* ========== Editorial dispatches ========== */}
      <section className="border-y border-border bg-surface px-[var(--gutter)] py-[clamp(56px,8vw,112px)]">
        <div className="mx-auto max-w-[var(--max)]">
          <SectionHead
            eyebrow="烘焙日誌 — Field Notes"
            title="從產地到杯中的中途風景"
            link={{ href: "#", label: "全部文章 →" }}
          />

          <div className="grid grid-cols-[1.4fr_1fr_1fr] items-stretch gap-12 max-[900px]:grid-cols-1 max-[900px]:gap-10">
            {dispatches.map((d) => (
              <article key={d.label} className="flex flex-col gap-4">
                <div
                  className={`img-block relative overflow-hidden border border-border ${d.lead ? "aspect-[4/5]" : "aspect-[16/10]"}`}
                  data-label={d.label}
                >
                  <Image
                    src={d.image.url}
                    alt={d.image.alt}
                    fill
                    sizes={d.lead ? "(max-width: 900px) 100vw, 40vw" : "(max-width: 900px) 100vw, 25vw"}
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_50%,oklch(8%_0.01_50_/_0.75)_100%)]" />
                </div>
                <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-accent">
                  {d.date}
                </span>
                <h3
                  className={`text-fg ${d.lead ? "text-[32px] leading-[1.1]" : "text-[22px] leading-[1.2]"}`}
                >
                  {d.title}
                </h3>
                <p className="text-[14px] leading-[1.6] text-fg-2">{d.deck}</p>
                <span className="mt-auto pt-3 font-mono text-[10px] tracking-[0.16em] uppercase text-muted">
                  {d.byline}
                </span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ========== Subscription ========== */}
      <section className="bg-gradient-to-b from-bg to-[oklch(13%_0.005_250)] px-[var(--gutter)] py-[clamp(64px,8vw,112px)]">
        <div className="mx-auto grid max-w-[var(--max)] grid-cols-2 items-center gap-16 max-[860px]:grid-cols-1 max-[860px]:gap-10">
          <div>
            <span className="font-mono text-[11px] tracking-[0.18em] uppercase text-accent">
              訂閱配送 — Subscription
            </span>
            <p className="mt-6 border-l-2 border-accent pl-8 text-[clamp(28px,3.4vw,44px)] leading-[1.18] text-fg">
              「讓每個禮拜的早晨，
              <br />
              都從一支
              <em className="not-italic text-accent italic">從沒喝過</em>
              的好豆開始。」
              <span className="mt-6 block font-mono text-[11px] tracking-[0.18em] uppercase text-muted">
                — 暮焙 訂閱方案
              </span>
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {plans.map((plan) => (
              <div
                key={plan.no}
                className={`grid cursor-pointer grid-cols-[80px_1fr_auto] items-center gap-6 border p-[22px] transition-all duration-200 ${
                  plan.active
                    ? "border-accent bg-surface-2"
                    : "border-border bg-surface hover:border-accent"
                }`}
              >
                <span className="font-serif text-[32px] leading-none text-accent">
                  {plan.no}
                </span>
                <div>
                  <div className="mb-1 text-[18px]">{plan.name}</div>
                  <div className="font-mono text-[12px] tracking-[0.04em] text-muted">
                    {plan.detail}
                  </div>
                </div>
                <div className="font-serif text-[22px]">
                  {plan.price.toLocaleString("zh-TW")}
                  <small className="mt-0.5 block font-mono text-[10px] tracking-[0.14em] text-muted">
                    {plan.unit}
                  </small>
                </div>
              </div>
            ))}
            <Button href="#" variant="primary" block className="mt-2">
              了解訂閱方案 →
            </Button>
          </div>
        </div>
      </section>

      {/* ========== Origin index ========== */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-[var(--max)] px-[var(--gutter)] py-[clamp(40px,5vw,64px)]">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="font-mono text-[11px] tracking-[0.18em] uppercase text-accent">
                產地索引 — Origin Index
              </span>
              <h2 className="mt-3.5 text-[28px]">
                9 個國家，14 座小型莊園
              </h2>
            </div>
            <a
              href="/brand"
              className="font-mono text-[11px] tracking-[0.16em] uppercase text-muted hover:text-accent"
            >
              看完整夥伴名單 →
            </a>
          </div>

          <div className="grid grid-cols-5 gap-px border border-border bg-border max-[800px]:grid-cols-2">
            {origins.map((o) => (
              <div
                key={o.country}
                className="bg-surface px-[22px] py-7 transition-colors hover:bg-surface-2"
              >
                <div className="mb-3 font-mono text-[10px] tracking-[0.16em] text-accent">
                  {o.lat}
                </div>
                <div className="mb-1.5 text-[18px]">{o.country}</div>
                <div className="font-mono text-[12px] tracking-[0.04em] text-muted">
                  {o.region}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function Stat({ num, label }: { num: React.ReactNode; label: string }) {
  return (
    <div>
      <div className="mb-1.5 font-serif text-[32px] leading-none tabular-nums">
        {num}
      </div>
      <div className="font-mono text-[10px] leading-[1.5] tracking-[0.16em] uppercase text-muted">
        {label}
      </div>
    </div>
  );
}

function SectionHead({
  eyebrow,
  title,
  link,
}: {
  eyebrow: string;
  title: string;
  link: { href: string; label: string };
}) {
  return (
    <div className="mb-[clamp(32px,5vw,64px)] grid grid-cols-[1fr_auto] items-end gap-6 border-b border-border pb-6">
      <div>
        <span className="mb-3.5 block font-mono text-[11px] tracking-[0.18em] uppercase text-accent">
          {eyebrow}
        </span>
        <h2 className="max-w-[16ch] text-[clamp(30px,3.8vw,48px)] leading-[1.05]">
          {title}
        </h2>
      </div>
      <a
        href={link.href}
        className="font-mono text-[12px] tracking-[0.14em] uppercase text-muted hover:text-accent"
      >
        {link.label}
      </a>
    </div>
  );
}
