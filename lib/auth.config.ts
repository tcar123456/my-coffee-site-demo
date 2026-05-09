import type { NextAuthConfig } from "next-auth";

// Edge-safe 設定：給 middleware/proxy 用。
// 這裡不能 import bcrypt / Prisma — proxy 跑在 edge runtime。
// 純資料 shape 的 callbacks（jwt / session / authorized）必須住在這個檔案，
// 因為 proxy 也會評估它們；如果只放在 lib/auth.ts，middleware 看不到 role 欄位。
// Credentials provider 與 authorize() 帶有 bcrypt + Prisma，留在 lib/auth.ts。
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role;
      const { pathname } = nextUrl;

      if (pathname.startsWith("/admin")) {
        if (!isLoggedIn) return false;
        return role === "SELLER";
      }
      if (pathname.startsWith("/account")) {
        return isLoggedIn;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
