import type { ResumePatch } from "@/lib/ai/patch";
import type {
  PatchProposalSummary,
  PendingPatchProposal,
} from "@/lib/ai/protocol";
import type { ResumeSaveInput } from "@/lib/resume/types";

export const aiChangeArtifactStatuses = [
  "pending",
  "applied",
  "rejected",
  "undone",
] as const;

export type AiChangeArtifactStatus = (typeof aiChangeArtifactStatuses)[number];

export type AiChangeArtifact = {
  id: string;
  resumeId: string;
  proposalId: string;
  status: AiChangeArtifactStatus;
  mode: "edit" | "plan";
  message: string;
  patches: ResumePatch[];
  summary: PatchProposalSummary;
  snapshotHash: string;
  baseUpdatedAt: string;
  beforeSnapshot: ResumeSaveInput | null;
  afterSnapshot: ResumeSaveInput | null;
  commitHash: string | null;
  createdAt: string;
  updatedAt: string;
  appliedAt: string | null;
  rejectedAt: string | null;
  undoneAt: string | null;
};

function isResumeSaveInput(value: unknown): value is ResumeSaveInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const candidate = value as Partial<ResumeSaveInput>;
  return (
    typeof candidate.title === "string" &&
    typeof candidate.templateId === "string" &&
    typeof candidate.fontPreset === "string" &&
    Array.isArray(candidate.nodes)
  );
}

function isPatchProposalSummary(value: unknown): value is PatchProposalSummary {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const candidate = value as Partial<PatchProposalSummary>;
  return (
    typeof candidate.createCount === "number" &&
    typeof candidate.updateCount === "number" &&
    typeof candidate.deleteCount === "number" &&
    (candidate.templateChange === null ||
      typeof candidate.templateChange === "string") &&
    Array.isArray(candidate.affectedNodeIds) &&
    Array.isArray(candidate.affectedTitles)
  );
}

export function normalizeAiChangeArtifact(
  value: unknown,
): AiChangeArtifact | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Partial<AiChangeArtifact>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.resumeId !== "string" ||
    typeof candidate.proposalId !== "string" ||
    typeof candidate.message !== "string" ||
    typeof candidate.snapshotHash !== "string" ||
    typeof candidate.baseUpdatedAt !== "string" ||
    typeof candidate.createdAt !== "string" ||
    typeof candidate.updatedAt !== "string" ||
    (candidate.mode !== "edit" && candidate.mode !== "plan") ||
    !aiChangeArtifactStatuses.includes(
      candidate.status as AiChangeArtifactStatus,
    ) ||
    !Array.isArray(candidate.patches) ||
    !isPatchProposalSummary(candidate.summary)
  ) {
    return null;
  }

  const beforeSnapshot =
    candidate.beforeSnapshot == null
      ? null
      : isResumeSaveInput(candidate.beforeSnapshot)
        ? candidate.beforeSnapshot
        : null;
  const afterSnapshot =
    candidate.afterSnapshot == null
      ? null
      : isResumeSaveInput(candidate.afterSnapshot)
        ? candidate.afterSnapshot
        : null;

  if (
    candidate.beforeSnapshot != null &&
    beforeSnapshot == null
  ) {
    return null;
  }
  if (candidate.afterSnapshot != null && afterSnapshot == null) {
    return null;
  }

  return {
    id: candidate.id,
    resumeId: candidate.resumeId,
    proposalId: candidate.proposalId,
    status: candidate.status as AiChangeArtifactStatus,
    mode: candidate.mode,
    message: candidate.message,
    patches: candidate.patches as ResumePatch[],
    summary: candidate.summary,
    snapshotHash: candidate.snapshotHash,
    baseUpdatedAt: candidate.baseUpdatedAt,
    beforeSnapshot,
    afterSnapshot,
    commitHash:
      typeof candidate.commitHash === "string" ? candidate.commitHash : null,
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
    appliedAt:
      typeof candidate.appliedAt === "string" ? candidate.appliedAt : null,
    rejectedAt:
      typeof candidate.rejectedAt === "string" ? candidate.rejectedAt : null,
    undoneAt:
      typeof candidate.undoneAt === "string" ? candidate.undoneAt : null,
  };
}

export function createPendingArtifactFromProposal(input: {
  proposal: PendingPatchProposal;
  beforeSnapshot: ResumeSaveInput | null;
  afterSnapshot?: ResumeSaveInput | null;
  now?: string;
}): AiChangeArtifact {
  const now = input.now ?? new Date().toISOString();
  return {
    id: input.proposal.proposalId,
    resumeId: input.proposal.resumeId,
    proposalId: input.proposal.proposalId,
    status: "pending",
    mode: input.proposal.mode,
    message: input.proposal.message,
    patches: input.proposal.patches,
    summary: input.proposal.summary,
    snapshotHash: input.proposal.snapshotHash,
    baseUpdatedAt: input.proposal.baseUpdatedAt,
    beforeSnapshot: input.beforeSnapshot,
    afterSnapshot: input.afterSnapshot ?? null,
    commitHash: null,
    createdAt: input.proposal.createdAt || now,
    updatedAt: now,
    appliedAt: null,
    rejectedAt: null,
    undoneAt: null,
  };
}

export function transitionArtifactStatus(
  artifact: AiChangeArtifact,
  status: Exclude<AiChangeArtifactStatus, "pending">,
  options?: {
    commitHash?: string | null;
    afterSnapshot?: ResumeSaveInput | null;
    now?: string;
  },
): AiChangeArtifact {
  const now = options?.now ?? new Date().toISOString();
  const next: AiChangeArtifact = {
    ...artifact,
    status,
    updatedAt: now,
    commitHash:
      options?.commitHash !== undefined
        ? options.commitHash
        : artifact.commitHash,
    afterSnapshot:
      options?.afterSnapshot !== undefined
        ? options.afterSnapshot
        : artifact.afterSnapshot,
  };

  if (status === "applied") {
    next.appliedAt = now;
  } else if (status === "rejected") {
    next.rejectedAt = now;
  } else if (status === "undone") {
    next.undoneAt = now;
  }

  return next;
}

export function abbreviateCommitHash(hash: string, length = 7): string {
  const trimmed = hash.trim();
  if (trimmed.length <= length) {
    return trimmed;
  }
  return trimmed.slice(0, length);
}
