import type { AiPlan, ResumePatch } from "@/lib/ai/patch";
import type { AiMode } from "@/lib/ai/types";
import type { ResumeWithNodes } from "@/lib/resume/types";

export const assistantStreamEventTypes = [
  "run_started",
  "text_delta",
  "thinking_delta",
  "tool_started",
  "tool_finished",
  "plan_ready",
  "proposal_ready",
  "error",
  "run_finished",
] as const;

export type AssistantStreamEventType = (typeof assistantStreamEventTypes)[number];

export type PatchProposalSummary = {
  createCount: number;
  updateCount: number;
  deleteCount: number;
  templateChange: string | null;
  affectedNodeIds: string[];
  affectedTitles: string[];
};

export type PendingPatchProposal = {
  proposalId: string;
  resumeId: string;
  mode: Extract<AiMode, "edit" | "plan">;
  message: string;
  patches: ResumePatch[];
  summary: PatchProposalSummary;
  snapshotHash: string;
  baseUpdatedAt: string;
  createdAt: string;
};

export type AssistantStreamEvent =
  | {
      type: "run_started";
      runId: string;
      mode: AiMode;
      action: "send" | "execute_plan";
    }
  | {
      type: "text_delta";
      runId: string;
      delta: string;
    }
  | {
      type: "thinking_delta";
      runId: string;
      delta: string;
    }
  | {
      type: "tool_started";
      runId: string;
      toolName: string;
      toolCallId: string;
    }
  | {
      type: "tool_finished";
      runId: string;
      toolName: string;
      toolCallId: string;
      ok: boolean;
    }
  | {
      type: "plan_ready";
      runId: string;
      plan: AiPlan;
      message: string;
    }
  | {
      type: "proposal_ready";
      runId: string;
      proposal: PendingPatchProposal;
    }
  | {
      type: "error";
      runId: string;
      message: string;
      fatal?: boolean;
    }
  | {
      type: "run_finished";
      runId: string;
      cancelled?: boolean;
      resume?: ResumeWithNodes;
    };

export function encodeAssistantEvent(event: AssistantStreamEvent) {
  return `${JSON.stringify(event)}\n`;
}
