import { describe, expect, it } from "vitest";

import {
  createDefaultAiChatSession,
  normalizeAiChatSession,
} from "@/lib/ai/chat-session";

describe("ai chat session", () => {
  it("returns defaults for empty input", () => {
    const session = normalizeAiChatSession(null, "Hello");

    expect(session).toEqual(createDefaultAiChatSession("Hello"));
  });

  it("keeps valid messages and mode", () => {
    const session = normalizeAiChatSession(
      {
        messages: [
          { role: "user", content: "Improve summary" },
          { role: "assistant", content: "Sure." },
        ],
        mode: "edit",
      },
      "Hello",
    );

    expect(session.messages).toHaveLength(2);
    expect(session.mode).toBe("edit");
  });

  it("drops invalid messages and restores intro when empty", () => {
    const session = normalizeAiChatSession(
      {
        messages: [{ role: "tool", content: "ignored" } as never],
      },
      "Hello",
    );

    expect(session.messages).toEqual([{ role: "assistant", content: "Hello" }]);
  });

  it("restores pending plan, selected steps, and summary", () => {
    const session = normalizeAiChatSession(
      {
        messages: [{ role: "user", content: "Plan edits" }],
        mode: "plan",
        summary: "User wants stronger bullets.",
        pendingPlan: {
          originalMessage: "Plan edits",
          plan: {
            summary: "Refine experience section",
            steps: [
              {
                id: "step-1",
                title: "Rewrite bullets",
                description: "Make bullets more metric-driven",
                targetNodeIds: ["node-1"],
              },
            ],
          },
        },
        selectedPlanStepIds: ["step-1", "missing"],
      },
      "Hello",
    );

    expect(session.summary).toBe("User wants stronger bullets.");
    expect(session.pendingPlan?.plan.summary).toBe("Refine experience section");
    expect(session.selectedPlanStepIds).toEqual(["step-1"]);
  });
});
