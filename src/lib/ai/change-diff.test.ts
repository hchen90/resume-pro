import { describe, expect, it } from "vitest";

import {
  buildAiChangeDiff,
  dryRunResumePatches,
  formatAiChangeDocument,
} from "@/lib/ai/change-diff";
import type { ResumeWithNodes } from "@/lib/resume/types";

const resume: ResumeWithNodes = {
  id: "r1",
  title: "Resume",
  templateId: "classic",
  fontPreset: "sans",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  nodes: [
    {
      id: "n1",
      resumeId: "r1",
      type: "summary",
      title: "Summary",
      content: { body: "Before body" },
      sortOrder: 0,
      enabled: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "n2",
      resumeId: "r1",
      type: "skills",
      title: "Skills",
      content: { skills: ["TS"] },
      sortOrder: 1,
      enabled: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
};

describe("dryRunResumePatches", () => {
  it("produces after state without mutating the original resume", () => {
    const { before, after } = dryRunResumePatches(resume, [
      {
        op: "update_node",
        nodeId: "n1",
        content: { body: "After body" },
      },
    ]);

    expect(before.nodes[0]?.content.body).toBe("Before body");
    expect(after.nodes[0]?.content.body).toBe("After body");
    expect(resume.nodes[0]?.content.body).toBe("Before body");
  });
});

describe("buildAiChangeDiff", () => {
  it("compares affected nodes before and after", () => {
    const { before, after } = dryRunResumePatches(resume, [
      {
        op: "update_node",
        nodeId: "n1",
        content: { body: "After body" },
      },
      { op: "set_template", templateId: "modern" },
    ]);

    const diffs = buildAiChangeDiff(before, after, {
      affectedNodeIds: ["n1"],
    });

    expect(diffs.some((d) => d.kind === "template")).toBe(true);
    expect(
      diffs.some(
        (d) =>
          d.nodeId === "n1" &&
          d.field === "body" &&
          d.before === "Before body" &&
          d.after === "After body",
      ),
    ).toBe(true);
    expect(diffs.every((d) => d.nodeId !== "n2")).toBe(true);
  });

  it("marks created and deleted nodes", () => {
    const { before, after } = dryRunResumePatches(resume, [
      {
        op: "create_node",
        nodeType: "summary",
        title: "Extra",
        content: { body: "New" },
      },
      { op: "delete_node", nodeId: "n2" },
    ]);

    const diffs = buildAiChangeDiff(before, after);
    expect(diffs.some((d) => d.kind === "create")).toBe(true);
    expect(diffs.some((d) => d.kind === "delete" && d.nodeId === "n2")).toBe(
      true,
    );
  });

  it("records title and enabled updates", () => {
    const before = {
      title: resume.title,
      templateId: resume.templateId,
      fontPreset: resume.fontPreset,
      nodes: resume.nodes.map(
        ({ id, type, title, content, sortOrder, enabled }) => ({
          id,
          type,
          title,
          content,
          sortOrder,
          enabled,
        }),
      ),
    };
    const after = {
      ...before,
      nodes: [
        {
          ...before.nodes[0],
          title: "Intro",
          enabled: false,
          content: { body: "Before body" },
        },
        before.nodes[1],
      ],
    };

    const diffs = buildAiChangeDiff(before, after, {
      affectedNodeIds: ["n1"],
    });
    expect(
      diffs.some(
        (d) => d.field === "title" && d.before === "Summary" && d.after === "Intro",
      ),
    ).toBe(true);
    expect(
      diffs.some(
        (d) => d.field === "enabled" && d.before === "true" && d.after === "false",
      ),
    ).toBe(true);
  });
});

describe("formatAiChangeDocument", () => {
  it("renders a markdown update document", () => {
    const markdown = formatAiChangeDocument({
      artifactId: "a1",
      resumeId: "r1",
      message: "Update summary",
      status: "applied",
      commitHash: "abcdef1",
      createdAt: "2026-01-01T00:00:00.000Z",
      diffs: [
        {
          nodeId: "n1",
          nodeTitle: "Summary",
          field: "body",
          before: "Before",
          after: "After",
          kind: "update",
        },
      ],
    });

    expect(markdown).toContain("# AI change a1");
    expect(markdown).toContain("abcdef1");
    expect(markdown).toContain("Before");
    expect(markdown).toContain("After");
  });

  it("renders empty-diff placeholder and default message", () => {
    const markdown = formatAiChangeDocument({
      artifactId: "a2",
      resumeId: "r1",
      message: "",
      status: "applied",
      createdAt: "2026-01-01T00:00:00.000Z",
      diffs: [],
    });
    expect(markdown).toContain("(no message)");
    expect(markdown).toContain("(no field-level changes recorded)");
    expect(markdown).not.toContain("Commit:");
  });
});

describe("dryRunResumePatches with save input", () => {
  it("accepts ResumeSaveInput snapshots without resume metadata", () => {
    const saveInput = {
      title: "Resume",
      templateId: "classic",
      fontPreset: "sans",
      nodes: [
        {
          id: "n1",
          type: "summary" as const,
          title: "Summary",
          content: { body: "A" },
          sortOrder: 0,
          enabled: true,
        },
      ],
    };
    const { after } = dryRunResumePatches(saveInput, [
      { op: "update_node", nodeId: "n1", content: { body: "B" } },
    ]);
    expect(after.nodes[0]?.content.body).toBe("B");
  });
});
