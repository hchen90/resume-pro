import "server-only";

import { sql } from "drizzle-orm";

import { getDbClient } from "./client";

let migrated = false;

function addSqliteColumn(sqlText: string) {
  const client = getDbClient();
  if (client.provider !== "sqlite") {
    return;
  }

  try {
    client.raw.exec(sqlText);
  } catch {
    /* column already exists */
  }
}

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
        font_preset TEXT NOT NULL DEFAULT 'sans',
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

      CREATE TABLE IF NOT EXISTS job_descriptions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS job_descriptions_updated_idx
      ON job_descriptions (updated_at);

      CREATE TABLE IF NOT EXISTS ai_chat_sessions (
        resume_id TEXT PRIMARY KEY REFERENCES resumes(id) ON DELETE CASCADE,
        mode TEXT NOT NULL DEFAULT 'chat',
        messages TEXT NOT NULL,
        summary TEXT,
        pending_plan TEXT,
        selected_plan_step_ids TEXT NOT NULL,
        pending_proposal TEXT,
        session_version INTEGER NOT NULL DEFAULT 0,
        last_run_id TEXT,
        agent_context TEXT,
        agent_state TEXT,
        updated_at TEXT NOT NULL
      );
    `);

    addSqliteColumn(
      `ALTER TABLE resumes ADD COLUMN font_preset TEXT NOT NULL DEFAULT 'sans';`,
    );
    addSqliteColumn(`ALTER TABLE ai_chat_sessions ADD COLUMN pending_proposal TEXT`);
    addSqliteColumn(
      `ALTER TABLE ai_chat_sessions ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0`,
    );
    addSqliteColumn(`ALTER TABLE ai_chat_sessions ADD COLUMN last_run_id TEXT`);
    addSqliteColumn(`ALTER TABLE ai_chat_sessions ADD COLUMN agent_context TEXT`);
    addSqliteColumn(`ALTER TABLE ai_chat_sessions ADD COLUMN agent_state TEXT`);
  } else {
    await client.db.execute(sql`
      CREATE TABLE IF NOT EXISTS resumes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        template_id TEXT NOT NULL DEFAULT 'classic',
        font_preset TEXT NOT NULL DEFAULT 'sans',
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
    await client.db.execute(sql`
      CREATE TABLE IF NOT EXISTS job_descriptions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    await client.db.execute(sql`
      CREATE INDEX IF NOT EXISTS job_descriptions_updated_idx
      ON job_descriptions (updated_at);
    `);
    await client.db.execute(sql`
      ALTER TABLE resumes
      ADD COLUMN IF NOT EXISTS font_preset TEXT NOT NULL DEFAULT 'sans';
    `);
    await client.db.execute(sql`
      CREATE TABLE IF NOT EXISTS ai_chat_sessions (
        resume_id TEXT PRIMARY KEY REFERENCES resumes(id) ON DELETE CASCADE,
        mode TEXT NOT NULL DEFAULT 'chat',
        messages TEXT NOT NULL,
        summary TEXT,
        pending_plan TEXT,
        selected_plan_step_ids TEXT NOT NULL,
        pending_proposal TEXT,
        session_version INTEGER NOT NULL DEFAULT 0,
        last_run_id TEXT,
        agent_context TEXT,
        agent_state TEXT,
        updated_at TEXT NOT NULL
      );
    `);
    await client.db.execute(sql`
      ALTER TABLE ai_chat_sessions
      ADD COLUMN IF NOT EXISTS pending_proposal TEXT;
    `);
    await client.db.execute(sql`
      ALTER TABLE ai_chat_sessions
      ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;
    `);
    await client.db.execute(sql`
      ALTER TABLE ai_chat_sessions
      ADD COLUMN IF NOT EXISTS last_run_id TEXT;
    `);
    await client.db.execute(sql`
      ALTER TABLE ai_chat_sessions
      ADD COLUMN IF NOT EXISTS agent_context TEXT;
    `);
    await client.db.execute(sql`
      ALTER TABLE ai_chat_sessions
      ADD COLUMN IF NOT EXISTS agent_state TEXT;
    `);
  }

  migrated = true;
}
