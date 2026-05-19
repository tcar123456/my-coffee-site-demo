import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

// Lazy proxy：deferring createClient() until first real property access.
// 動機：smoke test 透過 `lib/reports.ts` 等 helper 間接 import 此模組時，
// dotenv.config() 還沒執行，process.env.DATABASE_URL 尚未注入。改成 lazy
// 之後，只要實際呼叫 prisma.* 時才會建 client，避開 module-load 時 throw。
// 一般 Next.js 流程（每次 request 已備好 env）行為等同原本的 eager init。
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createClient();
    }
    return Reflect.get(globalForPrisma.prisma, prop, receiver);
  },
});
