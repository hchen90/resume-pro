"use client";

import { useRouter } from "next/navigation";

type TemplateSelectProps = {
  resumeId: string;
  selectedTemplateId: string;
  settingsQuery: string;
  label: string;
  templates: Array<{
    id: string;
    name: string;
    description: string;
  }>;
};

export function TemplateSelect({
  resumeId,
  selectedTemplateId,
  settingsQuery,
  label,
  templates,
}: TemplateSelectProps) {
  const router = useRouter();

  return (
    <label className="text-sm font-medium text-[var(--app-muted)]">
      {label}
      <select
        value={selectedTemplateId}
        onChange={(event) => {
          router.push(
            `/resumes/${resumeId}/download?template=${event.target.value}&${settingsQuery}`,
          );
        }}
        className="mt-2 min-w-[220px] rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
      >
        {templates.map((template) => (
          <option
            key={template.id}
            value={template.id}
            title={template.description}
          >
            {template.name}
          </option>
        ))}
      </select>
    </label>
  );
}
