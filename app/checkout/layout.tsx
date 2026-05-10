// Phase 3b — 結帳 route group layout
// 完全獨立 layout：不繼承 (shop) 的 Masthead/PromoBar/Footer。
// gating：未登入 redirect /login；cart 為空 redirect /cart。
// CheckoutHeader（含 logo、stepper、回購物車）由各 page 自行渲染並指定 currentStep。

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/checkout/address");
  }

  const itemCount = await prisma.cartItem.count({
    where: { cart: { userId: session.user.id } },
  });
  if (itemCount === 0) {
    redirect("/cart");
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <main className="flex-1">{children}</main>
    </div>
  );
}
