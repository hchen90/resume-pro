import "server-only";

import { desc, eq } from "drizzle-orm";

import { createDefaultResumeNodes } from "@/lib/resume/defaults";
import {
  defaultResumeFontPreset,
  resolveResumeFontPreset,
} from "@/lib/resume/fonts";
import { defaultLocale, type Locale } from "@/lib/i18n";
import type {
  Resume,
  ResumeNode,
  ResumeNodeContent,
  ResumeNodeType,
  ResumeSaveInput,
  ResumeWithNodes,
} from "@/lib/resume/types";

import { getDbClient } from "./client";
import { ensureDatabase } from "./migrate";
import * as pgSchema from "./schema/postgres";
import * as sqliteSchema from "./schema/sqlite";

export class ResumeVersionConflictError extends Error {
  constructor(message = "Resume version conflict.") {
    super(message);
    this.name = "ResumeVersionConflictError";
  }
}

type ResumeRow = {
  id: string;
  title: string;
  templateId: string;
  fontPreset: string;
  createdAt: string;
  updatedAt: string;
};

type NodeRow = {
  id: string;
  resumeId: string;
  type: string;
  title: string;
  content: unknown;
  sortOrder: number;
  enabled: boolean | number;
  createdAt: string;
  updatedAt: string;
};

export async function listResumes(): Promise<Resume[]> {
  await ensureDatabase();
  const client = getDbClient();

  if (client.provider === "sqlite") {
    return client.db
      .select()
      .from(sqliteSchema.resumes)
      .orderBy(desc(sqliteSchema.resumes.updatedAt))
      .all();
  }

  return client.db
    .select()
    .from(pgSchema.resumes)
    .orderBy(desc(pgSchema.resumes.updatedAt));
}

export async function getResume(id: string): Promise<ResumeWithNodes | null> {
  await ensureDatabase();
  const client = getDbClient();

  if (client.provider === "sqlite") {
    const [resume] = client.db
      .select()
      .from(sqliteSchema.resumes)
      .where(eq(sqliteSchema.resumes.id, id))
      .limit(1)
      .all();

    if (!resume) {
      return null;
    }

    const nodes = client.db
      .select()
      .from(sqliteSchema.resumeNodes)
      .where(eq(sqliteSchema.resumeNodes.resumeId, id))
      .orderBy(sqliteSchema.resumeNodes.sortOrder)
      .all();

    return toResumeWithNodes(resume, nodes);
  }

  const [resume] = await client.db
    .select()
    .from(pgSchema.resumes)
    .where(eq(pgSchema.resumes.id, id))
    .limit(1);

  if (!resume) {
    return null;
  }

  const nodes = await client.db
    .select()
    .from(pgSchema.resumeNodes)
    .where(eq(pgSchema.resumeNodes.resumeId, id))
    .orderBy(pgSchema.resumeNodes.sortOrder);

  return toResumeWithNodes(resume, nodes);
}

