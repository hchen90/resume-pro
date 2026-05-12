import type { ComponentType } from "react";

import type { ResumeWithNodes } from "@/lib/resume/types";

export type ResumeTemplateProps = {
  resume: ResumeWithNodes;
};

export type ResumeTemplate = {
  id: string;
  name: string;
  description: string;
  paper: "a4";
  component: ComponentType<ResumeTemplateProps>;
};
