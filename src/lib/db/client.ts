import "server-only";

import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzlePostgres } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as pgSchema from "./schema/postgres";
import * as sqliteSchema from "./schema/sqlite";

export type DatabaseProvider = "sqlite" | "postgres";

export type DbClient =
  | {
      provider: "sqlite";
      db: ReturnType<typeof drizzleSqlite<typeof sqliteSchema>>;
      raw: Database.Database;
    }
  | {
      provider: "postgres";
      db: ReturnType<typeof drizzlePostgres<typeof pgSchema>>;
      pool: Pool;
    };

let cachedClient: DbClient | undefined;

export function getDatabaseProvider(): DatabaseProvider {
  if (process.env.DATABASE_PROVIDER === "postgres") {
    return "postgres";
  }

  return "sqlite";
}

export function getDbClient(): DbClient {
  if (cachedClient) {
    return cachedClient;
  }

  if (getDatabaseProvider() === "postgres") {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required when DATABASE_PROVIDER=postgres.");
    }

    const pool = new Pool({ connectionString });
    cachedClient = {
      provider: "postgres",
      pool,
      db: drizzlePostgres(pool, { schema: pgSchema }),
    };
    return cachedClient;
  }

  const sqlitePath = process.env.SQLITE_PATH ?? "./data/resume-pro.sqlite";
  const absolutePath = path.isAbsolute(sqlitePath)
    ? sqlitePath
    : path.join(/* turbopackIgnore: true */ process.cwd(), sqlitePath);

  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });

  const raw = new Database(absolutePath);
  raw.pragma("journal_mode = WAL");
  raw.pragma("foreign_keys = ON");

  cachedClient = {
    provider: "sqlite",
    raw,
    db: drizzleSqlite(raw, { schema: sqliteSchema }),
  };
  return cachedClient;
}
