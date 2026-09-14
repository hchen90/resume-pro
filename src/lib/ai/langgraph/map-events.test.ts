import { describe, expect, it } from "vitest";

import {
  mapGraphFatalError,
  mapLangGraphStreamEvent,
} from "./map-events";
import { createAssistantRunContext } from "./run-context";
import type { ResumeWithNodes } from "@/lib/resume/types";

const resume = {
  id: "resume-1",
  title: "Test",
  templateId: "classic",
  updatedAt: "2026-01-01T00:00:00.000Z",
  nodes: [],
} as unknown as ResumeWithNodes;

function makeContext() {
  return createAssistantRunContext({
    runId: "run-1",
    resumeId: resume.id,
    resume,
    mode: "edit",
    action: "send",
    locale: "zh-CN",
    snapshotHash: "hash",
    baseUpdatedAt: resume.updatedAt,
    signal: new AbortController().signal,
  });
}

describe("mapLangGraphStreamEvent", () => {
  it("maps chat model text and thinking deltas", () => {
    const context = makeContext();
    const mapped = mapLangGraphStreamEvent(
      {
        event: "on_chat_model_stream",
        data: {
          chunk: {
            content: [
              { type: "text", text: "Hello" },
              { type: "thinking", thinking: "hmm" },
            ],
            additional_kwargs: {},
          },
        },
      },
      context,
    );

    expect(mapped).toEqual([
      { type: "text_delta", runId: "run-1", delta: "Hello" },
      { type: "thinking_delta", runId: "run-1", delta: "hmm" },
    ]);
  });

  it("maps tool start and successful propose_resume_patch end", () => {
    const context = makeContext();
    context.proposal = {
      proposalId: "p1",
      resumeId: "resume-1",
      mode: "edit",
      message: "Update summary",
      patches: [],
      summary: {
        createCount: 0,
        updateCount: 1,
        deleteCount: 0,
        templateChange: null,
        affectedNodeIds: [],
        affectedTitles: [],
      },
      snapshotHash: "hash",
      baseUpdatedAt: resume.updatedAt,
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    expect(
      mapLangGraphStreamEvent(
        {
          event: "on_tool_start",
          name: "propose_resume_patch",
          data: { tool_call_id: "call-1", name: "propose_resume_patch" },
        },
        context,
      ),
    ).toEqual([
      {
        type: "tool_started",
        runId: "run-1",
        toolName: "propose_resume_patch",
        toolCallId: "call-1",
      },
    ]);

    expect(
      mapLangGraphStreamEvent(
        {
          event: "on_tool_end",
          name: "propose_resume_patch",
          data: {
            tool_call_id: "call-1",
            name: "propose_resume_patch",
            output: JSON.stringify({ ok: true }),
          },
        },
        context,
      ),
    ).toEqual([
      {
        type: "tool_finished",
        runId: "run-1",
        toolName: "propose_resume_patch",
        toolCallId: "call-1",
        ok: true,
      },
      {
        type: "proposal_ready",
        runId: "run-1",
        proposal: context.proposal,
      },
    ]);
  });

  it("maps failed tool results with lastToolError", () => {
    const context = makeContext();
    context.lastToolError = "bad patch";
    context.activeTools.set("call-2", "propose_resume_patch");

    expect(
      mapLangGraphStreamEvent(
        {
          event: "on_tool_end",
          data: {
            tool_call_id: "call-2",
            output: JSON.stringify({ ok: false, error: "bad patch" }),
          },
        },
        context,
      ),
    ).toEqual([
      {
        type: "tool_finished",
        runId: "run-1",
        toolName: "propose_resume_patch",
        toolCallId: "call-2",
        ok: false,
      },
      {
        type: "error",
        runId: "run-1",
        message: "bad patch",
        fatal: false,
      },
    ]);
  });

  it("maps draft_resume_plan to plan_ready", () => {
    const context = makeContext();
    context.mode = "plan";
    context.plan = {
      summary: "Improve",
      steps: [
        {
          id: "step-1",
          title: "Rewrite summary",
          description: "Make it sharper",
          targetNodeIds: [],
        },
      ],
    };
    context.planMessage = "Here is a plan";
    context.activeTools.set("call-3", "draft_resume_plan");

    expect(
      mapLangGraphStreamEvent(
        {
          event: "on_tool_end",
          data: {
            tool_call_id: "call-3",
            output: JSON.stringify({ ok: true }),
          },
        },
        context,
      ),
    ).toContainEqual({
      type: "plan_ready",
      runId: "run-1",
      plan: context.plan,
      message: "Here is a plan",
    });
  });
});

describe("mapGraphFatalError", () => {
  it("maps GraphRecursionError to max-iteration message", () => {
    const context = makeContext();
    const error = Object.assign(new Error("recursion"), {
      name: "GraphRecursionError",
    });

    expect(mapGraphFatalError(error, context)).toEqual({
      type: "error",
      runId: "run-1",
      message: "Assistant exceeded the maximum number of tool iterations.",
      fatal: true,
    });
  });
});
