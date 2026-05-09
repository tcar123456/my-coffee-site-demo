import Link from "next/link";
import { Button } from "@/components/ui/Button";

type LineItem = {
  no: string;
  origin: string;
  name: string;
  grindOptions: { label: string; selected?: boolean }[];
  packageOptions: { label: string; selected?: boolean }[];
  qty: number;
  unitPrice: number;
  unitLabel: string;
  coverVariant?: 1 | 2 | 3 | 4 | 5;
  coverStyle?: React.CSSProperties;
};

const lineItems: LineItem[] = [
  {
    no: "02",
    origin: "N° 02 · COLOMBIA — 哥倫比亞",
    name: "拉斯佛羅雷斯 厭氧 72 小時",
    grindOptions: [
      { label: "全豆" },
      { label: "中粗 · 手沖", selected: true },
      { label: "細 · 義式" },
    ],
    packageOptions: [
      { label: "單包 200g", selected: true },
      { label: "禮盒 200g × 2" },
    ],
    qty: 1,
    unitPrice: 720,
    unitLabel: "NT$ 720 / 包",
    // Default bean-cover (warm amber) closely matches the source colombia gradient
  },
  {
    no: "03",
    origin: "N° 03 · PANAMA — 巴拿馬",
    name: "翡翠莊園 藝伎 紅標",
    grindOptions: [
      { label: "全豆", selected: true },
      { label: "中粗 · 手沖" },
    ],
    packageOptions: [
      { label: "單包 100g", selected: true },
      { label: "送禮包裝（含手寫卡）" },
    ],
    qty: 1,
    unitPrice: 1680,
    unitLabel: "NT$ 1,680 / 包",
    coverVariant: 1, // panama / yellow-green tint
  },
];

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

