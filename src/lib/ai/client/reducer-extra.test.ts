import { describe, expect, it } from "vitest";

import {
  assistantMessageFromUiState,
  createInitialAssistantUiState,
  reduceAssistantStreamEvent,
} from "./reducer";

const original = "do the thing";

describe("reduceAssistantStreamEvent extra events", () => {
  it("accumulates thinking text and tracks active tools", () => {
    let state = createInitialAssistantUiState();
    state = reduceAssistantStreamEvent(
      state,
      { type: "thinking_delta", runId: "r1", delta: "reasoning" },
      original,
    );
    expect(state.thinkingText).toBe("reasoning");

    state = reduceAssistantStreamEvent(
      state,
      { type: "tool_started", runId: "r1", toolName: "get_resume_context", toolCallId: "t1" },
      original,
    );
    expect(state.activeToolName).toBe("get_resume_context");

    state = reduceAssistantStreamEvent(
      state,
      {
        type: "tool_finished",
        runId: "r1",
        toolName: "get_resume_context",
        toolCallId: "t1",
        ok: true,
      },
      original,
    );
    expect(state.activeToolName).toBeNull();
  });

  it("stores plans and selects all steps", () => {
    let state = createInitialAssistantUiState();
    state = reduceAssistantStreamEvent(
      state,
      {
        type: "plan_ready",
        runId: "r1",
        message: "plan message",
        plan: {
          summary: "s",
          steps: [
            { id: "step-1", title: "a", description: "d", targetNodeIds: [] },
            { id: "step-2", title: "b", description: "d", targetNodeIds: [] },
          ],
        },
      },
      original,
    );

    expect(state.pendingPlan?.originalMessage).toBe(original);
    expect(state.selectedPlanStepIds).toEqual(["step-1", "step-2"]);
    expect(state.streamingText).toBe("plan message");
  });

  it("records errors and finish state", () => {
    let state = createInitialAssistantUiState();
    state = reduceAssistantStreamEvent(
      state,
      { type: "error", runId: "r1", message: "boom" },
      original,
    );
    expect(state.errorMessage).toBe("boom");

    state = reduceAssistantStreamEvent(
      state,
      { type: "run_finished", runId: "r1", cancelled: true },
      original,
    );
    expect(state.finished).toBe(true);
    expect(state.cancelled).toBe(true);
  });

  it("ignores unknown event types", () => {
    const state = createInitialAssistantUiState({ streamingText: "keep" });
    const next = reduceAssistantStreamEvent(
      state,
      { type: "nope" } as never,
      original,
    );
    expect(next.streamingText).toBe("keep");
  });
});

describe("assistantMessageFromUiState", () => {
  it("returns null when cancelled", () => {
    const state = createInitialAssistantUiState({ cancelled: true });
    expect(assistantMessageFromUiState(state, "fallback")).toBeNull();
  });

  it("returns an error message when only an error is present", () => {
    const state = createInitialAssistantUiState({ errorMessage: "failed" });
    const message = assistantMessageFromUiState(state, "fallback");
    expect(message).toEqual({
      role: "assistant",
      content: "failed",
      isError: true,
    });
  });

  it("keeps streaming text as a normal bubble even after a soft error", () => {
    const state = createInitialAssistantUiState({
      streamingText: "partial",
      errorMessage: "later error",
    });
    const message = assistantMessageFromUiState(state, "fallback");
    expect(message?.content).toBe("partial");
    expect(message?.isError).toBe(false);
  });

  it("returns null when nothing meaningful was produced", () => {
    const state = createInitialAssistantUiState();
    expect(assistantMessageFromUiState(state, "fallback")).toBeNull();
  });
});
