import { describe, expect, it } from "vitest";

import type { AiMessage } from "@/lib/ai/types";

import { selectMessagesToCompact } from "./chat-session";

const intro = "Welcome";

function conversationalMessages(count: number): AiMessage[] {
  const messages: AiMessage[] = [{ role: "assistant", content: intro }];
  for (let index = 0; index < count; index += 1) {
    messages.push({ role: "user", content: `Question ${index}` });
    messages.push({ role: "assistant", content: `Answer ${index}` });
  }
  return messages;
}

describe("selectMessagesToCompact", () => {
  it("returns null when under threshold", () => {
    const messages = conversationalMessages(10);
    expect(selectMessagesToCompact(messages, intro, 30, 20)).toBeNull();
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
    expect(selected).not.toBeNull();
    expect(selected?.toSummarize.some((message) => message.content === "old-1")).toBe(
      true,
    );
    expect(
      selected?.remaining.some((message) => message.content === "Switched mode"),
    ).toBe(true);
    expect(selected?.remaining.at(-1)?.content).toContain("Answer");
  });
});
