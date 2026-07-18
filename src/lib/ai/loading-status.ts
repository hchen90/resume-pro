import type { Dictionary } from "@/lib/i18n";

export type AiLoadingPhase =
  | "chat"
  | "edit"
  | "plan-draft"
  | "plan-execute"
  | "tool";

export const LOADING_STATUS_INTERVAL_MS = 2800;

export function loadingPhaseForMode(
  mode: "chat" | "edit" | "plan",
  action: "send" | "execute_plan" = "send",
): AiLoadingPhase {
  if (mode === "chat") {
    return "chat";
  }

  if (mode === "edit") {
    return "edit";
  }

  return action === "execute_plan" ? "plan-execute" : "plan-draft";
}

export function getAiLoadingMessages(
  phase: AiLoadingPhase,
  labels: Pick<
    Dictionary,
    | "aiLoadingChat"
    | "aiLoadingEditAnalyzing"
    | "aiLoadingEditApplying"
    | "aiLoadingPlanDrafting"
    | "aiLoadingPlanExecuting"
    | "aiLoadingTool"
  >,
) {
  switch (phase) {
    case "chat":
      return [labels.aiLoadingChat];
    case "edit":
      return [labels.aiLoadingEditAnalyzing, labels.aiLoadingEditApplying];
    case "plan-draft":
      return [labels.aiLoadingPlanDrafting];
    case "plan-execute":
      return [labels.aiLoadingPlanExecuting];
    case "tool":
      return [labels.aiLoadingTool];
    default:
      return [labels.aiLoadingChat];
  }
}
