import { describe, expect, it } from "vitest";

import { buildCommitMessage, fallbackCommitMessage } from "@/lib/workspace/commit-message";

describe("buildCommitMessage", () => {
  it("returns fallback when useAi is false", async () => {
    await expect(
      buildCommitMessage({ hint: "Update resume A", useAi: false }),
    ).resolves.toBe("Update resume A");
  });

  it("returns fallback when AI key is missing", async () => {
    const previous = process.env.AI_API_KEY;
    delete process.env.AI_API_KEY;
    try {
      await expect(
        buildCommitMessage({ hint: "Update JD B" }),
      ).resolves.toBe("Update JD B");
    } finally {
      if (previous === undefined) {
        delete process.env.AI_API_KEY;
      } else {
        process.env.AI_API_KEY = previous;
      }
    }
  });

  it("exposes deterministic fallback helper", () => {
    expect(fallbackCommitMessage()).toBe("Update workspace documents");
  });
});
