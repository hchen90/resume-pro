import { describe, expect, it } from "vitest";

import { createNode } from "@/lib/resume/defaults";

import {
  hasMeaningfulItems,
  itemDateRange,
  nodeItems,
  normalizeMultiItemNode,
  toMonthInputValue,
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

describe("itemDateRange", () => {
  it("renders year-only education dates for preview", () => {
    expect(
      itemDateRange({
        id: "edu-uts",
        title: "UTS",
        startDate: "2020",
        endDate: "2022",
      }),
    ).toBe("2020 - 2022");
  });

  it("renders month-precision dates", () => {
    expect(
      itemDateRange({
        id: "exp-1",
        title: "Acme",
        startDate: "2024-01",
        endDate: "2024-06",
      }),
    ).toBe("2024-01 - 2024-06");
  });
});

describe("toMonthInputValue", () => {
  it("passes through YYYY-MM values", () => {
    expect(toMonthInputValue("2024-06")).toBe("2024-06");
  });

  it("coerces year-only values to January for month inputs", () => {
    expect(toMonthInputValue("2020")).toBe("2020-01");
    expect(toMonthInputValue("2022")).toBe("2022-01");
  });

  it("clears empty or incompatible values for month inputs", () => {
    expect(toMonthInputValue("")).toBe("");
    expect(toMonthInputValue("  ")).toBe("");
    expect(toMonthInputValue("2020/01")).toBe("");
    expect(toMonthInputValue(undefined)).toBe("");
  });
});
