import { describe, expect, it, vi } from "vitest";

import type { ChatOpenAI } from "@langchain/openai";

import type { AssistantHistoryConfig } from "@/lib/ai/assistant-history-config";
import type { AiChatSession } from "@/lib/ai/chat-session";
import type { AiMessage } from "@/lib/ai/types";

import {
  compactChatSessionIfNeeded,
  selectMessagesToCompact,
  summarizeChatMessages,
  truncateWithoutSummary,
} from "./compact-chat";

const intro = "Welcome";

function conversationalMessages(count: number): AiMessage[] {
  const messages: AiMessage[] = [{ role: "assistant", content: intro }];
  for (let index = 0; index < count; index += 1) {
    messages.push({ role: "user", content: `Question ${index}` });
    messages.push({ role: "assistant", content: `Answer ${index}` });
  }
  return messages;
}

function config(
  overrides: Partial<AssistantHistoryConfig> = {},
): AssistantHistoryConfig {
  return {
    maxMessages: 50,
    summarizeAbove: 30,
    contextMessages: 20,
    ...overrides,
  };
}

function fakeModel(content: unknown): ChatOpenAI {
  return {
    model: "gpt-4o",
    invoke: vi.fn(async () => ({ content })),
  } as unknown as ChatOpenAI;
}

function session(messages: AiMessage[]): AiChatSession {
  return {
    messages,
    mode: "chat",
    pendingPlan: null,
    selectedPlanStepIds: [],
    pendingProposal: null,
    summary: null,
    sessionVersion: 0,
    lastRunId: null,
  };
}

describe("selectMessagesToCompact", () => {
  it("returns null when under threshold", () => {
    const messages = conversationalMessages(10);
    expect(selectMessagesToCompact(messages, intro, 30, 20)).toBeNull();
  });
});

describe("truncateWithoutSummary", () => {
  it("returns the same messages when under threshold", () => {
    const messages = conversationalMessages(5);
    expect(truncateWithoutSummary(messages, intro, config())).toBe(messages);
  });

  it("drops the oldest conversational messages when above threshold", () => {
    const messages = conversationalMessages(40);
    const result = truncateWithoutSummary(messages, intro, config());
    expect(result.length).toBeLessThan(messages.length);
  });
});

describe("summarizeChatMessages", () => {
  it("returns trimmed summary text", async () => {
    const model = fakeModel("  concise summary  ");
    const summary = await summarizeChatMessages({
      model,
      existingSummary: null,
      messages: conversationalMessages(2),
      locale: "en",
      resumeId: "resume-1",
    });

    expect(summary).toBe("concise summary");
  });

  it("joins array content and throws on empty output", async () => {
    const model = fakeModel([{ text: "" }, "   "]);
    await expect(
      summarizeChatMessages({
        model,
        existingSummary: "prev",
        messages: conversationalMessages(2),
        locale: "en",
        resumeId: "resume-1",
      }),
    ).rejects.toThrow("empty content");
  });
});

describe("compactChatSessionIfNeeded", () => {
  it("truncates without a model when over threshold", async () => {
    const result = await compactChatSessionIfNeeded({
      session: session(conversationalMessages(40)),
      introContent: intro,
      locale: "en",
      resumeId: "resume-1",
      model: null,
      historyConfig: config(),
    });

    expect(result.summary).toBeNull();
    expect(result.messages.length).toBeLessThan(81);
  });

  it("summarizes with a model when over threshold", async () => {
    const model = fakeModel("rolling summary");
    const result = await compactChatSessionIfNeeded({
      session: session(conversationalMessages(40)),
      introContent: intro,
      locale: "en",
      resumeId: "resume-1",
      model,
      historyConfig: config(),
    });

    expect(result.summary).toBe("rolling summary");
  });

  it("leaves short sessions unchanged", async () => {
    const short = session(conversationalMessages(3));
    const result = await compactChatSessionIfNeeded({
      session: short,
      introContent: intro,
      locale: "en",
      resumeId: "resume-1",
      model: null,
      historyConfig: config(),
    });

    expect(result.messages).toHaveLength(short.messages.length);
  });
});
