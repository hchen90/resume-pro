import { describe, expect, it, vi } from "vitest";

import type { ChatOpenAI } from "@langchain/openai";

import { AiInvokeError, invokeChatModel } from "./invoke";

function fakeModel(
  impl: () => Promise<{ content: unknown }>,
  modelName?: string,
): ChatOpenAI {
  const model = { invoke: vi.fn(impl) } as Record<string, unknown>;
  if (modelName !== undefined) {
    model.model = modelName;
  }
  return model as unknown as ChatOpenAI;
}

describe("invokeChatModel", () => {
  it("returns the result on success (string content)", async () => {
    const model = fakeModel(async () => ({ content: "hello" }), "gpt-4o");
    const result = await invokeChatModel(model, [{ role: "user", content: "hi" }], {
      label: "test",
      mode: "chat",
    });

    expect(result.content).toBe("hello");
  });

  it("handles array content parts when logging length", async () => {
    const model = fakeModel(
      async () => ({
        content: [
          "plain",
          { text: "typed" },
          { type: "image" },
        ],
      }),
      "gpt-4o",
    );

    const result = await invokeChatModel(model, "single-string-input", {
      label: "test",
    });

    expect(Array.isArray(result.content)).toBe(true);
  });

  it("handles non-string, non-array content", async () => {
    const model = fakeModel(async () => ({ content: 42 }), "gpt-4o");
    const result = await invokeChatModel(model, [], { label: "test" });
    expect(result.content).toBe(42);
  });

  it("falls back to env model name when model has no name", async () => {
    const previous = process.env.AI_API_MODEL;
    process.env.AI_API_MODEL = "env-model";
    const model = fakeModel(async () => ({ content: "ok" }));

    const result = await invokeChatModel(model, [], { label: "test" });
    expect(result.content).toBe("ok");

    process.env.AI_API_MODEL = previous;
  });

  it("wraps invocation failures in AiInvokeError", async () => {
    const model = fakeModel(async () => {
      throw { status: 429, message: "slow down" };
    }, "gpt-4o");

    await expect(
      invokeChatModel(model, [], { label: "test", mode: "chat" }),
    ).rejects.toBeInstanceOf(AiInvokeError);
  });
});
