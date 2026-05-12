import "dotenv/config";

import { defineConfig } from "drizzle-kit";

const provider = process.env.DATABASE_PROVIDER ?? "sqlite";
const isPostgres = provider === "postgres";

export default defineConfig({
  schema: isPostgres
    ? "./src/lib/db/schema/postgres.ts"
    : "./src/lib/db/schema/sqlite.ts",
  out: isPostgres ? "./drizzle/postgres" : "./drizzle/sqlite",
  dialect: isPostgres ? "postgresql" : "sqlite",
  dbCredentials: isPostgres
    ? {
        url:
          process.env.DATABASE_URL ??
          "postgres://user:password@localhost:5432/resume_pro",
      }
    : {
        url: process.env.SQLITE_PATH ?? "./data/resume-pro.sqlite",
      },
});
