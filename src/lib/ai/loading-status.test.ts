import { describe, expect, it } from "vitest";

import {
  getAiLoadingMessages,
  loadingPhaseForMode,
} from "./loading-status";

const labels = {
  aiLoadingChat: "chat",
  aiLoadingEditAnalyzing: "analyzing",
  aiLoadingEditApplying: "applying",
  aiLoadingPlanDrafting: "drafting",
  aiLoadingPlanExecuting: "executing",
  aiLoadingTool: "tool",
};

describe("loadingPhaseForMode", () => {
  it("maps each mode and action to a phase", () => {
    expect(loadingPhaseForMode("chat")).toBe("chat");
    expect(loadingPhaseForMode("edit")).toBe("edit");
    expect(loadingPhaseForMode("plan")).toBe("plan-draft");
    expect(loadingPhaseForMode("plan", "execute_plan")).toBe("plan-execute");
  });
});

describe("getAiLoadingMessages", () => {
  it("returns messages for each phase", () => {
    expect(getAiLoadingMessages("chat", labels)).toEqual(["chat"]);
    expect(getAiLoadingMessages("edit", labels)).toEqual([
      "analyzing",
      "applying",
    ]);
    expect(getAiLoadingMessages("plan-draft", labels)).toEqual(["drafting"]);
    expect(getAiLoadingMessages("plan-execute", labels)).toEqual(["executing"]);
    expect(getAiLoadingMessages("tool", labels)).toEqual(["tool"]);
  });

  it("falls back to the chat message for unknown phases", () => {
    expect(
      getAiLoadingMessages("mystery" as unknown as "chat", labels),
    ).toEqual(["chat"]);
  });
});
