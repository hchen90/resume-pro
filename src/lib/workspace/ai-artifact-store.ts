import "server-only";

import fs from "node:fs";
import path from "node:path";

import {
  normalizeAiChangeArtifact,
  transitionArtifactStatus,
  type AiChangeArtifact,
  type AiChangeArtifactStatus,
} from "@/lib/ai/change-artifact";
import {
  buildAiChangeDiff,
  formatAiChangeDocument,
} from "@/lib/ai/change-diff";
import type { ResumeSaveInput } from "@/lib/resume/types";

import { readJsonFile, writeJsonFile, writeTextFile } from "./fs-utils";
import {
  aiArtifactPath,
  aiArtifactsDir,
  aiChangeDocPath,
  ensureDir,
  getWorkspaceRoot,
} from "./paths";

export async function listAiChangeArtifacts(
  resumeId: string,
  root = getWorkspaceRoot(),
): Promise<AiChangeArtifact[]> {
  const dir = aiArtifactsDir(resumeId, root);
  if (!fs.existsSync(dir)) {
    return [];
  }

  const artifacts: AiChangeArtifact[] = [];
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".json")) {
      continue;
    }
    const artifact = readJsonFile<unknown>(path.join(dir, name));
    const normalized = normalizeAiChangeArtifact(artifact);
    if (normalized && normalized.resumeId === resumeId) {
      artifacts.push(normalized);
    }
  }

  return artifacts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getAiChangeArtifact(
  resumeId: string,
  artifactId: string,
  root = getWorkspaceRoot(),
): Promise<AiChangeArtifact | null> {
  const stored = readJsonFile<unknown>(aiArtifactPath(resumeId, artifactId, root));
  const normalized = normalizeAiChangeArtifact(stored);
  if (!normalized || normalized.resumeId !== resumeId) {
    return null;
  }
  return normalized;
}

export async function getAiChangeArtifactByProposalId(
  resumeId: string,
  proposalId: string,
  root = getWorkspaceRoot(),
): Promise<AiChangeArtifact | null> {
  const byId = await getAiChangeArtifact(resumeId, proposalId, root);
  if (byId && byId.proposalId === proposalId) {
    return byId;
  }

  const all = await listAiChangeArtifacts(resumeId, root);
  return all.find((artifact) => artifact.proposalId === proposalId) ?? null;
}

export async function saveAiChangeArtifact(
  artifact: AiChangeArtifact,
  root = getWorkspaceRoot(),
): Promise<AiChangeArtifact> {
  ensureDir(aiArtifactsDir(artifact.resumeId, root));
  writeJsonFile(aiArtifactPath(artifact.resumeId, artifact.id, root), artifact);
  return artifact;
}

export async function supersedePendingArtifacts(
  resumeId: string,
  exceptProposalId: string | null,
  root = getWorkspaceRoot(),
): Promise<AiChangeArtifact[]> {
  const pending = (await listAiChangeArtifacts(resumeId, root)).filter(
    (artifact) =>
      artifact.status === "pending" &&
      artifact.proposalId !== exceptProposalId,
  );
  const updated: AiChangeArtifact[] = [];
  for (const artifact of pending) {
    const next = transitionArtifactStatus(artifact, "rejected");
    await saveAiChangeArtifact(next, root);
    updated.push(next);
  }
  return updated;
}

export async function writeAiChangeUpdateDocument(
  artifact: AiChangeArtifact,
  root = getWorkspaceRoot(),
): Promise<string> {
  const diffs =
    artifact.beforeSnapshot && artifact.afterSnapshot
      ? buildAiChangeDiff(artifact.beforeSnapshot, artifact.afterSnapshot, {
          affectedNodeIds: artifact.summary.affectedNodeIds,
        })
      : [];
  const content = formatAiChangeDocument({
    artifactId: artifact.id,
    resumeId: artifact.resumeId,
    message: artifact.message,
    status: artifact.status,
    commitHash: artifact.commitHash,
    diffs,
    createdAt: artifact.createdAt,
  });
  const filePath = aiChangeDocPath(artifact.resumeId, artifact.id, root);
  writeTextFile(filePath, content);
  return filePath;
}

export async function markArtifactApplied(input: {
  resumeId: string;
  proposalId: string;
  afterSnapshot: ResumeSaveInput;
  commitHash?: string | null;
  root?: string;
}): Promise<AiChangeArtifact | null> {
  const root = input.root ?? getWorkspaceRoot();
  const existing = await getAiChangeArtifactByProposalId(
    input.resumeId,
    input.proposalId,
    root,
  );
  if (!existing) {
    return null;
  }

  const applied = transitionArtifactStatus(existing, "applied", {
    afterSnapshot: input.afterSnapshot,
    commitHash: input.commitHash ?? existing.commitHash,
  });
  await saveAiChangeArtifact(applied, root);
  try {
    await writeAiChangeUpdateDocument(applied, root);
  } catch {
    // Document write must not block confirm; artifact metadata already saved.
  }
  return applied;
}

export async function markArtifactRejected(input: {
  resumeId: string;
  proposalId: string;
  root?: string;
}): Promise<AiChangeArtifact | null> {
  const root = input.root ?? getWorkspaceRoot();
  const existing = await getAiChangeArtifactByProposalId(
    input.resumeId,
    input.proposalId,
    root,
  );
  if (!existing) {
    return null;
  }
  const rejected = transitionArtifactStatus(existing, "rejected");
  await saveAiChangeArtifact(rejected, root);
  return rejected;
}

export async function markLatestAppliedArtifactUndone(
  resumeId: string,
  root = getWorkspaceRoot(),
): Promise<AiChangeArtifact | null> {
  const applied = (await listAiChangeArtifacts(resumeId, root)).find(
    (artifact) => artifact.status === "applied",
  );
  if (!applied) {
    return null;
  }
  const undone = transitionArtifactStatus(applied, "undone");
  await saveAiChangeArtifact(undone, root);
  return undone;
}

export async function markLatestUndoneArtifactApplied(
  resumeId: string,
  root = getWorkspaceRoot(),
): Promise<AiChangeArtifact | null> {
  const undone = (await listAiChangeArtifacts(resumeId, root)).find(
    (artifact) => artifact.status === "undone",
  );
  if (!undone) {
    return null;
  }
  const applied = transitionArtifactStatus(undone, "applied");
  await saveAiChangeArtifact(applied, root);
  return applied;
}

export async function setArtifactCommitHash(input: {
  resumeId: string;
  artifactId: string;
  commitHash: string | null;
  root?: string;
}): Promise<AiChangeArtifact | null> {
  const root = input.root ?? getWorkspaceRoot();
  const existing = await getAiChangeArtifact(
    input.resumeId,
    input.artifactId,
    root,
  );
  if (!existing) {
    return null;
  }
  const next: AiChangeArtifact = {
    ...existing,
    commitHash: input.commitHash,
    updatedAt: new Date().toISOString(),
  };
  await saveAiChangeArtifact(next, root);
  if (next.status === "applied") {
    try {
      await writeAiChangeUpdateDocument(next, root);
    } catch {
      // Best-effort doc refresh after hash association.
    }
  }
  return next;
}

export type { AiChangeArtifact, AiChangeArtifactStatus };
