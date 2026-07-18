import { createHash } from "node:crypto";

import type { ResumeWithNodes } from "@/lib/resume/types";

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

export function hashResumeSnapshot(resume: ResumeWithNodes) {
  const payload = {
    id: resume.id,
    title: resume.title,
    templateId: resume.templateId,
    fontPreset: resume.fontPreset,
    nodes: resume.nodes
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((node) => ({
        id: node.id,
        type: node.type,
        title: node.title,
        enabled: node.enabled,
        sortOrder: node.sortOrder,
        content: node.content,
      })),
  };

  return createHash("sha256").update(stableStringify(payload)).digest("hex");
}
