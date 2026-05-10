import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// 注意：這裡只能 import edge-safe 的 auth.config，不能 import lib/auth.ts
// （後者帶有 bcrypt + Prisma，無法在 edge runtime 執行）。
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/account/:path*", "/admin/:path*", "/checkout/:path*"],
};
