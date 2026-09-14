import type { AiPlan } from "@/lib/ai/patch";
import type { PendingPatchProposal } from "@/lib/ai/protocol";
import type { AiMode } from "@/lib/ai/types";
import type { Locale } from "@/lib/i18n";
import type { ResumeWithNodes } from "@/lib/resume/types";

export type AssistantRunContext = {
  runId: string;
  resumeId: string;
  resume: ResumeWithNodes;
  selectedNodeId?: string;
  mode: AiMode;
  action: "send" | "execute_plan";
  locale: Locale;
  snapshotHash: string;
  baseUpdatedAt: string;
  signal: AbortSignal;
  plan: AiPlan | null;
  planMessage: string | null;
  proposal: PendingPatchProposal | null;
  lastToolError: string | null;
  activeTools: Map<string, string>;
};

export function createAssistantRunContext(
  input: Omit<
    AssistantRunContext,
    | "plan"
    | "planMessage"
    | "proposal"
    | "lastToolError"
    | "activeTools"
  >,
): AssistantRunContext {
  return {
    ...input,
    plan: null,
    planMessage: null,
    proposal: null,
    lastToolError: null,
    activeTools: new Map(),
  };
}

export function assertNotCancelled(context: AssistantRunContext) {
  if (context.signal.aborted) {
    const error = new Error("Assistant run cancelled.");
    error.name = "AbortError";
    throw error;
  }
}
