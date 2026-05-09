import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// 載入 .env.local（Next.js 慣例放 secrets 的地方）
dotenv.config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Prisma CLI（migrate / db push / studio）走直連 / session mode，避開 pgbouncer transaction mode 的限制
    url: process.env["DIRECT_URL"],
  },
});
