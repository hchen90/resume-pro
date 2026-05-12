import "server-only";

import { desc, eq } from "drizzle-orm";

import type { JobDescription } from "@/lib/job-descriptions/types";

import { getDbClient } from "./client";
import { ensureDatabase } from "./migrate";
import * as pgSchema from "./schema/postgres";
import * as sqliteSchema from "./schema/sqlite";

export async function listJobDescriptions(): Promise<JobDescription[]> {
  await ensureDatabase();
  const client = getDbClient();

  if (client.provider === "sqlite") {
    return client.db
      .select()
      .from(sqliteSchema.jobDescriptions)
      .orderBy(desc(sqliteSchema.jobDescriptions.updatedAt))
      .all();
  }

  return client.db
    .select()
    .from(pgSchema.jobDescriptions)
    .orderBy(desc(pgSchema.jobDescriptions.updatedAt));
}

export async function getJobDescription(id: string) {
  await ensureDatabase();
  const client = getDbClient();

  if (client.provider === "sqlite") {
    const [jobDescription] = client.db
      .select()
      .from(sqliteSchema.jobDescriptions)
      .where(eq(sqliteSchema.jobDescriptions.id, id))
      .limit(1)
      .all();

    return jobDescription ?? null;
  }

  const [jobDescription] = await client.db
    .select()
    .from(pgSchema.jobDescriptions)
    .where(eq(pgSchema.jobDescriptions.id, id))
    .limit(1);

  return jobDescription ?? null;
}

export async function createJobDescription(input: {
  title: string;
  content: string;
}) {
  await ensureDatabase();
  const client = getDbClient();
  const timestamp = new Date().toISOString();
  const jobDescription: JobDescription = {
    id: crypto.randomUUID(),
    title: input.title,
    content: input.content,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  if (client.provider === "sqlite") {
    client.db.insert(sqliteSchema.jobDescriptions).values(jobDescription).run();
  } else {
    await client.db.insert(pgSchema.jobDescriptions).values(jobDescription);
  }

  return jobDescription.id;
}
