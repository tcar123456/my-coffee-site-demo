import Link from "next/link";

type PromoBarProps = {
  message: string;
  ctaHref: string;
  ctaLabel: string;
};

export function PromoBar({ message, ctaHref, ctaLabel }: PromoBarProps) {
  return (
    <div className="border-b border-border bg-surface text-[12px] tracking-[0.04em] text-fg-2">
      <div className="mx-auto flex max-w-[var(--max)] items-center justify-between gap-6 px-[var(--gutter)] py-[11px]">
        <div className="flex items-center gap-3">
          <span className="inline-block size-1.5 animate-pulse-dot rounded-full bg-accent" />
          <span>{message}</span>
        </div>
        <Link
          href={ctaHref}
          className="border-b border-accent pb-px text-accent"
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
