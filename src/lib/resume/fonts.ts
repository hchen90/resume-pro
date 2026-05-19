/**
 * Typography-style presets; labels are fixed (not translated with UI locale).
 * Font files: src/lib/resume/load-bundled-fonts.ts — Latin/Latin-ext (en, es, fr, de),
 * Cyrillic (ru), SC/TC/JP/KR, LXGW WenKai (Latin).
 */
export const resumeFontPresets = [
  "sans",
  "serif",
  "songti",
  "kaiti",
  "mono",
] as const;

export type ResumeFontPreset = (typeof resumeFontPresets)[number];

/** Display name in the script/style the stack is designed for */
export const resumeFontPresetLabels: Record<ResumeFontPreset, string> = {
  sans: "Sans-serif",
  serif: "Serif",
  songti: "宋体",
  kaiti: "楷体",
  mono: "Courier New",
};

export const defaultResumeFontPreset: ResumeFontPreset = "sans";

const legacyFontPresetMap: Record<string, ResumeFontPreset> = {
  default: "sans",
  serif: "songti",
  "latin-sans": "sans",
  "latin-serif": "serif",
  "ja-sans": "sans",
  "ja-serif": "songti",
  "ko-sans": "sans",
  "ko-serif": "songti",
  "ru-sans": "sans",
  "ru-serif": "serif",
};

export function getFontPresets(): ResumeFontPreset[] {
  return [...resumeFontPresets];
}

export function resumeFontPresetLabel(preset: ResumeFontPreset): string {
  return resumeFontPresetLabels[preset];
}

export function resolveResumeFontPreset(
  value?: string | null,
): ResumeFontPreset {
  if (!value) {
    return defaultResumeFontPreset;
  }

  if (resumeFontPresets.includes(value as ResumeFontPreset)) {
    return value as ResumeFontPreset;
  }

  return legacyFontPresetMap[value] ?? defaultResumeFontPreset;
}
