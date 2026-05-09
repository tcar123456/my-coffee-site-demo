import Link from "next/link";
import { Button } from "@/components/ui/Button";

type SideNavItem = {
  label: string;
  num?: string;
  active?: boolean;
  muted?: boolean;
};

const memberNav: SideNavItem[] = [
  { label: "總覽", num: "→", active: true },
  { label: "訂單", num: "12" },
  { label: "訂閱配送", num: "02" },
  { label: "收藏豆款", num: "07" },
  { label: "地址", num: "02" },
  { label: "偏好設定", num: "" },
  { label: "烘焙筆記", num: "04" },
];

const accountNav: SideNavItem[] = [
  { label: "個人資料" },
  { label: "付款方式" },
  { label: "密碼" },
  { label: "登出 ↗", muted: true },
];

type Order = {
  id: string;
  date: string;
  title: string;
  meta: string;
  status: "ship" | "proc" | "done";
  statusLabel: string;
  total: number;
};

const orders: Order[] = [
  {
    id: "#MB-2614",
    date: "05.06 週一",
    title: "訂閱配送 · 雙週兩支",
    meta: "葉門 摩卡 × 1 · 衣索比亞 古吉 × 1",
    status: "proc",
    statusLabel: "處理中",
    total: 1180,
  },
  {
    id: "#MB-2588",
    date: "04.22 週二",
    title: "單次訂購 · 04 件",
    meta: "耶加雪菲 × 2 · 拉斯佛羅雷斯 × 1 · V60 濾杯 × 1",
    status: "ship",
    statusLabel: "已配送",
    total: 3440,
  },
  {
    id: "#MB-2529",
    date: "04.08 週二",
    title: "訂閱配送 · 雙週兩支",
    meta: "瓜地馬拉 × 1 · 肯亞 × 1",
    status: "done",
    statusLabel: "已完成",
    total: 1180,
  },
  {
    id: "#MB-2461",
    date: "03.25 週二",
    title: "單次訂購 · 02 件 · 送禮包裝",
    meta: "藝伎 紅標 × 1 · 蘇拉維西 × 1",
    status: "done",
    statusLabel: "已完成",
    total: 2160,
  },
];

const statusPillClasses: Record<Order["status"], string> = {
  ship: "text-success border-[oklch(40%_0.06_145)] before:bg-success",
  proc: "text-accent border-accent-tint before:bg-accent",
  done: "text-muted border-border before:bg-muted",
};

type Address = {
  label: string;
  name: string;
  lines: string[];
  phone: string;
  isDefault?: boolean;
};

const addresses: Address[] = [
  {
    label: "預設 · 居家",
    name: "余建中",
    lines: ["10485 台北市 中山區", "南京東路二段 132 號 8 樓"],
    phone: "+886 922 188 442",
    isDefault: true,
  },
  {
    label: "公司",
    name: "余建中（公司）",
    lines: ["11070 台北市 信義區", "松仁路 100 號 12 樓"],
    phone: "+886 2 8101 8888",
  },
];

type Wish = {
  no: string;
  origin: string;
  name: string;
  price: number;
  swatch: string;
};

const wishlist: Wish[] = [
  {
    no: "03",
    origin: "PANAMA",
    name: "翡翠莊園 藝伎",
    price: 1680,
    swatch:
      "linear-gradient(135deg, oklch(28% 0.04 60), oklch(18% 0.02 50))",
  },
  {
    no: "06",
    origin: "YEMEN",
    name: "摩卡 哈拉茲 日曬",
    price: 980,
    swatch:
      "linear-gradient(135deg, oklch(34% 0.07 30), oklch(20% 0.03 30))",
  },
  {
    no: "01",
    origin: "ETHIOPIA",
    name: "耶加雪菲 G1",
    price: 580,
    swatch:
      "linear-gradient(135deg, oklch(35% 0.06 130), oklch(20% 0.03 130))",
  },
  {
    no: "07",
    origin: "INDONESIA",
    name: "蘇拉維西 托拉雅",
    price: 480,
    swatch:
      "linear-gradient(135deg, oklch(32% 0.06 280), oklch(18% 0.03 280))",
  },
];

