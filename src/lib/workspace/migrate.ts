import "server-only";

import fs from "node:fs";

import { desc, eq } from "drizzle-orm";

import { getDbClient } from "@/lib/db/client";
import { ensureDatabase } from "@/lib/db/migrate";
import * as pgSchema from "@/lib/db/schema/postgres";
import * as sqliteSchema from "@/lib/db/schema/sqlite";
import type { JobDescription } from "@/lib/job-descriptions/types";
import { resolveResumeFontPreset } from "@/lib/resume/fonts";
import type {
  ResumeNode,
  ResumeNodeContent,
  ResumeNodeType,
  ResumeWithNodes,
} from "@/lib/resume/types";
import type { AiMessage, AiMode } from "@/lib/ai/types";
import type { AiPendingPlan } from "@/lib/ai/chat-session";
import type { PendingPatchProposal } from "@/lib/ai/protocol";
import type { ResumeSaveInput } from "@/lib/resume/types";

import { writeAiSessionDocumentRaw } from "./ai-session-store";
import { buildCommitMessage } from "./commit-message";
import { commitWorkspace, ensureWorkspaceGit } from "./git";
import { writeJdDocument } from "./jd-store";
import { ensureWorkspaceLayout } from "./layout";
import { getWorkspaceRoot, migrationMarkerPath } from "./paths";
import { writeResumeDocument } from "./resume-store";

export type MigrationResult = {
  migrated: boolean;
  resumeCount: number;
  jdCount: number;
  sessionCount: number;
  commitSha: string | null;
  skipped?: boolean;
};

export type MigrateOptions = {
  force?: boolean;
  root?: string;
};

function parseContent(content: unknown): ResumeNodeContent {
  if (typeof content === "string") {
    return JSON.parse(content) as ResumeNodeContent;
  }
  return (content ?? {}) as ResumeNodeContent;
}

function parseJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseJsonValue<T>(value: unknown): T | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "object") {
    return value as T;
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return null;
}

async function loadResumesFromDb(): Promise<ResumeWithNodes[]> {
  await ensureDatabase();
  const client = getDbClient();

  if (client.provider === "sqlite") {
    const resumes = client.db
      .select()
      .from(sqliteSchema.resumes)
      .orderBy(desc(sqliteSchema.resumes.updatedAt))
      .all();

    return resumes.map((resume) => {
      const nodes = client.db
        .select()
        .from(sqliteSchema.resumeNodes)
        .where(eq(sqliteSchema.resumeNodes.resumeId, resume.id))
        .orderBy(sqliteSchema.resumeNodes.sortOrder)
        .all()
        .map(
          (node): ResumeNode => ({
            id: node.id,
            resumeId: node.resumeId,
            type: node.type as ResumeNodeType,
            title: node.title,
            content: parseContent(node.content),
            sortOrder: node.sortOrder,
            enabled: Boolean(node.enabled),
            createdAt: node.createdAt,
            updatedAt: node.updatedAt,
          }),
        );

      return {
        ...resume,
        fontPreset: resolveResumeFontPreset(resume.fontPreset),
        nodes,
      };
    });
  }

  const resumes = await client.db
    .select()
    .from(pgSchema.resumes)
    .orderBy(desc(pgSchema.resumes.updatedAt));

  const result: ResumeWithNodes[] = [];

  for (const resume of resumes) {
    const nodes = await client.db
      .select()
      .from(pgSchema.resumeNodes)
      .where(eq(pgSchema.resumeNodes.resumeId, resume.id))
      .orderBy(pgSchema.resumeNodes.sortOrder);

    result.push({
      ...resume,
      fontPreset: resolveResumeFontPreset(resume.fontPreset),
      nodes: nodes.map((node) => ({
        id: node.id,
        resumeId: node.resumeId,
        type: node.type as ResumeNodeType,
        title: node.title,
        content: parseContent(node.content),
        sortOrder: node.sortOrder,
        enabled: Boolean(node.enabled),
        createdAt: node.createdAt,
        updatedAt: node.updatedAt,
      })),
    });
  }

  return result;
}

