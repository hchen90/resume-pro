import { z } from "zod";

import {
  resumePatchSchema,
  type ResumePatch,
} from "@/lib/ai/patch";
import { nodeItems } from "@/lib/resume/format";
import { resumeNodeContentSchema } from "@/lib/resume/validation";
import type { ResumeWithNodes } from "@/lib/resume/types";
import { resumeTemplates } from "@/templates/resume/registry";

const knownTemplateIds = new Set(resumeTemplates.map((template) => template.id));

const strictNodeContentSchema = resumeNodeContentSchema.strict();

const strictResumePatchSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("update_node"),
    nodeId: z.string().min(1),
    title: z.string().min(1).optional(),
    content: strictNodeContentSchema.optional(),
    enabled: z.boolean().optional(),
    replaceItems: z.boolean().optional(),
    removeItemIds: z.array(z.string().min(1)).optional(),
  }),
  z.object({
    op: z.literal("create_node"),
    nodeType: z.enum([
      "summary",
      "experience",
      "education",
      "project",
      "skills",
      "custom",
    ]),
    title: z.string().min(1),
    content: strictNodeContentSchema.default({}),
    afterNodeId: z.string().min(1).optional(),
  }),
  z.object({
    op: z.literal("delete_node"),
    nodeId: z.string().min(1),
  }),
  z.object({
    op: z.literal("set_template"),
    templateId: z.string().min(1),
  }),
]);

export type PatchValidationIssue = {
  index: number;
  message: string;
};

export type PatchValidationResult =
  | { ok: true; patches: ResumePatch[] }
  | { ok: false; issues: PatchValidationIssue[] };

export function validateResumePatches(
  resume: ResumeWithNodes,
  rawPatches: unknown[],
): PatchValidationResult {
  const issues: PatchValidationIssue[] = [];
  const patches: ResumePatch[] = [];
  const nodeIds = new Set(resume.nodes.map((node) => node.id));

  rawPatches.forEach((raw, index) => {
    const strict = strictResumePatchSchema.safeParse(raw);
    if (!strict.success) {
      const compatible = resumePatchSchema.safeParse(raw);
      if (!compatible.success) {
        issues.push({
          index,
          message: strict.error.issues
            .map((issue) => `${issue.path.join(".") || "patch"}: ${issue.message}`)
            .join("; "),
        });
        return;
      }

      // Reject unknown fields even if the loose schema accepts the patch.
      issues.push({
        index,
        message: "Patch contains unsupported fields or invalid shape.",
      });
      return;
    }

    const patch = strict.data as ResumePatch;

    if (patch.op === "update_node") {
      if (!nodeIds.has(patch.nodeId)) {
        issues.push({
          index,
          message: `update_node target nodeId "${patch.nodeId}" does not exist.`,
        });
        return;
      }

      const targetNode = resume.nodes.find((node) => node.id === patch.nodeId);
      if (
        patch.replaceItems &&
        (!patch.content?.items || patch.content.items.length === 0)
      ) {
        issues.push({
          index,
          message:
            "update_node with replaceItems=true requires a non-empty content.items array.",
        });
        return;
      }

      if (patch.removeItemIds?.length && targetNode) {
        const knownItemIds = new Set(
          nodeItems(targetNode).map((item) => item.id),
        );
        const unknown = patch.removeItemIds.filter((id) => !knownItemIds.has(id));
        if (unknown.length > 0) {
          issues.push({
            index,
            message: `removeItemIds not found on node: ${unknown.join(", ")}.`,
          });
          return;
        }
      }
    }

    if (patch.op === "delete_node") {
      const node = resume.nodes.find((item) => item.id === patch.nodeId);
      if (!node) {
        issues.push({
          index,
          message: `delete_node target nodeId "${patch.nodeId}" does not exist.`,
        });
        return;
      }
      if (node.type === "profile") {
        issues.push({
          index,
          message: "delete_node cannot remove the profile node.",
        });
        return;
      }
    }

    if (patch.op === "create_node") {
      if (patch.afterNodeId && !nodeIds.has(patch.afterNodeId)) {
        issues.push({
          index,
          message: `create_node afterNodeId "${patch.afterNodeId}" does not exist.`,
        });
        return;
      }
    }

    if (patch.op === "set_template" && !knownTemplateIds.has(patch.templateId)) {
      issues.push({
        index,
        message: `Unknown templateId "${patch.templateId}".`,
      });
      return;
    }

    patches.push(patch);
  });

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, patches };
}

/**
 * Reject proposals whose natural-language message claims delete/reorder
 * but whose patches only upsert items (which cannot delete or reorder).
 */
export function assertPatchMatchesMutationClaims(
  message: string,
  patches: ResumePatch[],
): string | null {
  const claimsDelete =
    /删除|删掉|移除|去重|重复项|delete\b|remove\b|dedup/i.test(message);
  const claimsReorder =
    /调整顺序|重排|排序|倒序|时间倒序|reorder|re-?order|chronolog/i.test(
      message,
    );

  const hasItemDeleteOrReplace = patches.some(
    (patch) =>
      patch.op === "delete_node" ||
      (patch.op === "update_node" &&
        ((patch.removeItemIds?.length ?? 0) > 0 || patch.replaceItems === true)),
  );
  const hasReplaceItems = patches.some(
    (patch) => patch.op === "update_node" && patch.replaceItems === true,
  );

  if (claimsDelete && !hasItemDeleteOrReplace) {
    return "Message describes deleting or deduplicating items, but patches lack removeItemIds or replaceItems:true. Default item merge cannot delete. Resubmit with removeItemIds for the ids to remove, or replaceItems:true with the full final content.items list.";
  }

  if (claimsReorder && !hasReplaceItems) {
    return "Message describes reordering items, but patches lack replaceItems:true. Resubmit with replaceItems:true and content.items in the final order (include every item id to keep).";
  }

  return null;
}

export function summarizePatches(
  resume: ResumeWithNodes,
  patches: ResumePatch[],
) {
  const affectedNodeIds = new Set<string>();
  let createCount = 0;
  let updateCount = 0;
  let deleteCount = 0;
  let templateChange: string | null = null;

  for (const patch of patches) {
    if (patch.op === "create_node") {
      createCount += 1;
      continue;
    }

    if (patch.op === "update_node") {
      updateCount += 1;
      affectedNodeIds.add(patch.nodeId);
      continue;
    }

    if (patch.op === "delete_node") {
      deleteCount += 1;
      affectedNodeIds.add(patch.nodeId);
      continue;
    }

    templateChange = patch.templateId;
  }

  const affectedTitles = resume.nodes
    .filter((node) => affectedNodeIds.has(node.id))
    .map((node) => node.title);

  return {
    createCount,
    updateCount,
    deleteCount,
    templateChange,
    affectedNodeIds: [...affectedNodeIds],
    affectedTitles,
  };
}
