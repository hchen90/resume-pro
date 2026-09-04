import { describe, expect, it } from "vitest";

import {
  abbreviateCommitHash,
  createPendingArtifactFromProposal,
  normalizeAiChangeArtifact,
  transitionArtifactStatus,
} from "@/lib/ai/change-artifact";
import type { PendingPatchProposal } from "@/lib/ai/protocol";
import type { ResumeSaveInput } from "@/lib/resume/types";

const summary = {
  createCount: 0,
  updateCount: 1,
  deleteCount: 0,
  templateChange: null,
  affectedNodeIds: ["n1"],
  affectedTitles: ["Summary"],
};

const proposal: PendingPatchProposal = {
  proposalId: "prop-1",
  resumeId: "resume-1",
  mode: "edit",
  message: "Tighten summary",
  patches: [
    {
      op: "update_node",
      nodeId: "n1",
      content: { body: "After" },
    },
  ],
  summary,
  snapshotHash: "hash",
  baseUpdatedAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:01:00.000Z",
};

const before: ResumeSaveInput = {
  title: "Resume",
  templateId: "classic",
  fontPreset: "sans",
  nodes: [
    {
      id: "n1",
      type: "summary",
      title: "Summary",
      content: { body: "Before" },
      sortOrder: 0,
      enabled: true,
    },
  ],
};

describe("createPendingArtifactFromProposal", () => {
  it("creates a pending artifact linked to the proposal", () => {
    const artifact = createPendingArtifactFromProposal({
      proposal,
      beforeSnapshot: before,
      afterSnapshot: {
        ...before,
        nodes: [
          {
            ...before.nodes[0],
            content: { body: "After" },
          },
        ],
      },
      now: "2026-01-01T00:02:00.000Z",
    });

    expect(artifact.id).toBe("prop-1");
    expect(artifact.proposalId).toBe("prop-1");
    expect(artifact.status).toBe("pending");
    expect(artifact.beforeSnapshot?.nodes[0]?.content.body).toBe("Before");
    expect(artifact.afterSnapshot?.nodes[0]?.content.body).toBe("After");
    expect(artifact.commitHash).toBeNull();
  });
});

describe("transitionArtifactStatus", () => {
  it("moves pending → applied with commit hash", () => {
    const pending = createPendingArtifactFromProposal({
      proposal,
      beforeSnapshot: before,
      now: "2026-01-01T00:02:00.000Z",
    });
    const applied = transitionArtifactStatus(pending, "applied", {
      commitHash: "abcdef1234567890",
      afterSnapshot: {
        ...before,
        nodes: [{ ...before.nodes[0], content: { body: "After" } }],
      },
      now: "2026-01-01T00:03:00.000Z",
    });

    expect(applied.status).toBe("applied");
    expect(applied.appliedAt).toBe("2026-01-01T00:03:00.000Z");
    expect(applied.commitHash).toBe("abcdef1234567890");
    expect(applied.afterSnapshot?.nodes[0]?.content.body).toBe("After");
  });

  it("moves pending → rejected and applied → undone", () => {
    const pending = createPendingArtifactFromProposal({
      proposal,
      beforeSnapshot: before,
    });
    const rejected = transitionArtifactStatus(pending, "rejected", {
      now: "2026-01-01T00:04:00.000Z",
    });
    expect(rejected.status).toBe("rejected");
    expect(rejected.rejectedAt).toBe("2026-01-01T00:04:00.000Z");

    const applied = transitionArtifactStatus(pending, "applied");
    const undone = transitionArtifactStatus(applied, "undone", {
      now: "2026-01-01T00:05:00.000Z",
    });
    expect(undone.status).toBe("undone");
    expect(undone.undoneAt).toBe("2026-01-01T00:05:00.000Z");
  });
});

describe("normalizeAiChangeArtifact", () => {
  it("accepts valid artifacts and rejects malformed ones", () => {
    const pending = createPendingArtifactFromProposal({
      proposal,
      beforeSnapshot: before,
    });
    expect(normalizeAiChangeArtifact(pending)?.id).toBe("prop-1");
    expect(normalizeAiChangeArtifact(null)).toBeNull();
    expect(normalizeAiChangeArtifact({ ...pending, status: "nope" })).toBeNull();
    expect(
      normalizeAiChangeArtifact({ ...pending, beforeSnapshot: { title: 1 } }),
    ).toBeNull();
    expect(
      normalizeAiChangeArtifact({
        ...pending,
        beforeSnapshot: null,
        afterSnapshot: { title: 1 },
      }),
    ).toBeNull();
    expect(
      normalizeAiChangeArtifact({
        ...pending,
        beforeSnapshot: null,
        afterSnapshot: null,
        commitHash: null,
        appliedAt: null,
        rejectedAt: null,
        undoneAt: null,
      })?.afterSnapshot,
    ).toBeNull();
  });
});

describe("abbreviateCommitHash", () => {
  it("shortens long hashes", () => {
    expect(abbreviateCommitHash("abcdef1234567890")).toBe("abcdef1");
    expect(abbreviateCommitHash("abc")).toBe("abc");
  });
});
