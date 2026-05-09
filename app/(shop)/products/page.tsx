import Link from "next/link";
import { Button } from "@/components/ui/Button";

type Product = {
  no: string;
  roast: string;
  origin: string;
  name: string;
  notes: string;
  price: number;
  weight: string;
  badge?: string;
  coverVariant?: 1 | 2 | 3 | 4 | 5;
  soldOut?: boolean;
};

const products: Product[] = [
  {
    no: "01",
    roast: "淺焙",
    origin: "ETHIOPIA · 衣索比亞",
    name: "耶加雪菲 G1 科契爾 水洗",
    notes: "「蕁麻草、佛手柑、白桃 — 喉韻如紅茶。」",
    price: 580,
    weight: "200g",
    badge: "主理人推薦",
  },
  {
    no: "02",
    roast: "中焙",
    origin: "COLOMBIA · 哥倫比亞",
    name: "拉斯佛羅雷斯 厭氧 72hr",
    notes: "「蘭姆酒、葡萄乾、黑可可。」",
    price: 720,
    weight: "200g",
    coverVariant: 3,
  },
  {
    no: "03",
    roast: "淺焙",
    origin: "PANAMA · 巴拿馬",
    name: "翡翠莊園 藝伎 紅標",
    notes: "「茉莉、蜂蜜、白色花卉。」",
    price: 1680,
    weight: "100g",
    badge: "數量稀少",
    coverVariant: 1,
  },
  {
    no: "04",
    roast: "中淺",
    origin: "KENYA · 肯亞",
    name: "涅里 卡里魯 AA 水洗",
    notes: "「黑醋栗、番茄汁、葡萄柚 — 酸度明亮。」",
    price: 620,
    weight: "200g",
    coverVariant: 2,
  },
  {
    no: "05",
    roast: "中深",
    origin: "GUATEMALA · 瓜地馬拉",
    name: "安提瓜 聖塔卡塔琳娜",
    notes: "「巧克力、烤杏仁、橘皮 — 經典中深。」",
    price: 540,
    weight: "200g",
  },
  {
    no: "06",
    roast: "中深",
    origin: "YEMEN · 葉門",
    name: "摩卡 哈拉茲 日曬",
    notes: "「紅酒、黑巧克力、煙燻木質。」",
    price: 980,
    weight: "200g",
    badge: "職人選",
    coverVariant: 4,
  },
  {
    no: "07",
    roast: "深焙",
    origin: "INDONESIA · 印尼",
    name: "蘇拉維西 托拉雅",
    notes: "「雪松、黑糖、菸草 — 厚實圓潤。」",
    price: 480,
    weight: "200g",
    coverVariant: 5,
  },
  {
    no: "08",
    roast: "中焙",
    origin: "COSTA RICA · 哥斯大黎加",
    name: "塔拉珠 拉米妮塔",
    notes: "「焦糖、太妃糖、青蘋果尾韻。」",
    price: 560,
    weight: "200g · 補貨中",
    coverVariant: 3,
    soldOut: true,
  },
];

const filterGroups = [
  {
    title: "產地",
    total: "9",
    options: [
      { label: "衣索比亞", count: 2, defaultChecked: true },
      { label: "哥倫比亞", count: 1, defaultChecked: true },
      { label: "巴拿馬", count: 1 },
      { label: "肯亞", count: 1 },
      { label: "瓜地馬拉", count: 1 },
      { label: "葉門", count: 1 },
      { label: "印尼", count: 1 },
    ],
  },
  {
    title: "處理法",
    total: "4",
    options: [
      { label: "水洗", count: 3 },
      { label: "日曬", count: 2 },
      { label: "蜜處理", count: 1 },
      { label: "厭氧發酵", count: 2 },
    ],
  },
  {
    title: "烘焙度",
    total: "4",
    options: [
      { label: "淺焙", count: 3 },
      { label: "中淺", count: 2 },
      { label: "中焙", count: 2 },
      { label: "中深 / 深", count: 1 },
    ],
  },
  {
    title: "風味調性",
    total: "—",
    options: [
      { label: "花香 / 果汁感", count: 3 },
      { label: "巧克力 / 堅果", count: 3 },
      { label: "酒香 / 發酵感", count: 2 },
      { label: "菸草 / 木質", count: 1 },
    ],
  },
];

