import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "品牌故事 · 火與光",
  description:
    "暮焙 MUBEI 編年第三卷〈火與光〉：主理人林子翔的烘豆筆記、產地夥伴、五大承諾。",
};

type Meta = { label: string; value: string; strong?: string };
type Chapter = {
  num: string;
  title: string;
  body: React.ReactNode;
};
type Related = {
  category: string;
  title: string;
  excerpt: string;
  date: string;
};

const meta: Meta[] = [
  { label: "作者", value: "主理人 · 烘豆師", strong: "林子翔" },
  { label: "日期", value: "2026 年 5 月 6 日 · 週三" },
  { label: "閱讀", value: "約 8 分鐘" },
  { label: "收錄", value: "暮焙編年第三卷 · 〈火與光〉" },
];

const promises: { title: string; body: string }[] = [
  {
    title: "新鮮度。",
    body: "所有出貨的咖啡，烘焙完成日不超過 7 天。包裝上印的是烘焙日期，不是製造日期。",
  },
  {
    title: "透明溯源。",
    body: "每包豆都附莊園、處理法、海拔、批次編號 — 你可以追到那位農夫的名字。",
  },
  {
    title: "小批量。",
    body: "每支單品每週烘焙 60–120 包。售完即下架，下週另起爐灶 — 我們不囤貨。",
  },
  {
    title: "合理採購。",
    body: "給生產者的價格至少是國際公平貿易標準的 1.6 倍 — 通常更高。",
  },
  {
    title: "不滿意全額退費。",
    body: "不需要寄回豆子。你不喜歡，我們就賠錢給你 — 這支豆下次怎麼修，我們會記住。",
  },
];

const related: Related[] = [
  {
    category: "烘焙日誌 / No. 218",
    title: "為什麼我們堅持深焙不超過 220°C",
    excerpt: "「焦糖化的甜，跟焦炭的苦，只差兩度。」一篇關於溫度曲線的長文。",
    date: "2026.04.22",
  },
  {
    category: "產地手記 / Colombia",
    title: "Las Flores — 哥倫比亞高山上的厭氧實驗室",
    excerpt: "與 Sebastián Ramírez 並肩工作的兩週，學會了什麼叫做「對風味的偏執」。",
    date: "2026.03.14",
  },
  {
    category: "器具 / Brewing",
    title: "在家沖出職人級耶加雪菲的五個關鍵",
    excerpt: "水溫、研磨度、注水節奏、粉水比、靜置時間 — 全部攤開來說。",
    date: "2026.02.28",
  },
];

// Reusable inline accent highlight to mimic the .art__body strong style
// (color: --fg, with an --accent-tint underline-band background)
const HL = ({ children }: { children: React.ReactNode }) => (
  <strong className="bg-[linear-gradient(transparent_75%,var(--accent-tint)_75%)] px-0.5 font-normal text-fg">
    {children}
  </strong>
);

