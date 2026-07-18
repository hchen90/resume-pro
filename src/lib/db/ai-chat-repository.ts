import "server-only";

import { eq } from "drizzle-orm";

import {
  normalizeAiChatSession,
  type AiChatSession,
  type AiPendingPlan,
} from "@/lib/ai/chat-session";
import type { PendingPatchProposal } from "@/lib/ai/protocol";
import type { AiMessage, AiMode } from "@/lib/ai/types";

import { getDbClient } from "./client";
import { ensureDatabase } from "./migrate";
import * as pgSchema from "./schema/postgres";
import * as sqliteSchema from "./schema/sqlite";

export class SessionVersionConflictError extends Error {
  constructor(message = "AI chat session version conflict.") {
    super(message);
    this.name = "SessionVersionConflictError";
  }
}

type AiChatSessionRow = {
  resumeId: string;
  mode: string;
  messages: unknown;
  summary: string | null;
  pendingPlan: unknown;
  selectedPlanStepIds: unknown;
  pendingProposal: unknown;
  sessionVersion: number | null;
  lastRunId: string | null;
  agentContext: unknown;
  agentState: unknown;
  updatedAt: string;
};

export async function getAiChatSession(
  resumeId: string,
  introContent: string,
): Promise<AiChatSession | null> {
  await ensureDatabase();
  const client = getDbClient();

  const row =
    client.provider === "sqlite"
      ? client.db
          .select()
          .from(sqliteSchema.aiChatSessions)
          .where(eq(sqliteSchema.aiChatSessions.resumeId, resumeId))
          .limit(1)
          .all()[0]
      : (
          await client.db
            .select()
            .from(pgSchema.aiChatSessions)
            .where(eq(pgSchema.aiChatSessions.resumeId, resumeId))
            .limit(1)
        )[0];

  if (!row) {
    return null;
  }

  return rowToSession(row as AiChatSessionRow, introContent);
}

export async function saveAiChatSession(
  resumeId: string,
  session: AiChatSession,
  introContent: string,
  options?: {
    expectedSessionVersion?: number;
  },
): Promise<AiChatSession> {
  await ensureDatabase();
  const client = getDbClient();
  const timestamp = new Date().toISOString();
  const normalized = normalizeAiChatSession(session, introContent);
  const nextVersion = normalized.sessionVersion + 1;
  const value = {
    resumeId,
    mode: normalized.mode,
    messages: normalized.messages,
    summary: normalized.summary,
    pendingPlan: normalized.pendingPlan,
    selectedPlanStepIds: normalized.selectedPlanStepIds,
    pendingProposal: normalized.pendingProposal,
    sessionVersion: nextVersion,
    lastRunId: normalized.lastRunId,
    updatedAt: timestamp,
  };

  if (client.provider === "sqlite") {
    const existing = client.db
      .select()
      .from(sqliteSchema.aiChatSessions)
      .where(eq(sqliteSchema.aiChatSessions.resumeId, resumeId))
      .limit(1)
      .all()[0] as AiChatSessionRow | undefined;

    if (
      existing &&
      options?.expectedSessionVersion !== undefined &&
      (existing.sessionVersion ?? 0) !== options.expectedSessionVersion
    ) {
      throw new SessionVersionConflictError();
    }

    client.db
      .insert(sqliteSchema.aiChatSessions)
      .values({
        ...value,
        agentContext: existing?.agentContext ?? null,
        agentState: existing?.agentState ?? null,
      })
      .onConflictDoUpdate({
        target: sqliteSchema.aiChatSessions.resumeId,
        set: {
          mode: value.mode,
          messages: value.messages,
          summary: value.summary,
          pendingPlan: value.pendingPlan,
          selectedPlanStepIds: value.selectedPlanStepIds,
          pendingProposal: value.pendingProposal,
          sessionVersion: value.sessionVersion,
          lastRunId: value.lastRunId,
          updatedAt: value.updatedAt,
        },
      })
      .run();
  } else {
    const existing = (
      await client.db
        .select()
        .from(pgSchema.aiChatSessions)
        .where(eq(pgSchema.aiChatSessions.resumeId, resumeId))
        .limit(1)
    )[0] as AiChatSessionRow | undefined;

    if (
      existing &&
      options?.expectedSessionVersion !== undefined &&
      (existing.sessionVersion ?? 0) !== options.expectedSessionVersion
    ) {
      throw new SessionVersionConflictError();
    }

    await client.db
      .insert(pgSchema.aiChatSessions)
      .values({
        ...value,
        messages: JSON.stringify(value.messages),
        pendingPlan: value.pendingPlan
          ? JSON.stringify(value.pendingPlan)
          : null,
        selectedPlanStepIds: JSON.stringify(value.selectedPlanStepIds),
        pendingProposal: value.pendingProposal
          ? JSON.stringify(value.pendingProposal)
          : null,
        agentContext: existing?.agentContext
          ? typeof existing.agentContext === "string"
            ? existing.agentContext
            : JSON.stringify(existing.agentContext)
          : null,
        agentState: existing?.agentState
          ? typeof existing.agentState === "string"
            ? existing.agentState
            : JSON.stringify(existing.agentState)
          : null,
      })
      .onConflictDoUpdate({
        target: pgSchema.aiChatSessions.resumeId,
        set: {
          mode: value.mode,
          messages: JSON.stringify(value.messages),
          summary: value.summary,
          pendingPlan: value.pendingPlan
            ? JSON.stringify(value.pendingPlan)
            : null,
          selectedPlanStepIds: JSON.stringify(value.selectedPlanStepIds),
          pendingProposal: value.pendingProposal
            ? JSON.stringify(value.pendingProposal)
            : null,
          sessionVersion: value.sessionVersion,
          lastRunId: value.lastRunId,
          updatedAt: value.updatedAt,
        },
      });
  }

  return {
    ...normalized,
    sessionVersion: nextVersion,
  };
}

function rowToSession(row: AiChatSessionRow, introContent: string): AiChatSession {
  return normalizeAiChatSession(
    {
      messages: parseJsonArray<AiMessage>(row.messages),
      mode: row.mode as AiMode,
      summary: row.summary,
      pendingPlan: parseJsonValue<AiPendingPlan>(row.pendingPlan),
      selectedPlanStepIds: parseJsonArray<string>(row.selectedPlanStepIds),
      pendingProposal: parseJsonValue<PendingPatchProposal>(row.pendingProposal),
      sessionVersion: row.sessionVersion ?? 0,
      lastRunId: row.lastRunId,
    },
    introContent,
  );
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
