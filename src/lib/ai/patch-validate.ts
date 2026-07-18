import { z } from "zod";

import {
  resumePatchSchema,
  type ResumePatch,
} from "@/lib/ai/patch";
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