export default function ProductsPage() {
  return (
    <>
      {/* ========== Page header ========== */}
      <section className="border-b border-border px-[var(--gutter)] pt-[clamp(48px,6vw,80px)] pb-[clamp(32px,4vw,48px)]">
        <div className="mx-auto grid max-w-[var(--max)] grid-cols-[1fr_auto] items-end gap-6 max-[640px]:grid-cols-1">
          <div>
            <div className="mb-[18px] font-mono text-[11px] tracking-[0.16em] uppercase text-muted">
              <Link href="/" className="text-muted hover:text-accent">
                首頁
              </Link>
              <span className="px-2 text-dim">/</span>
              <span>單品咖啡</span>
            </div>
            <h1 className="font-serif text-[clamp(36px,4.6vw,60px)] leading-none tracking-[-0.02em]">
              當季 · 全部單品
            </h1>
            <p className="mt-3.5 max-w-[52ch] text-[15px] leading-[1.55] text-fg-2">
              8 支來自 9 個國家小型莊園的精選單品。本批烘焙日 2026.05.06，建議養豆 7–10 天後沖煮。
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] tracking-[0.14em] text-muted">
              顯示 8 / 8
            </span>
            <select
              defaultValue="recommended"
              className="cursor-pointer border border-border bg-surface px-3.5 py-2.5 font-mono text-[11px] tracking-[0.12em] text-fg"
            >
              <option value="recommended">排序 · 主理人推薦</option>
              <option value="price-asc">排序 · 價格 低 → 高</option>
              <option value="price-desc">排序 · 價格 高 → 低</option>
              <option value="roast-asc">排序 · 烘焙度 淺 → 深</option>
              <option value="newest">排序 · 最新到貨</option>
            </select>
          </div>
        </div>
      </section>

      {/* ========== Shop layout ========== */}
      <section className="mx-auto grid max-w-[var(--max)] grid-cols-[240px_1fr] items-start gap-14 px-[var(--gutter)] pt-[clamp(32px,4vw,56px)] pb-[clamp(64px,8vw,112px)] max-[900px]:grid-cols-1 max-[900px]:gap-10">
        {/* Filter rail */}
        <aside className="sticky top-20 max-[900px]:static">
          {filterGroups.map((group, i) => (
            <div
              key={group.title}
              className={`border-b border-border py-[22px] ${i === 0 ? "pt-0" : ""}`}
            >
              <div className="mb-3.5 flex items-center justify-between font-mono text-[11px] tracking-[0.18em] uppercase text-accent">
                <span>{group.title}</span>
                <span className="text-[10px] text-muted">{group.total}</span>
              </div>
              {group.options.map((opt) => (
                <label
                  key={opt.label}
                  className="flex cursor-pointer items-center justify-between py-[7px] text-[13px] text-fg-2 transition-colors hover:text-accent"
                >
                  <span className="flex flex-1 items-center">
                    <input
                      type="checkbox"
                      defaultChecked={opt.defaultChecked}
                      className="mr-2.5 accent-accent"
                    />
                    {opt.label}
                  </span>
                  <span className="font-mono text-[11px] text-muted">
                    {opt.count}
                  </span>
                </label>
              ))}
            </div>
          ))}

          <div className="border-b border-border py-[22px]">
            <div className="mb-3.5 flex items-center justify-between font-mono text-[11px] tracking-[0.18em] uppercase text-accent">
              <span>價格 NT$</span>
              <span className="text-[10px] text-muted">—</span>
            </div>
            <div className="mt-1 flex gap-2.5">
              <input
                type="number"
                placeholder="最低"
                defaultValue={400}
                className="w-1/2 border border-border bg-surface px-2.5 py-2 font-mono text-[11px] text-fg"
              />
              <input
                type="number"
                placeholder="最高"
                defaultValue={1800}
                className="w-1/2 border border-border bg-surface px-2.5 py-2 font-mono text-[11px] text-fg"
              />
            </div>
          </div>

          <div className="mt-6">
            <Button variant="ghost" block>
              套用篩選
            </Button>
          </div>
        </aside>

        {/* Grid */}
        <div>
          <div className="grid grid-cols-3 gap-6 max-[1100px]:grid-cols-2 max-[580px]:grid-cols-1">
            {products.map((p) => (
              <article
                key={p.no}
                className={`group flex flex-col border border-border bg-surface transition-all duration-300 ${
                  p.soldOut
                    ? ""
                    : "hover:-translate-y-[3px] hover:border-border-hi"
                }`}
              >
                <div
                  className={`bean-cover ${
                    p.coverVariant ? `bean-cover--alt-${p.coverVariant}` : ""
                  } relative aspect-[4/5] overflow-hidden`}
                >
                  <span className="absolute top-4 left-4 z-10 font-mono text-[10px] tracking-[0.22em] text-fg-2">
                    N° {p.no}
                  </span>
                  <span className="absolute top-4 right-4 z-10 font-mono text-[10px] tracking-[0.16em] uppercase text-accent">
                    {p.roast}
                  </span>
                  {p.badge && (
                    <span className="absolute bottom-4 left-4 z-[2] border border-accent-tint bg-bg px-2 py-1 font-mono text-[9px] tracking-[0.18em] uppercase text-accent">
                      {p.badge}
                    </span>
                  )}
                  {p.soldOut && (
                    <div className="absolute inset-0 z-[3] flex items-center justify-center bg-[oklch(15%_0.005_250_/_0.7)] backdrop-blur-[2px] font-mono text-[12px] tracking-[0.32em] uppercase text-accent">
                      已售完
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-3 p-5">
                  <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted">
                    {p.origin}
                  </span>
                  <h3 className="font-serif text-[20px] leading-[1.2] text-fg">
                    {p.name}
                  </h3>
                  <p className="font-serif text-[13px] italic leading-[1.5] text-fg-2">
                    {p.notes}
                  </p>
                  <div className="mt-auto flex items-end justify-between border-t border-border pt-4">
                    <div>
                      <div
                        className={`font-serif text-[22px] tabular-nums ${p.soldOut ? "text-muted" : ""}`}
                      >
                        <span className="mr-1 font-mono text-[11px] tracking-[0.08em] text-muted">
                          NT$
                        </span>
                        {p.price.toLocaleString("zh-TW")}
                      </div>
                      <div className="font-mono text-[10px] tracking-[0.14em] text-muted">
                        {p.weight}
                      </div>
                    </div>
                    <span
                      className={`font-mono text-[10px] tracking-[0.18em] uppercase ${p.soldOut ? "text-muted" : "text-accent"}`}
                    >
                      {p.soldOut ? "通知我 →" : "加入 →"}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Pager */}
          <div className="mt-14 flex items-center justify-between border-t border-border pt-8 font-mono text-[12px] tracking-[0.1em] text-muted">
            <span>第 1 頁 / 共 1 頁 — 8 個結果</span>
            <div className="flex gap-2">
              <a
                href="#"
                aria-current="page"
                className="border border-accent bg-accent px-3 py-1.5 text-bg"
              >
                01
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
