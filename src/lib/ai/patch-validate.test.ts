import { describe, expect, it } from "vitest";

import { createDefaultResumeNodes } from "@/lib/resume/defaults";
import type { ResumeWithNodes } from "@/lib/resume/types";

import { summarizePatches, validateResumePatches } from "./patch-validate";

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
