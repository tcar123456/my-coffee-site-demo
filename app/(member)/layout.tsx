import { Masthead } from "@/components/Masthead";
import { Footer } from "@/components/Footer";

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Masthead />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