async function loadJdsFromDb(): Promise<JobDescription[]> {
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

type DbAiSession = {
  resumeId: string;
  mode: string;
  messages: unknown;
  summary: string | null;
  pendingPlan: unknown;
  selectedPlanStepIds: unknown;
  pendingProposal: unknown;
  sessionVersion: number | null;
  lastRunId: string | null;
  agentState: unknown;
  updatedAt: string;
};

async function loadAiSessionsFromDb(): Promise<DbAiSession[]> {
  await ensureDatabase();
  const client = getDbClient();

  if (client.provider === "sqlite") {
    return client.db.select().from(sqliteSchema.aiChatSessions).all() as DbAiSession[];
  }

  return (await client.db
    .select()
    .from(pgSchema.aiChatSessions)) as DbAiSession[];
}

function dbSessionToStored(row: DbAiSession) {
  const agentState = parseJsonValue<{ undoSnapshot?: ResumeSaveInput }>(
    row.agentState,
  );

  return {
    messages: parseJsonArray<AiMessage>(row.messages),
    mode: row.mode as AiMode,
    pendingPlan: parseJsonValue<AiPendingPlan>(row.pendingPlan),
    selectedPlanStepIds: parseJsonArray<string>(row.selectedPlanStepIds),
    pendingProposal: parseJsonValue<PendingPatchProposal>(row.pendingProposal),
    summary: row.summary,
    sessionVersion: row.sessionVersion ?? 0,
    lastRunId: row.lastRunId,
    undoSnapshot: (agentState?.undoSnapshot ?? null) as ResumeSaveInput | null,
    updatedAt: row.updatedAt,
  };
}

export async function migrateDatabaseDocumentsToWorkspace(
  options: MigrateOptions = {},
): Promise<MigrationResult> {
  const root = options.root ?? getWorkspaceRoot();
  ensureWorkspaceLayout(root);
  await ensureWorkspaceGit(root);

  const marker = migrationMarkerPath(root);
  if (fs.existsSync(marker) && !options.force) {
    return {
      migrated: false,
      skipped: true,
      resumeCount: 0,
      jdCount: 0,
      sessionCount: 0,
      commitSha: null,
    };
  }

  let resumes: ResumeWithNodes[] = [];
  let jds: JobDescription[] = [];
  let sessions: DbAiSession[] = [];

  try {
    resumes = await loadResumesFromDb();
    jds = await loadJdsFromDb();
    sessions = await loadAiSessionsFromDb();
  } catch {
    fs.writeFileSync(
      marker,
      JSON.stringify(
        {
          migratedAt: new Date().toISOString(),
          resumeCount: 0,
          jdCount: 0,
          sessionCount: 0,
          note: "database unavailable or empty",
        },
        null,
        2,
      ),
      "utf8",
    );
    const sha = await commitWorkspace(
      await buildCommitMessage({
        hint: "Initialize workspace",
        root,
        useAi: false,
      }),
      root,
    );
    return {
      migrated: true,
      resumeCount: 0,
      jdCount: 0,
      sessionCount: 0,
      commitSha: sha,
    };
  }

  for (const resume of resumes) {
    await writeResumeDocument(resume, root);
  }
  for (const jd of jds) {
    await writeJdDocument(jd, root);
  }
  for (const session of sessions) {
    await writeAiSessionDocumentRaw(
      session.resumeId,
      dbSessionToStored(session),
      root,
    );
  }

  fs.writeFileSync(
    marker,
    JSON.stringify(
      {
        migratedAt: new Date().toISOString(),
        resumeCount: resumes.length,
        jdCount: jds.length,
        sessionCount: sessions.length,
        forced: Boolean(options.force),
      },
      null,
      2,
    ),
    "utf8",
  );

  const sha = await commitWorkspace(
    await buildCommitMessage({
      hint:
        resumes.length || jds.length || sessions.length
          ? `Migrate ${resumes.length} resumes, ${jds.length} JDs, ${sessions.length} AI sessions from database`
          : "Initialize workspace",
      root,
      useAi: false,
    }),
    root,
  );

  return {
    migrated: true,
    resumeCount: resumes.length,
    jdCount: jds.length,
    sessionCount: sessions.length,
    commitSha: sha,
  };
}
