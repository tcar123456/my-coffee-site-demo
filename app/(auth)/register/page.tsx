import Link from "next/link";
import { RegisterForm } from "./RegisterForm";

export default function RegisterPage() {
  return (
    <div className="w-full max-w-[440px]">
      <div className="mb-10 text-center">
        <div className="mb-3 font-mono text-[11px] tracking-[0.18em] uppercase text-accent">
          建立帳戶 · Sign up
        </div>
        <h1 className="font-serif text-[clamp(28px,3.4vw,40px)] leading-[1.1] tracking-[-0.01em]">
          開始你的咖啡旅程
        </h1>
        <p className="mt-3 text-[13px] text-fg-2">
          建立帳戶以收藏豆款、管理訂閱與訂單。
        </p>
      </div>

      <RegisterForm />

      <div className="my-8 flex items-center gap-4 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">
        <span className="h-px flex-1 bg-border" />
        <span>或</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <button
        type="button"
        disabled
        title="即將推出"
        className="flex w-full cursor-not-allowed items-center justify-center gap-3 border border-border px-5 py-3.5 font-mono text-[12px] tracking-[0.14em] uppercase text-muted opacity-60"
      >
        <span aria-hidden>G</span>
        以 Google 帳號註冊 · 即將推出
      </button>

      <p className="mt-8 text-center text-[13px] text-fg-2">
        已有帳號？{" "}
        <Link
          href="/login"
          className="font-mono text-[12px] tracking-[0.08em] text-accent underline-offset-4 hover:underline"
        >
          直接登入 →
        </Link>
      </p>
    </div>
  );
}
