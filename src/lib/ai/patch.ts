import { z } from "zod";

import { createNode, isMultiItemNodeType } from "@/lib/resume/defaults";
import {
  hasMeaningfulItems,
  nodeItems,
  normalizeMultiItemNode,
} from "@/lib/resume/format";
import type {
  ResumeNode,
  ResumeNodeContent,
  ResumeNodeItem,
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
    /** When true, content.items becomes the full final item list (delete-by-omission + reorder). */
    replaceItems: z.boolean().optional(),
    /** Explicit item ids to remove from a multi-item node. */
    removeItemIds: z.array(z.string().min(1)).optional(),
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

export const aiPlanStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  targetNodeIds: z.array(z.string()).default([]),
});

export const aiPlanSchema = z.object({
  summary: z.string(),
  steps: z.array(aiPlanStepSchema).default([]),
});

export const aiPlanResponseSchema = z.object({
  message: z.string(),
  plan: aiPlanSchema,
});

export type ResumePatch = z.infer<typeof resumePatchSchema>;
export type AiPlan = z.infer<typeof aiPlanSchema>;

const NODE_TYPE_ALIASES: Record<string, (typeof resumeNodeTypes)[number]> = {
  profile: "profile",
  summary: "summary",
  introduction: "summary",
  intro: "summary",
  about: "summary",
  bio: "summary",
  简介: "summary",
  个人简介: "summary",
  experience: "experience",
  work: "experience",
  employment: "experience",
  工作经历: "experience",
  经历: "experience",
  education: "education",
  school: "education",
  教育经历: "education",
  project: "project",
  projects: "project",
  项目经历: "project",
  skills: "skills",
  skill: "skills",
  技能: "skills",
  custom: "custom",
  other: "custom",
};

function normalizeNodeType(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const key = value.trim().toLowerCase();
  return NODE_TYPE_ALIASES[key] ?? NODE_TYPE_ALIASES[value.trim()];
}

function ensureItemIds(content: ResumeNodeContent | undefined) {
  if (!content?.items?.length) {
    return content;
  }

  return {
    ...content,
    items: content.items.map((item) => ({
      ...item,
      id:
        typeof item.id === "string" && item.id.trim()
          ? item.id
          : crypto.randomUUID(),
      title: typeof item.title === "string" ? item.title : "",
    })),
  };
}

function normalizeRawPatch(
  raw: unknown,
  resume?: ResumeWithNodes,
): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const obj = { ...(raw as Record<string, unknown>) };

  if (typeof obj.path === "string" && "value" in obj) {
    const nodeIdFromPath = obj.path.match(/\/nodes\/([^/]+)/)?.[1];
    const nodeId =
      nodeIdFromPath ??
      (typeof obj.nodeId === "string" ? obj.nodeId : undefined);

    if (nodeId) {
      return {
        op: "update_node",
        nodeId,
        content:
          typeof obj.value === "object" && obj.value !== null
            ? obj.value
            : obj.content,
        title: obj.title,
        enabled: obj.enabled,
      };
    }
  }

  if (!obj.op && typeof obj.action === "string") {
    const action = obj.action.trim().toLowerCase();
    if (
      action === "update_node" ||
      action === "update" ||
      action === "patch"
    ) {
      obj.op = "update_node";
    } else if (action === "create_node" || action === "create") {
      obj.op = "create_node";
    } else if (action === "delete_node" || action === "delete") {
      obj.op = "delete_node";
    } else if (action === "set_template") {
      obj.op = "set_template";
    }
  }

  if (!obj.op && typeof obj.nodeId === "string") {
    obj.op = "update_node";
  }

  if (obj.op === "update_node" && typeof obj.nodeId === "string") {
    delete obj.nodeType;
    if (obj.content && typeof obj.content === "object") {
      obj.content = ensureItemIds(obj.content as ResumeNodeContent);
    }
    return obj;
  }

  if (obj.op === "create_node") {
    const nodeType =
      normalizeNodeType(obj.nodeType) ??
      inferNodeTypeFromTitle(obj.title) ??
      "custom";
    return {
      op: "create_node",
      nodeType,
      title: typeof obj.title === "string" ? obj.title : "新节点",
      content: ensureItemIds(
        (obj.content as ResumeNodeContent | undefined) ?? {},
      ),
      afterNodeId: obj.afterNodeId,
    };
  }

  if (obj.op === "delete_node" && typeof obj.nodeId === "string") {
    return obj;
  }

  if (obj.op === "set_template" && typeof obj.templateId === "string") {
    return obj;
  }

  if (
    resume &&
    typeof obj.nodeId === "string" &&
    resume.nodes.some((node) => node.id === obj.nodeId)
  ) {
    return {
      op: "update_node",
      nodeId: obj.nodeId,
      title: obj.title,
      content: ensureItemIds(obj.content as ResumeNodeContent | undefined),
      enabled: obj.enabled,
    };
  }

  return obj.op ? obj : null;
}

function inferNodeTypeFromTitle(title: unknown) {
  if (typeof title !== "string") {
    return undefined;
  }

  const value = title.toLowerCase();
  if (/profile|联系|基本信息/.test(value)) {
    return "profile" as const;
  }
  if (/summary|简介|关于/.test(value)) {
    return "summary" as const;
  }
  if (/experience|工作|经历/.test(value)) {
    return "experience" as const;
  }
  if (/education|教育|学校/.test(value)) {
    return "education" as const;
  }
  if (/project|项目/.test(value)) {
    return "project" as const;
  }
  if (/skill|技能/.test(value)) {
    return "skills" as const;
  }

  return undefined;
}

