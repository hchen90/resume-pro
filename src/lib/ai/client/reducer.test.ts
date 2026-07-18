import { describe, expect, it } from "vitest";

import {
  createInitialAssistantUiState,
  reduceAssistantStreamEvent,
} from "./reducer";

describe("reduceAssistantStreamEvent", () => {
  it("accumulates text and stores proposals", () => {
    let state = createInitialAssistantUiState();
    state = reduceAssistantStreamEvent(
      state,
      { type: "run_started", runId: "r1", mode: "edit", action: "send" },
      "improve summary",
    );
    state = reduceAssistantStreamEvent(
      state,
      { type: "text_delta", runId: "r1", delta: "Hello" },
      "improve summary",
    );
    state = reduceAssistantStreamEvent(
      state,
      {
        type: "proposal_ready",
        runId: "r1",
        proposal: {
          proposalId: "p1",
          resumeId: "resume-1",
          mode: "edit",
          message: "Update summary",
          patches: [
            {
              op: "update_node",
              nodeId: "n1",
              content: { body: "x" },
            },
          ],
          summary: {
            createCount: 0,
            updateCount: 1,
            deleteCount: 0,
            templateChange: null,
            affectedNodeIds: ["n1"],
            affectedTitles: ["Summary"],
          },
          snapshotHash: "abc",
          baseUpdatedAt: "2026-01-01T00:00:00.000Z",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      },
      "improve summary",
    );

    expect(state.streamingText).toBe("Hello");
    expect(state.pendingProposal?.proposalId).toBe("p1");
  });
});
