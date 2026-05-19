"use client";

import { useRouter } from "next/navigation";

import { downloadPageQuery } from "@/lib/resume/download-query";
import {
  getFontPresets,
  resolveResumeFontPreset,
  resumeFontPresetLabel,
  type ResumeFontPreset,
} from "@/lib/resume/fonts";

type ResumeFontSelectProps = {
  resumeId: string;
  selectedFontPreset: ResumeFontPreset;
  selectedTemplateId: string;
  settingsQuery: string;
  label: string;
};

export function ResumeFontSelect({
  resumeId,
  selectedFontPreset,
  selectedTemplateId,
  settingsQuery,
  label,
}: ResumeFontSelectProps) {
  const router = useRouter();
  const resolvedSelection = resolveResumeFontPreset(selectedFontPreset);

  return (
    <label className="text-sm font-medium text-[var(--app-muted)]">
      {label}
      <select
        value={resolvedSelection}
        onChange={(event) => {
          router.push(
            `/resumes/${resumeId}/download?${downloadPageQuery({
              template: selectedTemplateId,
              font: event.target.value,
              settingsQuery,
            })}`,
          );
        }}
        className="mt-2 min-w-[220px] rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
      >
        {getFontPresets().map((preset) => (
          <option key={preset} value={preset}>
            {resumeFontPresetLabel(preset)}
          </option>
        ))}
      </select>
    </label>
  );
}
