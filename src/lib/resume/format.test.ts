import { describe, expect, it } from "vitest";

import { createNode } from "@/lib/resume/defaults";

import {
  hasMeaningfulItems,
  nodeItems,
  normalizeMultiItemNode,
} from "./format";

describe("nodeItems", () => {
  it("falls back to body when items are empty shells", () => {
    const node = createNode("resume-1", "experience", "工作经历", 1, "zh-CN");
    node.content = {
      body: "**XX科技有限公司 | 高级项目经理**\n- 负责 SaaS 产品交付",
      items: [
        {
          id: "empty-item",
          title: "",
          subtitle: "",
          startDate: "",
          endDate: "",
          location: "",
          description: "",
        },
      ],
    };

    expect(hasMeaningfulItems(node.content.items)).toBe(false);
    expect(nodeItems(node)).toEqual([
      {
        id: `${node.id}-legacy`,
        title: "**XX科技有限公司 | 高级项目经理**",
        description: "- 负责 SaaS 产品交付",
      },
    ]);
  });

  it("prefers meaningful items over body", () => {
    const node = createNode("resume-1", "experience", "工作经历", 1, "zh-CN");
    node.content.body = "legacy body content";

    const items = nodeItems(node);
    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe("公司名称");
  });
});

describe("normalizeMultiItemNode", () => {
  it("migrates body into items and clears body", () => {
    const node = createNode("resume-1", "experience", "工作经历", 1, "zh-CN");
    node.content = {
      body: "Acme Corp\nBuilt internal tools",
      items: [],
    };

    const normalized = normalizeMultiItemNode(node);

    expect(normalized.content.body).toBeUndefined();
    expect(normalized.content.items).toEqual([
      {
        id: `${node.id}-legacy`,
        title: "Acme Corp",
        description: "Built internal tools",
      },
    ]);
  });
});
