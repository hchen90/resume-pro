import { classicTemplate } from "./classic";
import { modernTemplate } from "./modern";
import type { ResumeTemplate } from "./types";

export const resumeTemplates = [classicTemplate, modernTemplate] as const;

export function getResumeTemplate(templateId: string): ResumeTemplate {
  return (
    resumeTemplates.find((template) => template.id === templateId) ??
    classicTemplate
  );
}
