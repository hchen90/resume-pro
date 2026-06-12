import { describe, expect, it } from "vitest";

import {
  resolveChatModelName,
  resolveSummaryModelName,
} from "@/lib/ai/model-config";

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
});
