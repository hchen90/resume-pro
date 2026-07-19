import { describe, expect, it } from "vitest";

import { createDefaultResumeNodes } from "@/lib/resume/defaults";
import type { ResumeWithNodes } from "@/lib/resume/types";

import { summarizePatches, validateResumePatches, assertPatchMatchesMutationClaims } from "./patch-validate";

function sampleResume(): ResumeWithNodes {
  return {
    id: "resume-1",
    title: "Test Resume",
    templateId: "classic",
    fontPreset: "sans",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    nodes: createDefaultResumeNodes("resume-1"),
  };
}

describe("validateResumePatches", () => {
  it("accepts a valid update_node patch", () => {
    const resume = sampleResume();
    const summary = resume.nodes.find((node) => node.type === "summary")!;

    const result = validateResumePatches(resume, [
      {
        op: "update_node",
        nodeId: summary.id,
        content: { body: "Focused summary" },
      },
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.patches).toHaveLength(1);
    }
  });

  it("rejects unknown template ids and missing nodes", () => {
    const resume = sampleResume();

    const result = validateResumePatches(resume, [
      { op: "set_template", templateId: "not-a-template" },
      { op: "update_node", nodeId: "missing", content: { body: "x" } },
      { op: "create_node", nodeType: "profile", title: "Profile" },
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("accepts removeItemIds for existing education items", () => {
    const resume = sampleResume();
    const education = resume.nodes.find((node) => node.type === "education")!;
    education.content.items = [
      { id: "edu-a", title: "A" },
      { id: "edu-b", title: "B" },
    ];

    const result = validateResumePatches(resume, [
      {
        op: "update_node",
        nodeId: education.id,
        removeItemIds: ["edu-a"],
      },
    ]);

    expect(result.ok).toBe(true);
  });

  it("rejects replaceItems without items and unknown removeItemIds", () => {
    const resume = sampleResume();
    const education = resume.nodes.find((node) => node.type === "education")!;
    education.content.items = [{ id: "edu-a", title: "A" }];

    const missingItems = validateResumePatches(resume, [
      {
        op: "update_node",
        nodeId: education.id,
        replaceItems: true,
        content: {},
      },
    ]);
    expect(missingItems.ok).toBe(false);

    const unknownRemove = validateResumePatches(resume, [
      {
        op: "update_node",
        nodeId: education.id,
        removeItemIds: ["missing-id"],
      },
    ]);
    expect(unknownRemove.ok).toBe(false);
  });

  it("accepts replaceItems with a full items list", () => {
    const resume = sampleResume();
    const education = resume.nodes.find((node) => node.type === "education")!;
    education.content.items = [
      { id: "edu-a", title: "A" },
      { id: "edu-b", title: "B" },
    ];

    const result = validateResumePatches(resume, [
      {
        op: "update_node",
        nodeId: education.id,
        replaceItems: true,
        content: {
          items: [{ id: "edu-b", title: "B" }],
        },
      },
    ]);

    expect(result.ok).toBe(true);
  });

  it("summarizes patch impact", () => {
    const resume = sampleResume();
    const summary = resume.nodes.find((node) => node.type === "summary")!;

    const stats = summarizePatches(resume, [
      {
        op: "update_node",
        nodeId: summary.id,
        content: { body: "x" },
      },
      {
        op: "create_node",
        nodeType: "custom",
        title: "Extra",
        content: { body: "y" },
      },
      { op: "set_template", templateId: "modern" },
    ]);

    expect(stats.updateCount).toBe(1);
    expect(stats.createCount).toBe(1);
    expect(stats.templateChange).toBe("modern");
    expect(stats.affectedTitles).toContain(summary.title);
  });
});

describe("assertPatchMatchesMutationClaims", () => {
  it("rejects delete claims without removeItemIds or replaceItems", () => {
    const error = assertPatchMatchesMutationClaims("删除重复的教育经历", [
      {
        op: "update_node",
        nodeId: "edu-1",
        content: {
          items: [{ id: "edu-new", title: "UTS" }],
        },
      },
    ]);
    expect(error).toMatch(/removeItemIds|replaceItems/);
  });

  it("accepts delete claims when removeItemIds is present", () => {
    const error = assertPatchMatchesMutationClaims("删除重复项", [
      {
        op: "update_node",
        nodeId: "edu-1",
        removeItemIds: ["edu-legacy"],
      },
    ]);
    expect(error).toBeNull();
  });

  it("rejects reorder claims without replaceItems", () => {
    const error = assertPatchMatchesMutationClaims("调整顺序为时间倒序", [
      {
        op: "update_node",
        nodeId: "edu-1",
        removeItemIds: ["edu-legacy"],
      },
    ]);
    expect(error).toMatch(/replaceItems/);
  });

  it("accepts English delete and remove claims when replaceItems is set", () => {
    const error = assertPatchMatchesMutationClaims(
      "Delete the duplicate item and reorder chronologically",
      [
        {
          op: "update_node",
          nodeId: "edu-1",
          replaceItems: true,
          content: {
            items: [
              { id: "edu-master", title: "Master" },
              { id: "edu-bachelor", title: "Bachelor" },
            ],
          },
        },
      ],
    );
    expect(error).toBeNull();
  });

  it("accepts delete_node as satisfying a delete claim", () => {
    const error = assertPatchMatchesMutationClaims("移除多余节点", [
      { op: "delete_node", nodeId: "custom-1" },
    ]);
    expect(error).toBeNull();
  });

  it("returns null when the message does not claim delete or reorder", () => {
    const error = assertPatchMatchesMutationClaims("请补充 UTS 的起止时间", [
      {
        op: "update_node",
        nodeId: "edu-1",
        content: {
          items: [
            {
              id: "edu-uts",
              title: "UTS",
              startDate: "2020",
              endDate: "2022",
            },
          ],
        },
      },
    ]);
    expect(error).toBeNull();
  });
});
