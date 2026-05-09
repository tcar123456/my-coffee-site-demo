import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
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
            href="/"
            className="font-mono text-[11px] tracking-[0.16em] uppercase text-muted hover:text-accent"
          >
            ← 回首頁
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-[var(--gutter)] py-[clamp(48px,8vw,96px)]">
        {children}
      </main>
    </div>
  );
}
