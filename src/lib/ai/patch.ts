import { z } from "zod";

import { createNode } from "@/lib/resume/defaults";
import type {
  ResumeNode,
  ResumeNodeContent,
  ResumeSaveInput,
  ResumeWithNodes,
} from "@/lib/resume/types";
import { resumeNodeTypes } from "@/lib/resume/types";
import { resumeNodeContentSchema } from "@/lib/resume/validation";

export const resumePatchSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("update_node"),
    nodeId: z.string(),
    title: z.string().optional(),
    content: resumeNodeContentSchema.optional(),
    enabled: z.boolean().optional(),
  }),
  z.object({
    op: z.literal("create_node"),
    nodeType: z.enum(resumeNodeTypes),
    title: z.string(),
    content: resumeNodeContentSchema.default({}),
    afterNodeId: z.string().optional(),
  }),
  z.object({
    op: z.literal("delete_node"),
    nodeId: z.string(),
  }),
  z.object({
    op: z.literal("set_template"),
    templateId: z.string(),
  }),
]);

export const aiEditResponseSchema = z.object({
  message: z.string(),
  patches: z.array(resumePatchSchema).default([]),
});

export type ResumePatch = z.infer<typeof resumePatchSchema>;

export function applyResumePatches(
  resume: ResumeWithNodes,
  patches: ResumePatch[],
): ResumeSaveInput {
  let templateId = resume.templateId;
  let nodes = resume.nodes.map((node) => ({ ...node, content: { ...node.content } }));

  for (const patch of patches) {
    if (patch.op === "set_template") {
      templateId = patch.templateId;
      continue;
    }

    if (patch.op === "update_node") {
      nodes = nodes.map((node) =>
        node.id === patch.nodeId
          ? mergeNodePatch(node, {
              title: patch.title,
              content: patch.content,
              enabled: patch.enabled,
            })
          : node,
      );
      continue;
    }

    if (patch.op === "delete_node") {
      nodes = nodes.filter(
        (node) => node.id !== patch.nodeId || node.type === "profile",
      );
      continue;
    }

    const newNode = createNode(
      resume.id,
      patch.nodeType,
      patch.title,
      nodes.length,
    );
    newNode.content = patch.content;

    const afterIndex = patch.afterNodeId
      ? nodes.findIndex((node) => node.id === patch.afterNodeId)
      : -1;

    if (afterIndex >= 0) {
      nodes = [
        ...nodes.slice(0, afterIndex + 1),
        newNode,
        ...nodes.slice(afterIndex + 1),
      ];
    } else {
      nodes = [...nodes, newNode];
    }
  }

  return {
    title: resume.title,
    templateId,
    nodes: nodes.map((node, index) => ({
      id: node.id,
      type: node.type,
      title: node.title,
      content: node.content,
      sortOrder: index,
      enabled: node.enabled,
    })),
  };
}

export function extractJsonResponse(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced?.[1]) {
    return fenced[1];
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }

  return text;
}

function mergeNodePatch(
  node: ResumeNode,
  patch: {
    title?: string;
    content?: ResumeNodeContent;
    enabled?: boolean;
  },
): ResumeNode {
  return {
    ...node,
    title: patch.title ?? node.title,
    content: {
      ...node.content,
      ...withoutEmptyPatchValues(patch.content),
    },
    enabled: patch.enabled ?? node.enabled,
  };
}

function withoutEmptyPatchValues(content?: ResumeNodeContent) {
  if (!content) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(content).filter(([, value]) => {
      if (typeof value === "string") {
        return value.trim().length > 0;
      }

      if (Array.isArray(value)) {
        return value.length > 0;
      }

      return value !== undefined;
    }),
  ) as ResumeNodeContent;
}
