import { Masthead } from "@/components/Masthead";
import { Footer } from "@/components/Footer";
import { auth } from "@/lib/auth";

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <>
      <Masthead session={session} />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