export default function BrandPage() {
  return (
    <>
      {/* ============ Article header ============ */}
      <article className="mx-auto max-w-[var(--max)] px-[var(--gutter)]">
        <header className="grid grid-cols-[7fr_5fr] items-end gap-[clamp(32px,5vw,80px)] border-b border-border pt-[clamp(56px,7vw,96px)] pb-[clamp(40px,5vw,64px)] max-[900px]:grid-cols-1 max-[900px]:gap-8">
          <div>
            <div className="mb-6 font-mono text-[11px] tracking-[0.22em] uppercase text-accent">
              品牌故事 / Vol. 24
            </div>
            <h1 className="mb-7 text-[clamp(44px,6vw,88px)] leading-[0.96] tracking-[-0.025em]">
              從一封來自
              <em className="not-italic italic text-accent">耶加雪菲</em>
              的信，
              <br />
              到台中民權路上的烘焙鼓。
            </h1>
            <p className="max-w-[36ch] text-[clamp(18px,1.6vw,22px)] leading-[1.5] text-fg-2">
              2019 年，我們把一台 1 公斤的 Probat 烘豆機搬進民權路的老倉庫。七年後，這裡每週一仍會準時亮燈、準時飄出焦糖與堅果的氣味。這是暮焙的故事 — 也是九個產區、二十七位農夫的故事。
            </p>
          </div>

          <div className="flex flex-col gap-3.5 border-l border-border pl-8 max-[900px]:border-t max-[900px]:border-l-0 max-[900px]:pt-6 max-[900px]:pl-0">
            {meta.map((m) => (
              <div
                key={m.label}
                className="grid grid-cols-[90px_1fr] gap-3 text-[13px]"
              >
                <span className="pt-0.5 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">
                  {m.label}
                </span>
                <span className="text-fg-2">
                  {m.strong && (
                    <strong className="mb-0.5 block text-[16px] font-normal text-fg">
                      {m.strong}
                    </strong>
                  )}
                  {m.value}
                </span>
              </div>
            ))}
          </div>
        </header>

        {/* Hero image */}
        <figure>
          <div className="hero-art relative my-[clamp(40px,5vw,64px)] mb-4 aspect-[16/9] overflow-hidden border border-border">
            <div className="absolute bottom-7 left-7 z-10 font-mono text-[10px] leading-[1.6] tracking-[0.22em] uppercase text-[oklch(95%_0.01_60_/_0.7)]">
              <strong className="mb-1 block font-normal text-accent">
                WORK FLOOR
              </strong>
              台中市西區 民權路 47 號 · 烘焙當日
            </div>
          </div>
          <figcaption className="pt-1 font-mono text-[11px] leading-[1.5] tracking-[0.06em] text-muted">
            <span className="mr-2 text-accent">圖 01</span>
            暮焙烘焙坊內部，一台 1.2 公斤 Probat L12 烘豆機 — 每週一上午 7:00 開機，下午 4:00 收工。
          </figcaption>
        </figure>
      </article>

      {/* ============ Article body ============ */}
      <div className="mx-auto my-[clamp(56px,6vw,80px)] max-w-[720px] px-[var(--gutter)]">
        {/* Chapter 01 */}
        <SectionHeading num="起源 · Chapter 01" title="一封來自衣索比亞的信" />

        <Lede>
          那是 2018 年的冬天。我還在新竹科學園區寫程式碼，每天傍晚會繞去同一家咖啡店，喝同一支淺焙耶加雪菲。某天店主給了我一份「莊園溯源卡」 — 上頭印著生豆來自{" "}
          <HL>衣索比亞 Yirgacheffe Konga 合作社</HL>，海拔 2,050 公尺，由一位叫 Tadesse 的農夫負責採收。
        </Lede>

        <Para>
          那張卡片把我帶去了 Konga。我在那裡待了三週、走訪了七個合作社、學會了如何分辨生豆的瑕疵率，也第一次知道 — 一支頂級耶加雪菲，從種子落地到我手上的杯子，要經過 <HL>七年</HL> 的時間。
        </Para>

        <Para>
          回到台灣後，我辭掉了工作。三個月後，民權路 47 號的鐵捲門上多了一塊樸素的木牌，刻著兩個字：暮焙。
        </Para>

        {/* Chapter 02 */}
        <SectionHeading num="哲學 · Chapter 02" title="為什麼我們只在週一烘焙" />

        <Para>
          很多客人問過這個問題。週一烘豆，週二出貨 — 比起隔日達的便利店模式，我們慢得不合時宜。
        </Para>

        <Para>
          答案藏在一個叫 <HL>「養豆期」</HL> 的詞裡。剛烘好的咖啡豆，內部仍在劇烈排放二氧化碳，沖煮時會把粉床撐起、讓萃取變得不穩定。經過 3 到 7 天的靜置 — 風味物質才會穩定下來，達到我們認可的飲用窗口。
        </Para>

        <Para>
          所以暮焙的節奏是：週一烘焙、週二出貨、週四你收到、週末是這支豆最甜的時候。一個禮拜剛剛好。
        </Para>

        {/* Pull quote */}
        <PullQuote
          text="慢不是一種堅持，是對這支豆子已經走過的七年路程的最低禮貌。"
          source="— 林子翔，烘焙日誌 No. 218"
        />

        {/* Chapter 03 */}
        <SectionHeading num="產地 · Chapter 03" title="九個國家、二十七位夥伴" />

        <Para>
          我們不買大盤商的混合批次。每一支當季豆，都直接和該批次的生產者簽約 — 不是農場主、不是工廠，是親手摘下櫻桃果的那雙手。
        </Para>

        <Para>
          這是非常笨的做法。一年我得跑三趟產地，從衣索比亞到哥倫比亞，從巴拿馬翡翠莊園到葉門哈拉茲。每一筆訂單都很小、每一個關係都得花時間去培養。但這也是我們唯一願意做的方式。
        </Para>

        {/* Figure */}
        <figure className="my-[clamp(40px,5vw,56px)]">
          <div className="img-block relative aspect-[3/2] border border-border" />
          <figcaption className="mt-3 font-mono text-[11px] leading-[1.5] tracking-[0.06em] text-muted">
            <span className="mr-2 text-accent">圖 02</span>
            哥倫比亞 Las Flores 莊園 — Sebastián Ramírez 與他的厭氧發酵桶，2024 年 3 月由林子翔拍攝。
          </figcaption>
        </figure>

        {/* Chapter 04 */}
        <SectionHeading num="承諾 · Chapter 04" title="我們對你的五個承諾" />

        <Para>
          這些不是行銷話術。這是貼在烘焙坊牆上、每週一早上會被看到的那五行字：
        </Para>

        <ol className="my-[clamp(32px,4vw,48px)] list-none p-0">
          {promises.map((p, i) => (
            <li
              key={p.title}
              className={`relative border-b border-border py-[18px] pr-0 pl-14 text-[17px] leading-[1.55] text-fg-2 ${
                i === 0 ? "border-t" : ""
              }`}
            >
              <span className="absolute left-0 top-[18px] font-mono text-[11px] tracking-[0.18em] text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <strong className="font-normal text-fg">{p.title}</strong>
              {p.body}
            </li>
          ))}
        </ol>

        {/* Chapter 05 */}
        <SectionHeading num="時序 · Chapter 05" title="一杯咖啡的七年" />

        <Para>
          從衣索比亞 Konga 合作社到台中民權路上你的杯子，這支耶加雪菲走了七年。
        </Para>

        <Para>
          第一年到第三年是樹苗期，咖啡櫻桃還結不出果實。第四年第一次採收，但生豆瑕疵率高、不會進到我們的批次。第五到第六年才是穩定產出期。第七年，當 Tadesse 和我在 WhatsApp 上敲定這個批次的價格 — 它會在 28 天後抵達台中港的保稅倉。
        </Para>

        <Para>
          然後是我們這邊的事 — <HL>養豆 4 天</HL>，<HL>烘焙 14 分鐘</HL>，
          <HL>包裝 30 秒</HL>，<HL>運送 36 小時</HL>。最後在某個週四的下午，你打開包裝、研磨、注水、聞到那股屬於 Konga 的茉莉花香。
        </Para>

        {/* Inline blockquote (sidebar style) */}
        <aside className="my-[clamp(32px,4vw,48px)] border-l-2 border-border-hi bg-surface px-7 py-6 text-[18px] italic leading-[1.55] text-fg-2">
          我做這份工作最在意的，從來不是手沖大賽的金杯獎、也不是 SCA 的 88 分評鑑。我在意的是 — 你打開包裝那一刻，是不是聞到了我們在烘焙坊聞到的那股香氣。如果是，那這支豆就值了。
          <cite className="mt-3 block font-mono text-[10px] not-italic tracking-[0.18em] uppercase text-muted">
            — 林子翔，《暮焙編年第三卷 · 〈火與光〉》
          </cite>
        </aside>

        {/* Chapter 06 */}
        <SectionHeading num="未來 · Chapter 06" title="第七年，與接下來的每一年" />

        <Para>
          暮焙今年滿七年。我們依然只烘豆、不開分店、不賣周邊到失焦。下一個七年，我們的計畫很簡單 — 把更多直接貿易的關係建立起來，把每一杯咖啡的故事說得更完整一點。
        </Para>

        <Para>
          如果你願意，加入我們的訂閱方案。每週一烘焙、週二出貨、每月四款不同的當季單品 — 像收到一份來自產地的信件。
        </Para>
      </div>

      {/* ============ Author footer ============ */}
      <aside className="mx-auto mt-[clamp(64px,8vw,96px)] grid max-w-[720px] grid-cols-[80px_1fr] items-start gap-7 border-y border-border px-[var(--gutter)] py-[clamp(32px,4vw,48px)] max-[640px]:grid-cols-1">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[linear-gradient(135deg,oklch(38%_0.06_60),oklch(20%_0.03_50))] text-[28px] text-accent">
          林
        </div>
        <div>
          <div className="mb-2 font-mono text-[10px] tracking-[0.22em] uppercase text-muted">
            關於作者
          </div>
          <div className="mb-1 text-[22px]">林子翔</div>
          <div className="mb-3.5 font-mono text-[11px] tracking-[0.12em] text-accent">
            暮焙主理人 · 首席烘豆師
          </div>
          <p className="text-[15px] leading-[1.6] text-fg-2">
            新竹清華大學資工系畢，前科技公司軟體工程師。2018 年走訪衣索比亞 Yirgacheffe 後辭職創業，2019 年於台中創立暮焙烘焙坊。SCA 認證 Q-Grader、CQI 杯測師。著有《一支豆子的七年》（2023，行人出版）。
          </p>
        </div>
      </aside>

      {/* ============ Related ============ */}
      <section className="mx-auto max-w-[var(--max)] px-[var(--gutter)] py-[clamp(64px,8vw,96px)]">
        <div className="mb-10 flex items-end justify-between border-b border-border pb-6">
          <div>
            <span className="mb-3 block font-mono text-[11px] tracking-[0.18em] uppercase text-accent">
              延伸閱讀
            </span>
            <h2 className="text-[clamp(26px,3vw,36px)] leading-none">
              更多暮焙編年
            </h2>
          </div>
          <Link
            href="#"
            className="font-mono text-[11px] tracking-[0.16em] uppercase text-muted hover:text-accent"
          >
            看全部 →
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-8 max-[900px]:grid-cols-1">
          {related.map((r) => (
            <Link
              href="#"
              key={r.title}
              className="group flex flex-col gap-3.5 transition-transform duration-200 hover:-translate-y-[3px]"
            >
              <div className="img-block relative aspect-[4/3] border border-border" />
              <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-accent">
                {r.category}
              </span>
              <h3 className="text-[20px] leading-[1.2] text-fg">
                {r.title}
              </h3>
              <p className="text-[14px] italic leading-[1.55] text-fg-2">
                {r.excerpt}
              </p>
              <span className="mt-auto pt-1 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">
                {r.date}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ============ Tail ribbon ============ */}
      <section className="mx-auto max-w-[var(--max)] border-t border-border px-[var(--gutter)] py-[clamp(64px,7vw,96px)] text-center">
        <div className="mb-2 text-[clamp(40px,5vw,64px)] leading-none tracking-[0.06em]">
          每一杯，
          <em className="not-italic text-accent">都是一段路</em>。
        </div>
        <div className="mb-9 font-mono text-[12px] tracking-[0.32em] text-muted">
          — EVERY CUP IS A JOURNEY —
        </div>
        <div className="inline-flex flex-wrap justify-center gap-4">
          <Button href="/products" variant="primary">
            瀏覽當季單品
          </Button>
          <Button href="/account" variant="ghost">
            訂閱配送 →
          </Button>
        </div>
      </section>
    </>
  );
}

/* ===== Inline helpers (page-local; not promoted to /components) ===== */

function SectionHeading({ num, title }: { num: string; title: string }) {
  return (
    <h2 className="relative mt-[clamp(48px,6vw,72px)] mb-6 border-t border-border pt-[clamp(24px,3vw,32px)] text-[clamp(28px,3.2vw,40px)] leading-[1.1] tracking-[-0.015em]">
      <span className="mb-3.5 block font-mono text-[11px] tracking-[0.22em] uppercase text-accent">
        {num}
      </span>
      {title}
    </h2>
  );
}

function Para({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-[22px] text-[18px] leading-[1.65] text-fg-2 text-pretty">
      {children}
    </p>
  );
}

// First paragraph variant — adds a drop-cap on its first letter
function Lede({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-[22px] text-[18px] leading-[1.65] text-fg-2 text-pretty [&::first-letter]:float-left [&::first-letter]:mt-1.5 [&::first-letter]:mr-3 [&::first-letter]:text-[78px] [&::first-letter]:leading-[0.85] [&::first-letter]:text-accent">
      {children}
    </p>
  );
}

function PullQuote({ text, source }: { text: string; source: string }) {
  return (
    <blockquote className="my-[clamp(48px,6vw,72px)] border-l-2 border-accent pl-7">
      <p className="mb-4 text-[clamp(26px,3vw,38px)] leading-[1.2] tracking-[-0.01em] text-fg">
        <span className="relative top-[0.18em] mr-1 text-[1.4em] leading-[0] text-accent">
          &ldquo;
        </span>
        {text}
        <span className="ml-0.5 text-accent">&rdquo;</span>
      </p>
      <cite className="font-mono text-[11px] not-italic tracking-[0.16em] uppercase text-muted">
        {source}
      </cite>
    </blockquote>
  );
}
