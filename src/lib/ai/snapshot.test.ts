import { describe, expect, it } from "vitest";

import { createDefaultResumeNodes } from "@/lib/resume/defaults";
import type { ResumeWithNodes } from "@/lib/resume/types";

import { hashResumeSnapshot } from "./snapshot";

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

describe("hashResumeSnapshot", () => {
  it("is stable for equivalent snapshots", () => {
    const a = sampleResume();
    const b = structuredClone(a);
    expect(hashResumeSnapshot(a)).toBe(hashResumeSnapshot(b));
  });

  it("changes when content changes", () => {
    const a = sampleResume();
    const b = structuredClone(a);
    b.nodes[1].content.body = "changed";
    expect(hashResumeSnapshot(a)).not.toBe(hashResumeSnapshot(b));
  });
});
