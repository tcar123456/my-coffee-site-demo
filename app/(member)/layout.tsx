import { Masthead } from "@/components/Masthead";
import { Footer } from "@/components/Footer";
import { auth } from "@/lib/auth";
import { getCartCount } from "@/lib/cart-server";

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const cartCount = session?.user?.id ? await getCartCount(session.user.id) : 0;
  return (
    <>
      <Masthead session={session} serverCartCount={cartCount} />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
