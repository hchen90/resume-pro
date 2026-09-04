import { applyResumePatches, type ResumePatch } from "@/lib/ai/patch";
import { resumeToSaveInput } from "@/lib/ai/chat-session";
import type { ResumeSaveInput, ResumeWithNodes } from "@/lib/resume/types";

export type AiChangeDiffKind = "create" | "update" | "delete" | "template";

export type AiChangeFieldDiff = {
  nodeId: string | null;
  nodeTitle: string;
  field: string;
  before: string | null;
  after: string | null;
  kind: AiChangeDiffKind;
};

type SnapshotLike = ResumeSaveInput | ResumeWithNodes;

function asSaveInput(snapshot: SnapshotLike): ResumeSaveInput {
  return resumeToSaveInput(snapshot);
}

function formatValue(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function nodeMap(snapshot: ResumeSaveInput) {
  return new Map(snapshot.nodes.map((node) => [node.id, node]));
}

function collectKeys(before: unknown, after: unknown): string[] {
  const keys = new Set<string>();
  if (before && typeof before === "object" && !Array.isArray(before)) {
    for (const key of Object.keys(before as Record<string, unknown>)) {
      keys.add(key);
    }
  }
  if (after && typeof after === "object" && !Array.isArray(after)) {
    for (const key of Object.keys(after as Record<string, unknown>)) {
      keys.add(key);
    }
  }
  return [...keys].sort();
}

function pushContentDiffs(
  diffs: AiChangeFieldDiff[],
  input: {
    nodeId: string;
    nodeTitle: string;
    kind: AiChangeDiffKind;
    beforeContent: unknown;
    afterContent: unknown;
  },
) {
  const keys = collectKeys(input.beforeContent, input.afterContent);
  if (keys.length === 0) {
    const before = formatValue(input.beforeContent);
    const after = formatValue(input.afterContent);
    if (before !== after) {
      diffs.push({
        nodeId: input.nodeId,
        nodeTitle: input.nodeTitle,
        field: "content",
        before,
        after,
        kind: input.kind,
      });
    }
    return;
  }

  const beforeRecord =
    input.beforeContent &&
    typeof input.beforeContent === "object" &&
    !Array.isArray(input.beforeContent)
      ? (input.beforeContent as Record<string, unknown>)
      : {};
  const afterRecord =
    input.afterContent &&
    typeof input.afterContent === "object" &&
    !Array.isArray(input.afterContent)
      ? (input.afterContent as Record<string, unknown>)
      : {};

  for (const key of keys) {
    const before = formatValue(beforeRecord[key]);
    const after = formatValue(afterRecord[key]);
    if (before === after) {
      continue;
    }
    diffs.push({
      nodeId: input.nodeId,
      nodeTitle: input.nodeTitle,
      field: key,
      before,
      after,
      kind: input.kind,
    });
  }
}

/**
 * Dry-run patches against a resume snapshot to produce before/after save inputs.
 */
export function dryRunResumePatches(
  resume: SnapshotLike,
  patches: ResumePatch[],
): { before: ResumeSaveInput; after: ResumeSaveInput } {
  const before = asSaveInput(resume);
  const after = applyResumePatches(
    {
      id: "id" in resume ? resume.id : "dry-run",
      createdAt: "createdAt" in resume ? resume.createdAt : "",
      updatedAt: "updatedAt" in resume ? resume.updatedAt : "",
      ...before,
      nodes: before.nodes.map((node) => ({
        ...node,
        resumeId: "id" in resume ? resume.id : "dry-run",
        createdAt: "",
        updatedAt: "",
      })),
    },
    patches,
  );
  return { before, after };
}

/**
 * Build a focused before/after field comparison for affected resume content.
 */
export function buildAiChangeDiff(
  beforeSnapshot: SnapshotLike,
  afterSnapshot: SnapshotLike,
  options?: {
    affectedNodeIds?: string[];
  },
): AiChangeFieldDiff[] {
  const before = asSaveInput(beforeSnapshot);
  const after = asSaveInput(afterSnapshot);
  const diffs: AiChangeFieldDiff[] = [];

  if (before.templateId !== after.templateId) {
    diffs.push({
      nodeId: null,
      nodeTitle: "template",
      field: "templateId",
      before: before.templateId,
      after: after.templateId,
      kind: "template",
    });
  }

  const beforeNodes = nodeMap(before);
  const afterNodes = nodeMap(after);
  const focusIds = options?.affectedNodeIds?.length
    ? new Set(options.affectedNodeIds)
    : null;

  const allIds = new Set([...beforeNodes.keys(), ...afterNodes.keys()]);
  for (const nodeId of allIds) {
    if (focusIds && !focusIds.has(nodeId)) {
      continue;
    }

    const beforeNode = beforeNodes.get(nodeId);
    const afterNode = afterNodes.get(nodeId);

    if (!beforeNode && afterNode) {
      diffs.push({
        nodeId,
        nodeTitle: afterNode.title,
        field: "node",
        before: null,
        after: afterNode.title,
        kind: "create",
      });
      pushContentDiffs(diffs, {
        nodeId,
        nodeTitle: afterNode.title,
        kind: "create",
        beforeContent: null,
        afterContent: afterNode.content,
      });
      continue;
    }

    if (beforeNode && !afterNode) {
      diffs.push({
        nodeId,
        nodeTitle: beforeNode.title,
        field: "node",
        before: beforeNode.title,
        after: null,
        kind: "delete",
      });
      continue;
    }

    if (!beforeNode || !afterNode) {
      continue;
    }

    if (beforeNode.title !== afterNode.title) {
      diffs.push({
        nodeId,
        nodeTitle: afterNode.title,
        field: "title",
        before: beforeNode.title,
        after: afterNode.title,
        kind: "update",
      });
    }

    if (beforeNode.enabled !== afterNode.enabled) {
      diffs.push({
        nodeId,
        nodeTitle: afterNode.title,
        field: "enabled",
        before: formatValue(beforeNode.enabled),
        after: formatValue(afterNode.enabled),
        kind: "update",
      });
    }

    pushContentDiffs(diffs, {
      nodeId,
      nodeTitle: afterNode.title,
      kind: "update",
      beforeContent: beforeNode.content,
      afterContent: afterNode.content,
    });
  }

  return diffs;
}

export function formatAiChangeDocument(input: {
  artifactId: string;
  resumeId: string;
  message: string;
  status: string;
  commitHash?: string | null;
  diffs: AiChangeFieldDiff[];
  createdAt: string;
}): string {
  const lines = [
    `# AI change ${input.artifactId}`,
    "",
    `- Resume: \`${input.resumeId}\``,
    `- Status: ${input.status}`,
    `- Created: ${input.createdAt}`,
  ];
  if (input.commitHash) {
    lines.push(`- Commit: \`${input.commitHash}\``);
  }
  lines.push("", `## Summary`, "", input.message || "(no message)", "", `## Diff`, "");

  if (input.diffs.length === 0) {
    lines.push("(no field-level changes recorded)", "");
  } else {
    for (const diff of input.diffs) {
      const target = diff.nodeTitle || diff.nodeId || "resume";
      lines.push(`### ${target} · ${diff.field} (${diff.kind})`);
      lines.push("");
      lines.push("**Before**");
      lines.push("");
      lines.push("```");
      lines.push(diff.before ?? "(empty)");
      lines.push("```");
      lines.push("");
      lines.push("**After**");
      lines.push("");
      lines.push("```");
      lines.push(diff.after ?? "(empty)");
      lines.push("```");
      lines.push("");
    }
  }

  return `${lines.join("\n").trim()}\n`;
}
