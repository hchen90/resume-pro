import { classicTemplate } from "./classic";
import { compactTemplate } from "./compact";
import { creativeTemplate } from "./creative";
import { elegantTemplate } from "./elegant";
import { modernTemplate } from "./modern";
import { timelineTemplate } from "./timeline";
import type { ResumeTemplate } from "./types";

export const resumeTemplates = [
  classicTemplate,
  modernTemplate,
  compactTemplate,
  elegantTemplate,
  timelineTemplate,
  creativeTemplate,
] as const;

export function getResumeTemplate(templateId: string): ResumeTemplate {
  return (
    resumeTemplates.find((template) => template.id === templateId) ??
    classicTemplate
  );
}