export default function CartPage() {
  const subtotal = lineItems.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const itemCount = lineItems.reduce((s, l) => s + l.qty, 0);
  const memberDiscount = 120;
  const total = subtotal - memberDiscount;

  return (
    <>
      {/* ========== Step indicator ========== */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-[var(--max)] items-center justify-center gap-8 px-[var(--gutter)] py-[18px] font-mono text-[11px] tracking-[0.18em] uppercase max-[720px]:gap-3">
          <Step no="01" label="購物車" state="active" />
          <StepRule />
          <Step no="02" label="配送 / 付款" />
          <StepRule />
          <Step no="03" label="確認" />
        </div>
      </section>

      {/* ========== Header ========== */}
      <section className="border-b border-border px-[var(--gutter)] pt-[clamp(40px,5vw,64px)] pb-[clamp(24px,3vw,32px)] text-center">
        <h1 className="font-serif text-[clamp(36px,4.6vw,56px)] leading-none">
          你的購物車
        </h1>
        <div className="mt-3.5 font-mono text-[12px] tracking-[0.14em] text-muted">
          {itemCount.toString().padStart(2, "0")} 件 · 預計 2026.05.07 出貨
        </div>
      </section>

      {/* ========== Cart layout ========== */}
      <section className="mx-auto grid max-w-[var(--max)] grid-cols-[1.6fr_1fr] items-start gap-14 px-[var(--gutter)] pt-[clamp(32px,4vw,56px)] pb-[clamp(64px,8vw,112px)] max-[900px]:grid-cols-1 max-[900px]:gap-10">
        {/* ---------- Lines ---------- */}
        <div>
          <div className="border-t border-border">
            {lineItems.map((line) => (
              <article
                key={line.no}
                className="grid grid-cols-[110px_1fr_auto] items-start gap-6 border-b border-border py-7 max-[600px]:grid-cols-[80px_1fr]"
              >
                <div
                  className={`bean-cover ${
                    line.coverVariant ? `bean-cover--alt-${line.coverVariant}` : ""
                  } aspect-[4/5] border border-border max-[600px]:aspect-square`}
                  style={line.coverStyle}
                />

                <div>
                  <div className="mb-2 font-mono text-[10px] tracking-[0.16em] uppercase text-muted">
                    {line.origin}
                  </div>
                  <h2 className="mb-3 font-serif text-[22px] leading-[1.2]">
                    {line.name}
                  </h2>

                  <div className="mb-5 flex flex-wrap gap-[18px] text-[12px] text-fg-2">
                    <label className="flex items-center">
                      <strong className="mr-1.5 font-mono text-[10px] font-normal tracking-[0.14em] uppercase text-muted">
                        研磨
                      </strong>
                      <select
                        defaultValue={
                          line.grindOptions.find((o) => o.selected)?.label
                        }
                        className="ml-1.5 border border-border bg-surface px-2.5 py-1.5 font-mono text-[11px] text-fg"
                      >
                        {line.grindOptions.map((o) => (
                          <option key={o.label} value={o.label}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center">
                      <strong className="mr-1.5 font-mono text-[10px] font-normal tracking-[0.14em] uppercase text-muted">
                        包裝
                      </strong>
                      <select
                        defaultValue={
                          line.packageOptions.find((o) => o.selected)?.label
                        }
                        className="ml-1.5 border border-border bg-surface px-2.5 py-1.5 font-mono text-[11px] text-fg"
                      >
                        {line.packageOptions.map((o) => (
                          <option key={o.label} value={o.label}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center gap-6">
                    <div className="flex border border-border">
                      <button
                        type="button"
                        aria-label="減少數量"
                        className="h-8 w-8 border-r border-border text-fg-2 transition-colors hover:text-accent"
                      >
                        −
                      </button>
                      <input
                        defaultValue={line.qty}
                        readOnly
                        className="w-11 border-0 bg-transparent text-center font-mono text-[13px] text-fg"
                      />
                      <button
                        type="button"
                        aria-label="增加數量"
                        className="h-8 w-8 border-l border-border text-fg-2 transition-colors hover:text-accent"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      className="cursor-pointer font-mono text-[11px] tracking-[0.14em] uppercase text-muted transition-colors hover:text-danger"
                    >
                      移除
                    </button>
                    <button
                      type="button"
                      className="cursor-pointer font-mono text-[11px] tracking-[0.14em] uppercase text-muted transition-colors hover:text-accent"
                    >
                      儲存到收藏 ♡
                    </button>
                  </div>
                </div>

                <div className="min-w-[130px] text-right max-[600px]:col-start-2 max-[600px]:text-left">
                  <div className="mb-1.5 font-mono text-[11px] text-muted">
                    {line.unitLabel}
                  </div>
                  <div className="font-serif text-[26px] tabular-nums">
                    <small className="mr-1 font-mono text-[11px] text-muted">
                      NT$
                    </small>
                    {(line.unitPrice * line.qty).toLocaleString("zh-TW")}
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-8">
            <Button href="/products" variant="ghost">
              ← 繼續挑豆
            </Button>
          </div>
        </div>

        {/* ---------- Summary ---------- */}
        <aside className="sticky top-20 border border-border bg-surface p-8 max-[900px]:static">
          <h3 className="font-serif text-[26px] leading-tight">訂單明細</h3>
          <div className="mt-1 mb-6 border-b border-border pb-6 font-mono text-[11px] tracking-[0.14em] uppercase text-muted">
            Order Summary
          </div>

          <SumRow label={`小計（${itemCount} 件）`} value={`NT$ ${subtotal.toLocaleString("zh-TW")}`} />
          <SumRow
            label="配送費"
            value={<span className="text-success">免運（滿 NT$ 1,200）</span>}
          />
          <SumRow
            label="會員折抵 — Tier 02"
            value={<span className="text-accent">− NT$ {memberDiscount}</span>}
          />

          <form
            className="my-6 flex border border-border"
            // visual mockup; no submit handler
          >
            <input
              defaultValue=""
              placeholder="輸入優惠碼，例：MAY-2026"
              className="flex-1 border-0 bg-transparent px-3.5 py-3 text-[13px] text-fg placeholder:text-muted focus:outline-none"
            />
            <button
              type="button"
              className="border-l border-border px-4 py-3 font-mono text-[11px] tracking-[0.14em] uppercase text-accent"
            >
              套用
            </button>
          </form>

          <div className="mt-4 flex items-baseline justify-between border-t border-border pt-6">
            <span className="font-mono text-[11px] tracking-[0.18em] uppercase text-muted">
              總計
            </span>
            <span className="font-serif text-[38px] tabular-nums">
              <small className="mr-1.5 font-mono text-[12px] text-muted">
                NT$
              </small>
              {total.toLocaleString("zh-TW")}
            </span>
          </div>

          <Button href="#" variant="primary" block className="mt-7">
            前往結帳 →
          </Button>

          <ul className="mt-6 border-t border-border pt-6 font-mono text-[11px] leading-[1.7] tracking-[0.04em] text-muted">
            {[
              "下週一（05.06）烘焙完成隔日出貨",
              "本訂單可在出貨前修改一次",
              "新會員首次訂閱享 9 折",
            ].map((note) => (
              <li key={note} className="relative py-1 pl-4">
                <span className="absolute left-0 text-accent">—</span>
                {note}
              </li>
            ))}
          </ul>
        </aside>
      </section>

      {/* ========== Cross-sell ========== */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-[var(--max)] px-[var(--gutter)] py-[clamp(48px,6vw,80px)]">
          <div className="mb-[clamp(32px,5vw,64px)] grid grid-cols-[1fr_auto] items-end gap-6 border-b border-border pb-6 max-[640px]:grid-cols-1">
            <div>
              <span className="mb-3.5 block font-mono text-[11px] tracking-[0.18em] uppercase text-accent">
                你可能也會喜歡
              </span>
              <h2 className="font-serif text-[32px] leading-[1.1]">
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
                  <h3 className="font-serif text-[20px] leading-[1.2] text-fg">
                    {item.name}
                  </h3>
                  <p className="font-serif text-[13px] italic leading-[1.5] text-fg-2">
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

/* ============== inline helpers ============== */

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

function SumRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between py-2.5 text-[14px]">
      <span className="text-fg-2">{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );
}
