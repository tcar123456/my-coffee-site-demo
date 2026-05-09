import Link from "next/link";
import { LoginForm } from "./LoginForm";

type SearchParams = Promise<{ callbackUrl?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="w-full max-w-[440px]">
      <div className="mb-10 text-center">
        <div className="mb-3 font-mono text-[11px] tracking-[0.18em] uppercase text-accent">
          會員登入 · Sign in
        </div>
        <h1 className="font-serif text-[clamp(28px,3.4vw,40px)] leading-[1.1] tracking-[-0.01em]">
          歡迎回來
        </h1>
        <p className="mt-3 text-[13px] text-fg-2">
          以您的會員帳號繼續，或建立新的咖啡帳戶。
        </p>
      </div>

      <LoginForm callbackUrl={callbackUrl} />

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
        以 Google 帳號登入 · 即將推出
      </button>

      <p className="mt-8 text-center text-[13px] text-fg-2">
        還沒有帳號？{" "}
        <Link
          href="/register"
          className="font-mono text-[12px] tracking-[0.08em] text-accent underline-offset-4 hover:underline"
        >
          建立帳戶 →
        </Link>
      </p>
    </div>
  );
}
