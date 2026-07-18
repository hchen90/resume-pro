import { describe, expect, it } from "vitest";

import { createDefaultResumeNodes } from "@/lib/resume/defaults";

import {
  aiConfirmRequestSchema,
  aiRunRequestSchema,
} from "./request-schema";

function snapshot() {
  return {
    id: "resume-1",
    title: "Resume",
    templateId: "classic",
    fontPreset: "sans" as const,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    nodes: createDefaultResumeNodes("resume-1").map((node) => ({
      id: node.id,
      resumeId: "resume-1",
      type: node.type,
      title: node.title,
      content: node.content,
      sortOrder: node.sortOrder,
      enabled: node.enabled,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    })),
  };
}

describe("aiRunRequestSchema", () => {
  it("parses a valid run request and defaults the action", () => {
    const parsed = aiRunRequestSchema.parse({
      resumeId: "resume-1",
      mode: "chat",
      message: "hello",
      resumeSnapshot: snapshot(),
    });

    expect(parsed.action).toBe("send");
  });

  it("rejects requests with an empty message", () => {
    const result = aiRunRequestSchema.safeParse({
      resumeId: "resume-1",
      mode: "chat",
      message: "",
      resumeSnapshot: snapshot(),
    });

    expect(result.success).toBe(false);
  });
});

describe("aiConfirmRequestSchema", () => {
  it("parses a confirm decision", () => {
    const parsed = aiConfirmRequestSchema.parse({
      resumeId: "resume-1",
      proposalId: "p1",
      decision: "confirm",
      resumeSnapshot: snapshot(),
    });

    expect(parsed.decision).toBe("confirm");
  });

  it("rejects an invalid decision", () => {
    const result = aiConfirmRequestSchema.safeParse({
      resumeId: "resume-1",
      proposalId: "p1",
      decision: "maybe",
      resumeSnapshot: snapshot(),
    });

    expect(result.success).toBe(false);
  });
});
