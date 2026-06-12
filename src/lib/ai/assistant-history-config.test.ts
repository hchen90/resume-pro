import { describe, expect, it } from "vitest";

import { resolveAssistantHistoryConfig } from "@/lib/ai/assistant-history-config";

describe("assistant history config", () => {
  it("uses defaults when env vars are missing", () => {
    expect(resolveAssistantHistoryConfig({})).toEqual({
      maxMessages: 50,
      summarizeAbove: 30,
      contextMessages: 20,
    });
  });

  it("parses custom values", () => {
    const env = {
      AI_HISTORY_MAX_MESSAGES: "60",
      AI_HISTORY_SUMMARIZE_ABOVE: "40",
      AI_HISTORY_CONTEXT_MESSAGES: "25",
    };

    expect(resolveAssistantHistoryConfig(env)).toEqual({
      maxMessages: 60,
      summarizeAbove: 40,
      contextMessages: 25,
    });
  });

  it("clamps context messages to summarize threshold and max to summarize threshold", () => {
    const env = {
      AI_HISTORY_MAX_MESSAGES: "20",
      AI_HISTORY_SUMMARIZE_ABOVE: "30",
      AI_HISTORY_CONTEXT_MESSAGES: "40",
    };

    expect(resolveAssistantHistoryConfig(env)).toEqual({
      maxMessages: 30,
      summarizeAbove: 30,
      contextMessages: 30,
    });
  });
});
