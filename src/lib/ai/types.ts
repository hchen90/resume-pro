import type { ResumeWithNodes } from "@/lib/resume/types";

import type { AiPlan } from "./patch";

export const aiModes = ["chat", "edit", "plan"] as const;

export type AiMode = (typeof aiModes)[number];

export type AiMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  aiMode?: AiMode;
  isError?: boolean;
};

export type AiResponse = {
  message: string;
  patches: unknown[];
  plan?: AiPlan;
  resume?: ResumeWithNodes;
  error?: boolean;
};
