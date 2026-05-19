"use client";

import { useRouter } from "next/navigation";

import {
  resumeFontPresets,
  type ResumeFontPreset,
} from "@/lib/resume/fonts";
import { downloadPageQuery } from "@/lib/resume/download-query";

type ResumeFontSelectProps = {
  resumeId: string;
  selectedFontPreset: ResumeFontPreset;
  selectedTemplateId: string;
  settingsQuery: string;
  label: string;
  presetLabels: Record<ResumeFontPreset, string>;
};

export function ResumeFontSelect({
  resumeId,
  selectedFontPreset,
  selectedTemplateId,
  settingsQuery,
  label,
  presetLabels,
}: ResumeFontSelectProps) {
  const router = useRouter();

  return (
    <label className="text-sm font-medium text-[var(--app-muted)]">
      {label}
      <select
        value={selectedFontPreset}
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
        {resumeFontPresets.map((preset) => (
          <option key={preset} value={preset}>
            {presetLabels[preset]}
          </option>
        ))}
      </select>
    </label>
  );
}
