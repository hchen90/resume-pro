import "server-only";

import { sql } from "drizzle-orm";

import { getDbClient } from "./client";

let migrated = false;

export async function ensureDatabase() {
  if (migrated) {
    return;
  }

  const client = getDbClient();

  if (client.provider === "sqlite") {
    client.raw.exec(`
      CREATE TABLE IF NOT EXISTS resumes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        template_id TEXT NOT NULL DEFAULT 'classic',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS resume_nodes (
        id TEXT PRIMARY KEY,
        resume_id TEXT NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        sort_order INTEGER NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS resume_nodes_resume_order_idx
      ON resume_nodes (resume_id, sort_order);
    `);
  } else {
    await client.db.execute(sql`
      CREATE TABLE IF NOT EXISTS resumes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        template_id TEXT NOT NULL DEFAULT 'classic',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    await client.db.execute(sql`
      CREATE TABLE IF NOT EXISTS resume_nodes (
        id TEXT PRIMARY KEY,
        resume_id TEXT NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        sort_order INTEGER NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    await client.db.execute(sql`
      CREATE INDEX IF NOT EXISTS resume_nodes_resume_order_idx
      ON resume_nodes (resume_id, sort_order);
    `);
  }

  migrated = true;
}
