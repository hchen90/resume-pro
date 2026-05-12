import { isMultiItemNodeType } from "./defaults";
import type { ResumeNode, ResumeNodeItem, ResumeWithNodes } from "./types";

export function enabledNodes(resume: ResumeWithNodes) {
  return resume.nodes
    .filter((node) => node.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function profileNode(resume: ResumeWithNodes) {
  return enabledNodes(resume).find((node) => node.type === "profile");
}

export function nonProfileNodes(resume: ResumeWithNodes) {
  return enabledNodes(resume).filter((node) => node.type !== "profile");
}

export function splitLines(value?: string) {
  return (value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function nodeItems(node: ResumeNode): ResumeNodeItem[] {
  if (!isMultiItemNodeType(node.type)) {
    return [];
  }

  return node.content.items?.length ? node.content.items : bodyToLegacyItem(node);
}

export function itemDateRange(item: ResumeNodeItem) {
  return [item.startDate, item.endDate].filter(Boolean).join(" - ");
}

function bodyToLegacyItem(node: ResumeNode): ResumeNodeItem[] {
  if (!node.content.body?.trim()) {
    return [];
  }

  const [firstLine, ...descriptionLines] = splitLines(node.content.body);

  return [
    {
      id: `${node.id}-legacy`,
      title: firstLine || node.title,
      description: descriptionLines.join("\n"),
    },
  ];
}

export function contactLine(node?: ResumeNode) {
  if (!node) {
    return "";
  }

  return [
    node.content.email,
    node.content.phone,
    node.content.location,
    node.content.website,
  ]
    .filter(Boolean)
    .join(" | ");
}
