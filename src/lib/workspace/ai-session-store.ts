import "server-only";

import path from "node:path";

import {
  createDefaultAiChatSession,
  normalizeAiChatSession,
  type AiChatSession,
} from "@/lib/ai/chat-session";
import type { ResumeSaveInput } from "@/lib/resume/types";

import { readJsonFile, writeJsonFile } from "./fs-utils";
import { getWorkspaceRoot, resumeDir } from "./paths";

export class SessionVersionConflictError extends Error {
  constructor(message = "AI chat session version conflict.") {
    super(message);
    this.name = "SessionVersionConflictError";
  }
}

type StoredAiSession = {
  messages: AiChatSession["messages"];
  mode: AiChatSession["mode"];
  pendingPlan: AiChatSession["pendingPlan"];
  selectedPlanStepIds: string[];
  pendingProposal: AiChatSession["pendingProposal"];
  summary: string | null;
  sessionVersion: number;
  lastRunId: string | null;
  undoSnapshot: ResumeSaveInput | null;
  updatedAt: string;
};

export function aiSessionPath(resumeId: string, root = getWorkspaceRoot()) {
  return path.join(resumeDir(resumeId, root), "ai", "session.json");
}

export async function getAiSessionDocument(
  resumeId: string,
  introContent: string,
  root = getWorkspaceRoot(),
): Promise<AiChatSession | null> {
  const stored = readJsonFile<StoredAiSession>(aiSessionPath(resumeId, root));
  if (!stored) {
    return null;
  }

  return normalizeAiChatSession(
    {
      messages: stored.messages,
      mode: stored.mode,
      pendingPlan: stored.pendingPlan,
      selectedPlanStepIds: stored.selectedPlanStepIds ?? [],
      pendingProposal: stored.pendingProposal,
      summary: stored.summary,
      sessionVersion: stored.sessionVersion ?? 0,
      lastRunId: stored.lastRunId,
      undoSnapshot: stored.undoSnapshot,
    },
    introContent,
  );
}

export async function saveAiSessionDocument(
  resumeId: string,
  session: AiChatSession,
  introContent: string,
  options?: {
    expectedSessionVersion?: number;
  },
  root = getWorkspaceRoot(),
): Promise<AiChatSession> {
  const existing = await getAiSessionDocument(resumeId, introContent, root);
  if (
    existing &&
    options?.expectedSessionVersion !== undefined &&
    existing.sessionVersion !== options.expectedSessionVersion
  ) {
    throw new SessionVersionConflictError();
  }

  const normalized = normalizeAiChatSession(
    session,
    introContent ||
      existing?.messages[0]?.content ||
      createDefaultAiChatSession("").messages[0]?.content ||
      "",
  );
  const nextVersion = normalized.sessionVersion + 1;
  const stored: StoredAiSession = {
    messages: normalized.messages,
    mode: normalized.mode,
    pendingPlan: normalized.pendingPlan,
    selectedPlanStepIds: normalized.selectedPlanStepIds,
    pendingProposal: normalized.pendingProposal,
    summary: normalized.summary,
    sessionVersion: nextVersion,
    lastRunId: normalized.lastRunId,
    undoSnapshot: normalized.undoSnapshot,
    updatedAt: new Date().toISOString(),
  };

  writeJsonFile(aiSessionPath(resumeId, root), stored);

  return {
    ...normalized,
    sessionVersion: nextVersion,
  };
}

export async function writeAiSessionDocumentRaw(
  resumeId: string,
  stored: StoredAiSession,
  root = getWorkspaceRoot(),
) {
  writeJsonFile(aiSessionPath(resumeId, root), stored);
}
