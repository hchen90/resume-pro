import { describe, expect, it } from "vitest";

import {
  assistantStreamEventTypes,
  encodeAssistantEvent,
} from "./protocol";

describe("encodeAssistantEvent", () => {
  it("serializes an event as a newline-terminated JSON line", () => {
    const encoded = encodeAssistantEvent({
      type: "text_delta",
      runId: "r1",
      delta: "hi",
    });

    expect(encoded.endsWith("\n")).toBe(true);
    expect(JSON.parse(encoded.trim())).toEqual({
      type: "text_delta",
      runId: "r1",
      delta: "hi",
    });
  });

  it("exposes the stable set of event types", () => {
    expect(assistantStreamEventTypes).toContain("run_started");
    expect(assistantStreamEventTypes).toContain("run_finished");
    expect(assistantStreamEventTypes).toContain("proposal_ready");
  });
});
