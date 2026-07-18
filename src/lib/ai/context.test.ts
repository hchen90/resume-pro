import { describe, expect, it } from "vitest";

import { createDefaultResumeNodes } from "@/lib/resume/defaults";
import type { ResumeWithNodes } from "@/lib/resume/types";

import { summarizeResume } from "./context";

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

describe("summarizeResume", () => {
  it("includes resume metadata and sorted nodes", () => {
    const resume = sampleResume();
    const summary = JSON.parse(summarizeResume(resume));

    expect(summary.resume.id).toBe("resume-1");
    expect(summary.selectedNode).toBeNull();
    const sortOrders = resume.nodes
      .map((node) => node.sortOrder)
      .slice()
      .sort((a, b) => a - b);
    expect(summary.nodes).toHaveLength(sortOrders.length);
  });

  it("marks the selected node when its id matches", () => {
    const resume = sampleResume();
    const target = resume.nodes[1];
    const summary = JSON.parse(summarizeResume(resume, target.id));

    expect(summary.selectedNode).not.toBeNull();
    expect(summary.selectedNode.id).toBe(target.id);
  });
});
