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

export function hasMeaningfulItem(item: ResumeNodeItem) {
  return Boolean(
    item.title?.trim() ||
      item.subtitle?.trim() ||
      item.description?.trim() ||
      item.startDate?.trim() ||
      item.endDate?.trim() ||
      item.location?.trim(),
  );
}

export function hasMeaningfulItems(items: ResumeNodeItem[] | undefined) {
  return (items ?? []).some(hasMeaningfulItem);
}

export function nodeItems(node: ResumeNode): ResumeNodeItem[] {
  if (!isMultiItemNodeType(node.type)) {
    return [];
  }

  const items = node.content.items ?? [];
  if (hasMeaningfulItems(items)) {
    return items;
  }

  return bodyToLegacyItem(node);
}

export function normalizeMultiItemNode(node: ResumeNode): ResumeNode {
  if (!isMultiItemNodeType(node.type)) {
    return node;
  }

  if (hasMeaningfulItems(node.content.items)) {
    return node;
  }

  const migratedItems = bodyToLegacyItem(node);
  if (migratedItems.length === 0) {
    return node;
  }

  return {
    ...node,
    content: {
      ...node.content,
      items: migratedItems,
      body: undefined,
    },
  };
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
