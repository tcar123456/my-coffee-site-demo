import { Masthead } from "@/components/Masthead";
import { PromoBar } from "@/components/PromoBar";
import { Footer } from "@/components/Footer";
import { auth } from "@/lib/auth";
import { getCartCount } from "@/lib/cart-server";

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const cartCount = session?.user?.id ? await getCartCount(session.user.id) : 0;
  return (
    <>
      <Masthead session={session} serverCartCount={cartCount} />
      <PromoBar
        message="本季新到 · 衣索比亞 耶加雪菲 G1 水洗批次 已開放預購"
        ctaHref="/products"
        ctaLabel="前往訂購 →"
      />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
