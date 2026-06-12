import { describe, expect, it } from "vitest";

import { dictionaries } from "@/lib/i18n";

import {
  getAiLoadingMessages,
  loadingPhaseForMode,
} from "./loading-status";

describe("loading-status", () => {
  it("maps modes to loading phases", () => {
    expect(loadingPhaseForMode("chat")).toBe("chat");
    expect(loadingPhaseForMode("edit")).toBe("edit");
    expect(loadingPhaseForMode("plan")).toBe("plan-draft");
    expect(loadingPhaseForMode("plan", "execute_plan")).toBe("plan-execute");
  });

  it("returns mode-specific loading messages", () => {
    const labels = dictionaries["zh-CN"];
    expect(getAiLoadingMessages("edit", labels)).toHaveLength(2);
    expect(getAiLoadingMessages("chat", labels)).toEqual([labels.aiLoadingChat]);
  });
});
