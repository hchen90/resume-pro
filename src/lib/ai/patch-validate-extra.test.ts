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

describe("validateResumePatches edge cases", () => {
  it("rejects create_node with a missing afterNodeId", () => {
    const resume = sampleResume();
    const result = validateResumePatches(resume, [
      {
        op: "create_node",
        nodeType: "custom",
        title: "Extra",
        afterNodeId: "does-not-exist",
      },
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0].message).toContain("afterNodeId");
    }
  });

  it("rejects deleting the profile node", () => {
    const resume = sampleResume();
    const profile = resume.nodes.find((node) => node.type === "profile")!;

    const result = validateResumePatches(resume, [
      { op: "delete_node", nodeId: profile.id },
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0].message).toContain("profile");
    }
  });

  it("rejects deleting a missing node", () => {
    const resume = sampleResume();
    const result = validateResumePatches(resume, [
      { op: "delete_node", nodeId: "ghost" },
    ]);

    expect(result.ok).toBe(false);
  });

  it("accepts a valid delete and create with afterNodeId", () => {
    const resume = sampleResume();
    const summary = resume.nodes.find((node) => node.type === "summary")!;

    const result = validateResumePatches(resume, [
      { op: "delete_node", nodeId: summary.id },
      {
        op: "create_node",
        nodeType: "custom",
        title: "New",
        afterNodeId: resume.nodes[0].id,
      },
    ]);

    expect(result.ok).toBe(true);
  });

  it("reports schema issues for malformed patches", () => {
    const resume = sampleResume();
    const result = validateResumePatches(resume, [{ op: "update_node" }]);
    expect(result.ok).toBe(false);
  });
});

describe("summarizePatches with deletions", () => {
  it("counts deletions and affected titles", () => {
    const resume = sampleResume();
    const summary = resume.nodes.find((node) => node.type === "summary")!;

    const stats = summarizePatches(resume, [
      { op: "delete_node", nodeId: summary.id },
    ]);

    expect(stats.deleteCount).toBe(1);
    expect(stats.affectedNodeIds).toContain(summary.id);
    expect(stats.affectedTitles).toContain(summary.title);
  });
});
