import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { prisma } from "./prisma";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.password) return null;

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // 蓋掉 auth.config 的 edge 版 jwt：在 node side 額外驗 token.id 對應的 User 還在 DB。
    // 沒這層的話，DB reset / 帳號被刪後 JWT cookie 仍有效，server actions 寫入會撞 FK violation。
    // 回 null 會讓 NextAuth 廢掉這張 JWT，後續 auth() 直接回 null。
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        return token;
      }
      if (token?.id) {
        try {
          const exists = await prisma.user.findUnique({
            where: { id: token.id },
            select: { id: true, role: true },
          });
          if (!exists) return null;
          token.role = exists.role;
        } catch {
          // DB 暫時連不上：保留 token，讓 server actions 各自擋（避免登入狀態被 DB 抖動洗掉）
        }
      }
      return token;
    },
  },
});
