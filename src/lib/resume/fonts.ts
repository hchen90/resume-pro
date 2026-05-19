export const resumeFontPresets = ["default", "serif"] as const;

export type ResumeFontPreset = (typeof resumeFontPresets)[number];

export const defaultResumeFontPreset: ResumeFontPreset = "default";

/** i18n dictionary keys for each preset label */
export const resumeFontPresetLabelKeys = {
  default: "resumeFontDefault",
  serif: "resumeFontSerif",
} as const satisfies Record<ResumeFontPreset, string>;

export function resolveResumeFontPreset(
  value?: string | null,
): ResumeFontPreset {
  return resumeFontPresets.includes(value as ResumeFontPreset)
    ? (value as ResumeFontPreset)
    : defaultResumeFontPreset;
}
