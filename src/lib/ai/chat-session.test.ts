import { describe, expect, it } from "vitest";

import type { AiMessage } from "@/lib/ai/types";

import {
  countConversationalMessages,
  createDefaultAiChatSession,
  enforceConversationalCap,
  isIntroMessage,
  normalizeAiChatSession,
  selectMessagesToCompact,
} from "./chat-session";

const intro = "Welcome";

function conversationalMessages(count: number): AiMessage[] {
  const messages: AiMessage[] = [{ role: "assistant", content: intro }];
  for (let index = 0; index < count; index += 1) {
    messages.push({ role: "user", content: `Question ${index}` });
    messages.push({ role: "assistant", content: `Answer ${index}` });
  }
  return messages;
}

const validPlan = {
  summary: "plan",
  steps: [{ id: "step-1", title: "t", description: "d", targetNodeIds: [] }],
};

describe("selectMessagesToCompact", () => {
  it("returns null when under threshold", () => {
    expect(selectMessagesToCompact(conversationalMessages(10), intro, 30, 20)).toBeNull();
  });

  it("summarizes oldest conversational messages and keeps recent ones", () => {
    const messages: AiMessage[] = [
      { role: "assistant", content: intro },
      { role: "user", content: "old-1" },
      { role: "assistant", content: "old-reply-1" },
      { role: "system", content: "Switched mode" },
      ...conversationalMessages(20).slice(3),
    ];

    const selected = selectMessagesToCompact(messages, intro, 30, 20);
    expect(selected?.toSummarize.some((m) => m.content === "old-1")).toBe(true);
    expect(selected?.remaining.some((m) => m.content === "Switched mode")).toBe(true);
  });
});

describe("normalizeAiChatSession", () => {
  it("returns defaults for nullish input", () => {
    const session = normalizeAiChatSession(null, intro);
    expect(session).toEqual(createDefaultAiChatSession(intro));
  });

  it("filters invalid messages and falls back to defaults when empty", () => {
    const session = normalizeAiChatSession(
      { messages: [{ role: "bogus" } as unknown as AiMessage] },
      intro,
    );
    expect(session.messages).toEqual([{ role: "assistant", content: intro }]);
  });

  it("keeps valid custom fields", () => {
    const session = normalizeAiChatSession(
      {
        messages: [
          { role: "assistant", content: intro },
          { role: "user", content: "hi" },
        ],
        mode: "edit",
        summary: "  a summary  ",
        sessionVersion: 3.7,
        lastRunId: "run-9",
        selectedPlanStepIds: ["step-1", 5 as unknown as string],
        pendingPlan: { originalMessage: "orig", plan: validPlan },
      },
      intro,
    );

    expect(session.mode).toBe("edit");
    expect(session.summary).toBe("a summary");
    expect(session.sessionVersion).toBe(3);
    expect(session.lastRunId).toBe("run-9");
    expect(session.pendingPlan?.plan.steps).toHaveLength(1);
    expect(session.selectedPlanStepIds).toEqual(["step-1"]);
    expect(session.undoSnapshot).toBeNull();
    expect(session.canUndo).toBe(false);
    expect(session.redoSnapshot).toBeNull();
    expect(session.canRedo).toBe(false);
  });

  it("keeps canUndo when the API strips undoSnapshot", () => {
    const session = normalizeAiChatSession(
      {
        messages: [{ role: "assistant", content: intro }],
        canUndo: true,
      },
      intro,
    );
    expect(session.undoSnapshot).toBeNull();
    expect(session.canUndo).toBe(true);
  });

  it("keeps canRedo when the API strips redoSnapshot", () => {
    const session = normalizeAiChatSession(
      {
        messages: [{ role: "assistant", content: intro }],
        canRedo: true,
      },
      intro,
    );
    expect(session.redoSnapshot).toBeNull();
    expect(session.canRedo).toBe(true);
  });

  it("drops an invalid pending plan and resets selected steps", () => {
    const session = normalizeAiChatSession(
      {
        messages: [{ role: "assistant", content: intro }],
        pendingPlan: { originalMessage: "x", plan: { bogus: true } } as never,
        selectedPlanStepIds: ["step-1"],
      },
      intro,
    );
    expect(session.pendingPlan).toBeNull();
    expect(session.selectedPlanStepIds).toEqual([]);
  });

  it("accepts a valid pending proposal but rejects a malformed one", () => {
    const proposal = {
      proposalId: "p1",
      resumeId: "resume-1",
      mode: "edit",
      message: "msg",
      patches: [],
      summary: { createCount: 0 },
      snapshotHash: "h",
      baseUpdatedAt: "2026-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    const ok = normalizeAiChatSession(
      { messages: [{ role: "assistant", content: intro }], pendingProposal: proposal as never },
      intro,
    );
    expect(ok.pendingProposal?.proposalId).toBe("p1");

    const bad = normalizeAiChatSession(
      {
        messages: [{ role: "assistant", content: intro }],
        pendingProposal: { proposalId: "p1" } as never,
      },
      intro,
    );
    expect(bad.pendingProposal).toBeNull();
  });
});

describe("conversational helpers", () => {
  it("identifies intro messages", () => {
    expect(isIntroMessage({ role: "assistant", content: intro }, 0, intro)).toBe(true);
    expect(isIntroMessage({ role: "assistant", content: intro }, 1, intro)).toBe(false);
  });

  it("counts conversational messages excluding intro and system", () => {
    const messages: AiMessage[] = [
      { role: "assistant", content: intro },
      { role: "system", content: "note" },
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello" },
    ];
    expect(countConversationalMessages(messages, intro)).toBe(2);
  });

  it("enforces a conversational cap by dropping the oldest", () => {
    const messages = conversationalMessages(5);
    const capped = enforceConversationalCap(messages, intro, 4);
    expect(capped.length).toBeLessThan(messages.length);
    expect(capped[0]).toEqual({ role: "assistant", content: intro });
  });

  it("returns messages unchanged when under the cap", () => {
    const messages = conversationalMessages(2);
    expect(enforceConversationalCap(messages, intro, 50)).toBe(messages);
  });
});
