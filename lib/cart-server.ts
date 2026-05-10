import "server-only";
import { prisma } from "./prisma";

// 給 layout 用：登入用戶的購物車件數（總和 qty）
export async function getCartCount(userId: string): Promise<number> {
  const result = await prisma.cartItem.aggregate({
    where: { cart: { userId } },
    _sum: { qty: true },
  });
  return result._sum.qty ?? 0;
}
