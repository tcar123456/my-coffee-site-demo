import { Masthead } from "@/components/Masthead";
import { PromoBar } from "@/components/PromoBar";
import { Footer } from "@/components/Footer";

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Masthead />
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