export function parseAiEditResponse(
  text: string,
  resume?: ResumeWithNodes,
) {
  const raw = JSON.parse(extractJsonResponse(text)) as {
    message?: unknown;
    patches?: unknown;
  };

  const message = typeof raw.message === "string" ? raw.message : "";
  const rawPatches = Array.isArray(raw.patches) ? raw.patches : [];
  const patches: ResumePatch[] = [];
  const skipped: string[] = [];

  for (const rawPatch of rawPatches) {
    const normalized = normalizeRawPatch(rawPatch, resume);
    if (!normalized) {
      skipped.push("unrecognized patch shape");
      continue;
    }

    const parsed = resumePatchSchema.safeParse(normalized);
    if (parsed.success) {
      patches.push(parsed.data);
      continue;
    }

    skipped.push(
      parsed.error.issues
        .map((issue) => `${issue.path.join(".") || "patch"}: ${issue.message}`)
        .join("; "),
    );
  }

  if (skipped.length > 0) {
    console.warn(
      "[ai:patch:skip]",
      JSON.stringify({ skipped, accepted: patches.length }),
    );
  }

  return { message, patches, skipped };
}

export function applyResumePatches(
  resume: ResumeWithNodes,
  patches: ResumePatch[],
): ResumeSaveInput {
  let templateId = resume.templateId;
  const fontPreset = resume.fontPreset;
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
              replaceItems: patch.replaceItems,
              removeItemIds: patch.removeItemIds,
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

    let newNode = createNode(
      resume.id,
      patch.nodeType,
      patch.title,
      nodes.length,
    );
    const createdContent = { ...newNode.content, ...patch.content };
    if (
      isMultiItemNodeType(patch.nodeType) &&
      patch.content.body?.trim() &&
      !hasMeaningfulItems(patch.content.items)
    ) {
      createdContent.items = [];
    }
    newNode = normalizeMultiItemNode({
      ...newNode,
      content: createdContent,
    });

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
    fontPreset,
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
    replaceItems?: boolean;
    removeItemIds?: string[];
  },
): ResumeNode {
  const patchContent = withoutEmptyPatchValues(patch.content);
  const { items: patchItems, ...otherPatchContent } = patchContent;
  let content: ResumeNodeContent = {
    ...node.content,
    ...otherPatchContent,
  };

  if (isMultiItemNodeType(node.type)) {
    const existingItems = nodeItems(node);
    let nextItems = existingItems;

    if (patch.replaceItems && patchItems) {
      // Reorder/replace list membership by the patch item order, but merge each
      // known id with the existing item so omitted fields are not wiped.
      nextItems = patchItems.map((item) => {
        const patchId =
          typeof item.id === "string" && item.id.trim()
            ? item.id.trim()
            : crypto.randomUUID();
        const existing = existingItems.find((entry) => entry.id === patchId);
        if (existing) {
          return mergeItemPatch(existing, { ...item, id: patchId });
        }
        return {
          id: patchId,
          title: item.title ?? "",
          ...withoutEmptyItemPatchValues(item),
        };
      });
    } else if (patchItems?.length) {
      nextItems = mergeItemsPatch(existingItems, patchItems);
    }

    if (patch.removeItemIds?.length) {
      const removeIds = new Set(patch.removeItemIds);
      nextItems = nextItems.filter((item) => !removeIds.has(item.id));
    }

    if (
      patch.replaceItems ||
      patchItems?.length ||
      patch.removeItemIds?.length
    ) {
      content = {
        ...content,
        items: nextItems,
        body: undefined,
      };
    }
  }

  return normalizeMultiItemNode({
    ...node,
    title: patch.title ?? node.title,
    content,
    enabled: patch.enabled ?? node.enabled,
  });
}

function mergeItemsPatch(
  existingItems: ResumeNodeItem[],
  patchItems: ResumeNodeItem[],
): ResumeNodeItem[] {
  const merged = existingItems.map((item) => ({ ...item }));

  for (const patchItem of patchItems) {
    const patchId =
      typeof patchItem.id === "string" && patchItem.id.trim()
        ? patchItem.id.trim()
        : crypto.randomUUID();
    const index = merged.findIndex((item) => item.id === patchId);

    if (index >= 0) {
      merged[index] = mergeItemPatch(merged[index], patchItem);
      continue;
    }

    merged.push({
      id: patchId,
      title: patchItem.title ?? "",
      ...withoutEmptyItemPatchValues(patchItem),
    });
  }

  return merged;
}

function mergeItemPatch(
  existing: ResumeNodeItem,
  patch: ResumeNodeItem,
): ResumeNodeItem {
  return {
    ...existing,
    ...withoutEmptyItemPatchValues(patch),
    id: existing.id,
    title: patch.title?.trim() ? patch.title : existing.title,
  };
}

function withoutEmptyItemPatchValues(patch: Partial<ResumeNodeItem>) {
  return Object.fromEntries(
    Object.entries(patch).filter(([key, value]) => {
      if (key === "id" || key === "title") {
        return false;
      }

      if (typeof value === "string") {
        return value.trim().length > 0;
      }

      return value !== undefined;
    }),
  ) as Partial<ResumeNodeItem>;
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
