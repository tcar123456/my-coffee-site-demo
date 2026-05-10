import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listAddresses } from "@/app/actions/address";
import { AddressList } from "./AddressList";

export default async function AddressesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const addresses = await listAddresses();

  return (
    <>
      {/* ========== Header ========== */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-[var(--max)] px-[var(--gutter)] py-[clamp(40px,5vw,64px)]">
          <div className="mb-3 font-mono text-[11px] tracking-[0.18em] uppercase text-accent">
            <Link href="/account" className="text-muted hover:text-accent">
              ← 會員中心
            </Link>
            <span className="mx-3 text-border">/</span>
            地址管理
          </div>
          <h1 className="font-serif text-[clamp(28px,3.6vw,44px)] leading-none tracking-[-0.01em]">
            地址管理
          </h1>
          <div className="mt-3 font-mono text-[11px] tracking-[0.14em] uppercase text-muted">
            共 {addresses.length.toString().padStart(2, "0")} 筆地址
          </div>
        </div>
      </section>

      {/* ========== Body ========== */}
      <section className="mx-auto max-w-[var(--max)] px-[var(--gutter)] pt-[clamp(32px,4vw,56px)] pb-[clamp(64px,8vw,112px)]">
        <AddressList addresses={addresses} />
      </section>
    </>
  );
}
