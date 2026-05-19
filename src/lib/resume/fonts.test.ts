import { describe, expect, it } from "vitest";

import {
  defaultResumeFontPreset,
  resolveResumeFontPreset,
  resumeFontPresets,
} from "./fonts";

describe("resolveResumeFontPreset", () => {
  it("returns default for empty or unknown values", () => {
    expect(resolveResumeFontPreset()).toBe(defaultResumeFontPreset);
    expect(resolveResumeFontPreset(null)).toBe(defaultResumeFontPreset);
    expect(resolveResumeFontPreset("")).toBe(defaultResumeFontPreset);
    expect(resolveResumeFontPreset("mono")).toBe(defaultResumeFontPreset);
  });

  it("accepts known presets", () => {
    for (const preset of resumeFontPresets) {
      expect(resolveResumeFontPreset(preset)).toBe(preset);
    }
  });
});
