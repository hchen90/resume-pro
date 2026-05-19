import { describe, expect, it } from "vitest";

import {
  defaultResumeFontPreset,
  getFontPresets,
  resolveResumeFontPreset,
  resumeFontPresetLabel,
  resumeFontPresetLabels,
} from "./fonts";

describe("resumeFontPresetLabels", () => {
  it("uses fixed typography names not tied to UI locale", () => {
    expect(resumeFontPresetLabels.songti).toBe("宋体");
    expect(resumeFontPresetLabels.serif).toBe("Serif");
    expect(resumeFontPresetLabels.mono).toBe("Courier New");
  });
});

describe("getFontPresets", () => {
  it("returns five style presets", () => {
    expect(getFontPresets()).toHaveLength(5);
  });
});

describe("resolveResumeFontPreset", () => {
  it("returns sans for empty or unknown values", () => {
    expect(resolveResumeFontPreset()).toBe(defaultResumeFontPreset);
    expect(resolveResumeFontPreset("mono")).toBe("mono");
    expect(resolveResumeFontPreset("unknown")).toBe("sans");
  });

  it("maps legacy preset ids", () => {
    expect(resolveResumeFontPreset("default")).toBe("sans");
    expect(resolveResumeFontPreset("latin-serif")).toBe("serif");
    expect(resolveResumeFontPreset("ja-serif")).toBe("songti");
  });
});

describe("resumeFontPresetLabel", () => {
  it("returns label for preset", () => {
    expect(resumeFontPresetLabel("kaiti")).toBe("楷体");
  });
});