export async function createResume(
  title = "我的简历",
  locale: Locale = defaultLocale,
) {
  await ensureDatabase();
  const client = getDbClient();
  const timestamp = new Date().toISOString();
  const resume: Resume = {
    id: crypto.randomUUID(),
    title,
    templateId: "classic",
    fontPreset: defaultResumeFontPreset,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const nodes = createDefaultResumeNodes(resume.id, locale);

  if (client.provider === "sqlite") {
    const tx = client.raw.transaction(() => {
      client.db.insert(sqliteSchema.resumes).values(resume).run();
      client.db
        .insert(sqliteSchema.resumeNodes)
        .values(nodes.map((node) => toSqliteNodeValue(node)))
        .run();
    });
    tx();
  } else {
    await client.db.transaction(async (tx) => {
      await tx.insert(pgSchema.resumes).values(resume);
      await tx
        .insert(pgSchema.resumeNodes)
        .values(nodes.map((node) => toPostgresNodeValue(node)));
    });
  }

  return resume.id;
}

export async function deleteResume(id: string) {
  await ensureDatabase();
  const client = getDbClient();

  if (client.provider === "sqlite") {
    client.db.delete(sqliteSchema.resumes).where(eq(sqliteSchema.resumes.id, id)).run();
  } else {
    await client.db.delete(pgSchema.resumes).where(eq(pgSchema.resumes.id, id));
  }
}

export async function saveResume(
  id: string,
  input: ResumeSaveInput,
  options?: {
    expectedUpdatedAt?: string;
  },
): Promise<ResumeWithNodes> {
  await ensureDatabase();
  const client = getDbClient();
  const timestamp = new Date().toISOString();
  const resumeUpdate = {
    title: input.title,
    templateId: input.templateId,
    fontPreset: input.fontPreset,
    updatedAt: timestamp,
  };
  const nodes = input.nodes.map<ResumeNode>((node, index) => ({
    ...node,
    resumeId: id,
    sortOrder: index,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  if (client.provider === "sqlite") {
    const tx = client.raw.transaction(() => {
      const [current] = client.db
        .select()
        .from(sqliteSchema.resumes)
        .where(eq(sqliteSchema.resumes.id, id))
        .limit(1)
        .all();

      if (!current) {
        throw new Error(`Resume ${id} was not found.`);
      }

      if (
        options?.expectedUpdatedAt &&
        current.updatedAt !== options.expectedUpdatedAt
      ) {
        throw new ResumeVersionConflictError();
      }

      client.db
        .update(sqliteSchema.resumes)
        .set(resumeUpdate)
        .where(eq(sqliteSchema.resumes.id, id))
        .run();
      client.db
        .delete(sqliteSchema.resumeNodes)
        .where(eq(sqliteSchema.resumeNodes.resumeId, id))
        .run();
      client.db
        .insert(sqliteSchema.resumeNodes)
        .values(nodes.map((node) => toSqliteNodeValue(node)))
        .run();
    });
    tx();
  } else {
    await client.db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(pgSchema.resumes)
        .where(eq(pgSchema.resumes.id, id))
        .limit(1);

      if (!current) {
        throw new Error(`Resume ${id} was not found.`);
      }

      if (
        options?.expectedUpdatedAt &&
        current.updatedAt !== options.expectedUpdatedAt
      ) {
        throw new ResumeVersionConflictError();
      }

      await tx
        .update(pgSchema.resumes)
        .set(resumeUpdate)
        .where(eq(pgSchema.resumes.id, id));
      await tx
        .delete(pgSchema.resumeNodes)
        .where(eq(pgSchema.resumeNodes.resumeId, id));
      await tx
        .insert(pgSchema.resumeNodes)
        .values(nodes.map((node) => toPostgresNodeValue(node)));
    });
  }

  const saved = await getResume(id);
  if (!saved) {
    throw new Error(`Resume ${id} was not found after save.`);
  }

  return saved;
}

function toResumeWithNodes(
  resume: ResumeRow,
  nodeRows: NodeRow[],
): ResumeWithNodes {
  return {
    ...resume,
    fontPreset: resolveResumeFontPreset(resume.fontPreset),
    nodes: nodeRows
      .map((node) => ({
        id: node.id,
        resumeId: node.resumeId,
        type: node.type as ResumeNodeType,
        title: node.title,
        content: parseContent(node.content),
        sortOrder: node.sortOrder,
        enabled: Boolean(node.enabled),
        createdAt: node.createdAt,
        updatedAt: node.updatedAt,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

function parseContent(content: unknown): ResumeNodeContent {
  if (typeof content === "string") {
    return JSON.parse(content) as ResumeNodeContent;
  }

  return (content ?? {}) as ResumeNodeContent;
}

function toSqliteNodeValue(node: ResumeNode) {
  return {
    ...node,
    content: node.content,
  };
}

function toPostgresNodeValue(node: ResumeNode) {
  return {
    ...node,
    content: JSON.stringify(node.content),
    enabled: node.enabled ? 1 : 0,
  };
}