export default function AccountPage() {
  return (
    <>
      {/* ========== Account header ========== */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-[var(--max)] grid-cols-[auto_1fr_auto] items-center gap-8 px-[var(--gutter)] py-[clamp(40px,5vw,64px)] max-[720px]:grid-cols-[auto_1fr]">
          <div
            className="flex size-20 items-center justify-center rounded-full border border-border-hi font-serif text-[32px] text-accent"
            style={{
              background:
                "linear-gradient(135deg, oklch(35% 0.06 60), oklch(22% 0.03 50))",
            }}
          >
            YC
          </div>
          <div>
            <h1 className="font-serif text-[clamp(28px,3.6vw,44px)] leading-none tracking-[-0.01em]">
              早安，余先生
            </h1>
            <div className="mt-3 font-mono text-[11px] tracking-[0.14em] uppercase text-muted">
              會員 ID · MB-009842 / 加入於 2024.03.18
            </div>
          </div>
          <div className="border-l border-border pl-8 text-right max-[720px]:hidden">
            <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted">
              會員等級
            </div>
            <div className="mt-1.5 mb-1 font-serif text-[32px] text-accent">
              TIER 02
            </div>
            <div className="font-mono text-[12px] text-fg-2">
              3,840 pts · 享 95 折
            </div>
          </div>
        </div>
      </section>

      {/* ========== Account layout ========== */}
      <section className="mx-auto grid max-w-[var(--max)] grid-cols-[220px_1fr] items-start gap-14 px-[var(--gutter)] pt-[clamp(40px,5vw,64px)] pb-[clamp(64px,8vw,112px)] max-[900px]:grid-cols-1 max-[900px]:gap-8">
        {/* Side nav */}
        <aside className="sticky top-20 max-[900px]:static">
          <SideNavTitle>會員 · Member</SideNavTitle>
          {memberNav.map((item) => (
            <SideNavLink key={item.label} {...item} />
          ))}

          <SideNavTitle className="mt-8">帳戶</SideNavTitle>
          {accountNav.map((item) => (
            <SideNavLink key={item.label} {...item} />
          ))}
        </aside>

        {/* Content */}
        <div className="flex flex-col gap-6">
          {/* Active subscription */}
          <div
            className="relative grid grid-cols-[1fr_auto] items-center gap-8 overflow-hidden border border-accent-tint p-8 max-[720px]:grid-cols-1"
            style={{
              background:
                "linear-gradient(135deg, var(--surface), oklch(20% 0.02 60))",
            }}
          >
            <div
              className="pointer-events-none absolute -top-10 -right-10 size-[200px]"
              style={{
                background:
                  "radial-gradient(circle, oklch(45% 0.10 60 / 0.3), transparent 70%)",
              }}
            />
            <div className="relative">
              <div className="mb-3.5 font-mono text-[11px] tracking-[0.18em] uppercase text-accent">
                進行中 — Active Subscription
              </div>
              <h2 className="mb-3.5 font-serif text-[30px] leading-[1.1]">
                雙週兩支 · 一深一淺
              </h2>
              <p className="mb-[22px] max-w-[44ch] leading-[1.6] text-fg-2">
                下次出貨日{" "}
                <strong className="text-accent">2026.05.15（週四）</strong>
                。本批主理人選了 <strong>葉門 摩卡 哈拉茲</strong> 與{" "}
                <strong>衣索比亞 古吉 G1</strong>。
              </p>
              <div className="flex flex-wrap gap-7 font-mono text-[11px] tracking-[0.04em] text-muted">
                <SubMeta value="NT$ 1,180" tail="每 14 天" />
                <SubMeta value="已配送 09 期" tail="共續訂 12 期" />
                <SubMeta value="累積回饋 540 pts" />
              </div>
            </div>
            <div className="relative z-[2] flex flex-col gap-2.5">
              <Button href="#" variant="primary">
                調整這期 →
              </Button>
              <Button href="#" variant="ghost">
                暫停一期
              </Button>
            </div>
          </div>

          {/* Recent orders */}
          <Panel
            title="最近訂單"
            action={{ href: "#", label: "全部 12 筆 →" }}
          >
            {orders.map((o) => (
              <div
                key={o.id}
                className="grid grid-cols-[80px_1fr_auto_auto] items-center gap-[18px] border-b border-border py-[18px] last:border-b-0 max-[700px]:grid-cols-[1fr_auto]"
              >
                <div className="max-[700px]:col-start-1">
                  <div className="font-mono text-[11px] tracking-[0.08em] text-accent">
                    {o.id}
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-muted">
                    {o.date}
                  </div>
                </div>
                <div className="text-[14px] text-fg max-[700px]:col-span-full">
                  {o.title}
                  <div className="mt-1 text-[12px] text-muted">{o.meta}</div>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 border px-2.5 py-[5px] font-mono text-[10px] tracking-[0.16em] uppercase before:size-1.5 before:rounded-full ${statusPillClasses[o.status]}`}
                >
                  {o.statusLabel}
                </span>
                <div className="min-w-[100px] text-right font-serif text-[18px] tabular-nums">
                  <small className="mr-1 font-mono text-[11px] text-muted">
                    NT$
                  </small>
                  {o.total.toLocaleString("zh-TW")}
                </div>
              </div>
            ))}
          </Panel>

          {/* Two-col split: addresses + wishlist */}
          <div className="grid grid-cols-[1.2fr_1fr] gap-6 max-[900px]:grid-cols-1">
            <Panel title="常用地址" action={{ href: "#", label: "+ 新增" }}>
              <div className="grid grid-cols-2 gap-4 max-[580px]:grid-cols-1">
                {addresses.map((a) => (
                  <div
                    key={a.name}
                    className={`flex flex-col gap-1.5 border p-[22px] ${
                      a.isDefault
                        ? "border-accent-tint bg-surface-2"
                        : "border-border"
                    }`}
                  >
                    <div className="mb-1.5 font-mono text-[10px] tracking-[0.16em] uppercase text-accent">
                      {a.label}
                    </div>
                    <div className="font-serif text-[18px]">{a.name}</div>
                    <div className="text-[13px] text-fg-2">
                      {a.lines.map((line, i) => (
                        <span key={i} className="block">
                          {line}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 font-mono text-[12px] text-muted">
                      {a.phone}
                    </div>
                    <Link
                      href="#"
                      className="mt-3 font-mono text-[11px] tracking-[0.14em] uppercase text-muted hover:text-accent"
                    >
                      編輯 →
                    </Link>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="收藏豆款" action={{ href: "#", label: "07 →" }}>
              {wishlist.map((w) => (
                <div
                  key={w.no}
                  className="grid grid-cols-[56px_1fr_auto] items-center gap-4 border-b border-border py-3.5 last:border-b-0"
                >
                  <div
                    className="aspect-square border border-border"
                    style={{ background: w.swatch }}
                  />
                  <div>
                    <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-muted">
                      N° {w.no} · {w.origin}
                    </div>
                    <div className="font-serif text-[15px]">{w.name}</div>
                  </div>
                  <div className="font-mono text-[13px] text-accent">
                    NT$ {w.price.toLocaleString("zh-TW")}
                  </div>
                </div>
              ))}
            </Panel>
          </div>
        </div>
      </section>
    </>
  );
}

/* ============ inline helpers ============ */

function SideNavTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mb-3.5 border-b border-border pb-3.5 font-mono text-[11px] tracking-[0.18em] uppercase text-accent ${className}`}
    >
      {children}
    </div>
  );
}

function SideNavLink({ label, num, active, muted }: SideNavItem) {
  return (
    <Link
      href="#"
      className={`flex items-center justify-between border-l-2 py-[11px] pr-3.5 pl-3.5 text-[14px] transition-all duration-150 ${
        active
          ? "border-l-accent bg-surface text-fg"
          : "border-l-transparent hover:text-accent"
      } ${muted ? "text-muted" : active ? "" : "text-fg-2"}`}
    >
      <span>{label}</span>
      {num !== undefined && (
        <span className="font-mono text-[11px] text-muted">{num}</span>
      )}
    </Link>
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

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-7 py-[22px]">
        <h3 className="font-serif text-[22px]">{title}</h3>
        {action && (
          <Link
            href={action.href}
            className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted hover:text-accent"
          >
            {action.label}
          </Link>
        )}
      </div>
      <div className="p-7">{children}</div>
    </div>
  );
}
