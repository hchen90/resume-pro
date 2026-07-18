import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  resolveChatModelName,
  resolveSummaryModelName,
  resolveTemperature,
} from "@/lib/ai/model-config";

import {
  createChatModel,
  createSummaryChatModel,
  hasAiConfiguration,
} from "./model";

describe("ai model config", () => {
  it("falls back to the main model when summary model is unset", () => {
    const env = {
      AI_API_MODEL: "gpt-4o",
      AI_SUMMARY_MODEL: "",
    };

    expect(resolveSummaryModelName(env)).toBe("gpt-4o");
  });

  it("uses the dedicated summary model when configured", () => {
    const env = {
      AI_API_MODEL: "gpt-4o",
      AI_SUMMARY_MODEL: "gpt-4o-mini",
    };

    expect(resolveSummaryModelName(env)).toBe("gpt-4o-mini");
    expect(resolveChatModelName(env)).toBe("gpt-4o");
  });

  it("resolves temperature from env with a safe default", () => {
    expect(resolveTemperature({})).toBe(0.3);
    expect(resolveTemperature({ AI_TEMPERATURE: "1" })).toBe(1);
    expect(resolveTemperature({ AI_TEMPERATURE: "0" })).toBe(0);
    expect(resolveTemperature({ AI_TEMPERATURE: "nope" })).toBe(0.3);
    expect(resolveTemperature({ AI_TEMPERATURE: "  " })).toBe(0.3);
  });
});

describe("ai model client", () => {
  const originalKey = process.env.AI_API_KEY;
  const originalUrl = process.env.AI_API_URL;
  const originalModel = process.env.AI_API_MODEL;

  beforeEach(() => {
    delete process.env.AI_API_KEY;
    delete process.env.AI_API_URL;
    delete process.env.AI_API_MODEL;
  });

  afterEach(() => {
    process.env.AI_API_KEY = originalKey;
    process.env.AI_API_URL = originalUrl;
    process.env.AI_API_MODEL = originalModel;
  });

  it("reports missing configuration", () => {
    expect(hasAiConfiguration()).toBe(false);
  });

  it("reports present configuration", () => {
    process.env.AI_API_KEY = "sk-test";
    expect(hasAiConfiguration()).toBe(true);
  });

  it("throws when creating a model without an API key", () => {
    expect(() => createChatModel()).toThrow("AI_API_KEY is not configured.");
  });

  it("creates chat and summary models with a custom base URL", () => {
    process.env.AI_API_KEY = "sk-test";
    process.env.AI_API_URL = "https://example.com/v1";
    process.env.AI_API_MODEL = "gpt-4o";

    const chat = createChatModel();
    const summary = createSummaryChatModel();

    expect(chat).toBeTruthy();
    expect(summary).toBeTruthy();
  });
});
