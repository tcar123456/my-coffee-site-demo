// Phase 3b — 結帳流程 header
// 上方 minimal nav（logo + 回購物車） + step indicator（仿 cart page.tsx 樣式）
// server component；由各 checkout page 顯式渲染並指定 currentStep。

import Link from "next/link";

type CheckoutStep = 1 | 2 | 3;

const steps: ReadonlyArray<{ no: string; label: string }> = [
  { no: "01", label: "配送地址" },
  { no: "02", label: "付款方式" },
  { no: "03", label: "確認下單" },
];

export function CheckoutHeader({ currentStep }: { currentStep: CheckoutStep }) {
  return (
    <>
      {/* Minimal nav */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-[var(--max)] items-center justify-between px-[var(--gutter)] py-5">
          <Link href="/" className="flex items-baseline gap-3">
            <span className="font-serif text-2xl tracking-[0.04em] text-fg">
              暮焙
            </span>
            <span className="font-mono text-[10px] tracking-[0.32em] text-muted">
              MUBEI
            </span>
          </Link>
          <Link
            href="/cart"
            className="font-mono text-[11px] tracking-[0.16em] uppercase text-muted hover:text-accent"
          >
            ← 回購物車
          </Link>
        </div>
      </header>

      {/* Step indicator */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-[var(--max)] items-center justify-center gap-8 px-[var(--gutter)] py-[18px] font-mono text-[11px] tracking-[0.18em] uppercase max-[720px]:gap-3">
          {steps.map((s, idx) => {
            const stepNum = (idx + 1) as CheckoutStep;
            const state: "done" | "active" | "idle" =
              stepNum < currentStep
                ? "done"
                : stepNum === currentStep
                  ? "active"
                  : "idle";
            return (
              <div key={s.no} className="flex items-center gap-8 max-[720px]:gap-3">
                <Step no={s.no} label={s.label} state={state} />
                {idx < steps.length - 1 && <StepRule />}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

function Step({
  no,
  label,
  state,
}: {
  no: string;
  label: string;
  state: "idle" | "active" | "done";
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
