import type { ResumeWithNodes } from "@/lib/resume/types";

export const aiModes = ["chat", "edit", "plan"] as const;

export type AiMode = (typeof aiModes)[number];

export type AiMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AiResponse = {
  message: string;
  patches: unknown[];
  resume?: ResumeWithNodes;
};
