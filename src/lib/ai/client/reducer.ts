import type { AiPendingPlan } from "@/lib/ai/chat-session";
import type {
  AssistantStreamEvent,
  PendingPatchProposal,
} from "@/lib/ai/protocol";
import type { AiMessage } from "@/lib/ai/types";

export type AssistantUiState = {
  runId: string | null;
  streamingText: string;
  thinkingText: string;
  activeToolName: string | null;
  pendingPlan: AiPendingPlan | null;
  selectedPlanStepIds: string[];
  pendingProposal: PendingPatchProposal | null;
  errorMessage: string | null;
  finished: boolean;
  cancelled: boolean;
};

export function createInitialAssistantUiState(
  partial?: Partial<AssistantUiState>,
): AssistantUiState {
  return {
    runId: null,
    streamingText: "",
    thinkingText: "",
    activeToolName: null,
    pendingPlan: null,
    selectedPlanStepIds: [],
    pendingProposal: null,
    errorMessage: null,
    finished: false,
    cancelled: false,
    ...partial,
  };
}

export function reduceAssistantStreamEvent(
  state: AssistantUiState,
  event: AssistantStreamEvent,
  originalMessage: string,
): AssistantUiState {
  switch (event.type) {
    case "run_started":
      return {
        ...createInitialAssistantUiState({
          pendingPlan: state.pendingPlan,
          selectedPlanStepIds: state.selectedPlanStepIds,
          pendingProposal: state.pendingProposal,
        }),
        runId: event.runId,
      };
    case "text_delta":
      return {
        ...state,
        streamingText: state.streamingText + event.delta,
      };
    case "thinking_delta":
      return {
        ...state,
        thinkingText: state.thinkingText + event.delta,
      };
    case "tool_started":
      return {
        ...state,
        activeToolName: event.toolName,
      };
    case "tool_finished":
      return {
        ...state,
        activeToolName: null,
      };
    case "plan_ready":
      return {
        ...state,
        pendingPlan: {
          originalMessage,
          plan: event.plan,
        },
        selectedPlanStepIds: event.plan.steps.map((step) => step.id),
        streamingText: state.streamingText || event.message,
      };
    case "proposal_ready":
      return {
        ...state,
        pendingProposal: event.proposal,
        streamingText: state.streamingText || event.proposal.message,
      };
    case "error":
      return {
        ...state,
        errorMessage: event.message,
      };
    case "run_finished":
      return {
        ...state,
        finished: true,
        cancelled: Boolean(event.cancelled),
        activeToolName: null,
      };
    default:
      return state;
  }
}

export function assistantMessageFromUiState(
  state: AssistantUiState,
  fallbackError: string,
): AiMessage | null {
  if (state.cancelled) {
    return null;
  }

  if (state.errorMessage && !state.streamingText) {
    return {
      role: "assistant",
      content: state.errorMessage,
      isError: true,
    };
  }

  if (state.streamingText.trim()) {
    // Keep a readable reply as a normal bubble even if a soft/mode error
    // arrived after streaming (e.g. edit mode without a patch proposal).
    return {
      role: "assistant",
      content: state.streamingText,
      isError: false,
    };
  }

  if (state.errorMessage) {
    return {
      role: "assistant",
      content: state.errorMessage || fallbackError,
      isError: true,
    };
  }

  return null;
}
