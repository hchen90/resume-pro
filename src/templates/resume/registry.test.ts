import { describe, expect, it } from "vitest";

import { getResumeTemplate, resumeTemplates } from "./registry";

describe("resume template registry", () => {
  it("registers multiple templates", () => {
    expect(resumeTemplates.length).toBeGreaterThanOrEqual(7);
  });

  it("falls back to the classic template", () => {
    expect(getResumeTemplate("missing").id).toBe("classic");
  });
});
