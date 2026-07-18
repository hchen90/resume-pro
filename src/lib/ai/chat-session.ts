import { aiPlanSchema, type AiPlan } from "@/lib/ai/patch";
import type { PendingPatchProposal } from "@/lib/ai/protocol";
import { aiModes, type AiMessage, type AiMode } from "@/lib/ai/types";

export type AiPendingPlan = {
  originalMessage: string;
  plan: AiPlan;
};

export type AiChatSession = {
  messages: AiMessage[];
  mode: AiMode;
  pendingPlan: AiPendingPlan | null;
  selectedPlanStepIds: string[];
  pendingProposal: PendingPatchProposal | null;
  summary: string | null;
  sessionVersion: number;
  lastRunId: string | null;
};

export function createDefaultAiChatSession(introContent: string): AiChatSession {
  return {
    messages: [{ role: "assistant", content: introContent }],
    mode: "chat",
    pendingPlan: null,
    selectedPlanStepIds: [],
    pendingProposal: null,
    summary: null,
    sessionVersion: 0,
    lastRunId: null,
  };
}

function isValidMessage(value: unknown): value is AiMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const message = value as AiMessage;

  return (
    (message.role === "user" ||
      message.role === "assistant" ||
      message.role === "system") &&
    typeof message.content === "string" &&
    (message.aiMode === undefined || aiModes.includes(message.aiMode)) &&
    (message.isError === undefined || typeof message.isError === "boolean")
  );
}

function normalizePendingPlan(value: unknown): AiPendingPlan | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<AiPendingPlan>;
  if (typeof candidate.originalMessage !== "string" || !candidate.plan) {
    return null;
  }

  const parsed = aiPlanSchema.safeParse(candidate.plan);
  if (!parsed.success) {
    return null;
  }

  return {
    originalMessage: candidate.originalMessage,
    plan: parsed.data,
  };
}

function normalizePendingProposal(value: unknown): PendingPatchProposal | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<PendingPatchProposal>;
  if (
    typeof candidate.proposalId !== "string" ||
    typeof candidate.resumeId !== "string" ||
    (candidate.mode !== "edit" && candidate.mode !== "plan") ||
    typeof candidate.message !== "string" ||
    !Array.isArray(candidate.patches) ||
    typeof candidate.snapshotHash !== "string" ||
    typeof candidate.baseUpdatedAt !== "string" ||
    typeof candidate.createdAt !== "string" ||
    !candidate.summary ||
    typeof candidate.summary !== "object"
  ) {
    return null;
  }

  return candidate as PendingPatchProposal;
}

export function normalizeAiChatSession(
  raw: Partial<AiChatSession> | null | undefined,
  introContent: string,
): AiChatSession {
  const defaults = createDefaultAiChatSession(introContent);

  if (!raw) {
    return defaults;
  }

  const messages = Array.isArray(raw.messages)
    ? raw.messages.filter(isValidMessage)
    : defaults.messages;

  const mode =
    raw.mode && aiModes.includes(raw.mode) ? raw.mode : defaults.mode;

  const pendingPlan = normalizePendingPlan(raw.pendingPlan);
  const pendingProposal = normalizePendingProposal(raw.pendingProposal);

  const selectedPlanStepIds = Array.isArray(raw.selectedPlanStepIds)
    ? raw.selectedPlanStepIds.filter(
        (stepId): stepId is string => typeof stepId === "string",
      )
    : defaults.selectedPlanStepIds;

  const summary =
    typeof raw.summary === "string" && raw.summary.trim().length > 0
      ? raw.summary.trim()
      : null;

  const sessionVersion =
    typeof raw.sessionVersion === "number" &&
    Number.isFinite(raw.sessionVersion) &&
    raw.sessionVersion >= 0
      ? Math.floor(raw.sessionVersion)
      : defaults.sessionVersion;

  const lastRunId =
    typeof raw.lastRunId === "string" && raw.lastRunId.trim()
      ? raw.lastRunId
      : null;

  return {
    messages: messages.length > 0 ? messages : defaults.messages,
    mode,
    pendingPlan,
    selectedPlanStepIds: pendingPlan
      ? selectedPlanStepIds.filter((stepId) =>
          pendingPlan.plan.steps.some((step) => step.id === stepId),
        )
      : [],
    pendingProposal,
    summary,
    sessionVersion,
    lastRunId,
  };
}

export function isIntroMessage(
  message: AiMessage,
  index: number,
  introContent: string,
) {
  return (
    index === 0 &&
    message.role === "assistant" &&
    message.content === introContent
  );
}

export function isConversationalMessage(
  message: AiMessage,
  index: number,
  introContent: string,
) {
  if (message.role === "system" || message.isError) {
    return false;
  }

  if (isIntroMessage(message, index, introContent)) {
    return false;
  }

  return message.role === "user" || message.role === "assistant";
}

export function countConversationalMessages(
  messages: AiMessage[],
  introContent: string,
) {
  return messages.reduce((count, message, index) => {
    return isConversationalMessage(message, index, introContent) ? count + 1 : count;
  }, 0);
}

export function enforceConversationalCap(
  messages: AiMessage[],
  introContent: string,
  maxMessages: number,
) {
  const conversationalIndices = messages.reduce<number[]>((indices, message, index) => {
    if (isConversationalMessage(message, index, introContent)) {
      indices.push(index);
    }
    return indices;
  }, []);

  if (conversationalIndices.length <= maxMessages) {
    return messages;
  }

  const dropIndices = new Set(
    conversationalIndices.slice(0, conversationalIndices.length - maxMessages),
  );

  return messages.filter((_, index) => !dropIndices.has(index));
}

export function selectMessagesToCompact(
  messages: AiMessage[],
  introContent: string,
  threshold: number,
  keepRecent: number,
) {
  const conversationalIndices = messages.reduce<number[]>((indices, message, index) => {
    if (isConversationalMessage(message, index, introContent)) {
      indices.push(index);
    }
    return indices;
  }, []);

  if (conversationalIndices.length <= threshold) {
    return null;
  }

  const summarizeCount = conversationalIndices.length - keepRecent;
  const summarizeIndices = new Set(
    conversationalIndices.slice(0, summarizeCount),
  );

  const toSummarize = messages.filter((_, index) => summarizeIndices.has(index));
  const remaining = messages.filter((_, index) => !summarizeIndices.has(index));

  return { toSummarize, remaining };
}
