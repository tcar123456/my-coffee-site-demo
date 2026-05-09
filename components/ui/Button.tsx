import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Variant = "primary" | "default" | "ghost";

const baseClasses =
  "inline-flex items-center gap-2.5 px-[22px] py-3.5 font-mono text-[12px] tracking-[0.16em] uppercase border transition-all duration-200";

const variantClasses: Record<Variant, string> = {
  default: "border-border-hi bg-transparent text-fg hover:border-accent hover:text-accent",
  primary: "border-accent bg-accent text-bg font-semibold hover:border-accent-hi hover:bg-accent-hi",
  ghost: "border-border bg-transparent text-fg hover:border-accent hover:text-accent",
};

type CommonProps = {
  variant?: Variant;
  block?: boolean;
  children: ReactNode;
  className?: string;
};

type ButtonAsLink = CommonProps & { href: string } & Omit<
  ComponentPropsWithoutRef<typeof Link>,
  "href" | "className" | "children"
>;
type ButtonAsButton = CommonProps & { href?: undefined } & Omit<
  ComponentPropsWithoutRef<"button">,
  "className" | "children"
>;

export function Button(props: ButtonAsLink | ButtonAsButton) {
  const {
    variant = "default",
    block = false,
    className = "",
    children,
    ...rest
  } = props;

  const merged = `${baseClasses} ${variantClasses[variant]} ${
    block ? "flex w-full justify-center" : ""
  } ${className}`.trim();

  if ("href" in rest && rest.href) {
    const { href, ...linkRest } = rest;
    return (
      <Link href={href} className={merged} {...linkRest}>
        {children}
      </Link>
    );
  }

  return (
    <button className={merged} {...(rest as ComponentPropsWithoutRef<"button">)}>
      {children}
    </button>
  );
}
