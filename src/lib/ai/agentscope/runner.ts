import "server-only";

import { UserMsg } from "@agentscope-ai/agentscope/message";

import { createResumeAssistantAgent } from "@/lib/ai/agentscope/factory";
import { mapAgentScopeEvent } from "@/lib/ai/agentscope/map-events";
import { acquireResumeAssistantLock } from "@/lib/ai/agentscope/run-lock";
import { createAssistantRunContext } from "@/lib/ai/agentscope/run-context";
import { resolveAssistantHistoryConfig } from "@/lib/ai/assistant-history-config";
import { summarizeResume } from "@/lib/ai/context";
import {
  approvedPlanExecutionPrompt,
  userPrompt,
} from "@/lib/ai/prompts";
import {
  encodeAssistantEvent,
  type AssistantStreamEvent,
  type PendingPatchProposal,
} from "@/lib/ai/protocol";
import { hashResumeSnapshot } from "@/lib/ai/snapshot";
import type { AiMessage, AiMode } from "@/lib/ai/types";
import type { AiPlan } from "@/lib/ai/patch";
import type { Locale } from "@/lib/i18n";
import type { ResumeWithNodes } from "@/lib/resume/types";

export type AssistantRunnerInput = {
  resume: ResumeWithNodes;
  selectedNodeId?: string;
  mode: AiMode;
  action: "send" | "execute_plan";
  locale: Locale;
  message: string;
  historyMessages?: AiMessage[];
  historySummary?: string | null;
  plan?: AiPlan;
  signal: AbortSignal;
};

export type AssistantRunnerResult = {
  runId: string;
  assistantText: string;
  plan: AiPlan | null;
  planMessage: string | null;
  proposal: PendingPatchProposal | null;
  cancelled: boolean;
  errorMessage: string | null;
};

async function* runAssistantUnlocked(
  input: AssistantRunnerInput,
): AsyncGenerator<AssistantStreamEvent, AssistantRunnerResult> {
  const runId = crypto.randomUUID();
  const context = createAssistantRunContext({
    runId,
    resumeId: input.resume.id,
    resume: input.resume,
    selectedNodeId: input.selectedNodeId,
    mode: input.mode,
    action: input.action,
    locale: input.locale,
    snapshotHash: hashResumeSnapshot(input.resume),
    baseUpdatedAt: input.resume.updatedAt,
    signal: input.signal,
  });

  yield {
    type: "run_started",
    runId,
    mode: input.mode,
    action: input.action,
  };

  if (input.signal.aborted) {
    yield { type: "run_finished", runId, cancelled: true };
    return {
      runId,
      assistantText: "",
      plan: null,
      planMessage: null,
      proposal: null,
      cancelled: true,
      errorMessage: null,
    };
  }

  const historyConfig = resolveAssistantHistoryConfig();
  const history =
    input.mode === "chat"
      ? (input.historyMessages ?? []).slice(-historyConfig.contextMessages)
      : [];
  const historyText = history
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n\n");

  const approvedPlanText =
    input.mode === "plan" && input.action === "execute_plan" && input.plan
      ? approvedPlanExecutionPrompt({
          originalMessage: input.message,
          planSummary: input.plan.summary,
          steps: input.plan.steps,
        })
      : undefined;

  const prompt = userPrompt({
    message: input.message,
    resumeContext: summarizeResume(input.resume, input.selectedNodeId),
    historySummary: input.mode === "chat" ? input.historySummary : null,
    historyText: historyText || undefined,
    approvedPlanText,
  });

  const agent = createResumeAssistantAgent(context);
  let assistantText = "";
  let fatalError: string | null = null;

  try {
    const stream = agent.replyStream({
      msgs: UserMsg({
        name: "user",
        content: prompt,
      }),
    });

    while (true) {
      if (input.signal.aborted) {
        yield { type: "run_finished", runId, cancelled: true };
        return {
          runId,
          assistantText,
          plan: context.plan,
          planMessage: context.planMessage,
          proposal: null,
          cancelled: true,
          errorMessage: null,
        };
      }

      const next = await stream.next();
      if (next.done) {
        break;
      }

      const mapped = mapAgentScopeEvent(next.value, context);
      for (const event of mapped) {
        if (event.type === "text_delta") {
          assistantText += event.delta;
        }
        if (event.type === "error" && event.fatal) {
          fatalError = event.message;
        }
        yield event;
      }
    }
  } catch (error) {
    if (input.signal.aborted || (error instanceof Error && error.name === "AbortError")) {
      yield { type: "run_finished", runId, cancelled: true };
      return {
        runId,
        assistantText,
        plan: context.plan,
        planMessage: context.planMessage,
        proposal: null,
        cancelled: true,
        errorMessage: null,
      };
    }

    fatalError =
      error instanceof Error ? error.message : "Assistant run failed.";
    yield {
      type: "error",
      runId,
      message: fatalError,
      fatal: true,
    };
  }

  if (
    !fatalError &&
    (input.mode === "edit" ||
      (input.mode === "plan" && input.action === "execute_plan")) &&
    !context.proposal
  ) {
    fatalError =
      context.lastToolError ??
      "The assistant did not produce a valid patch proposal.";
    yield {
      type: "error",
      runId,
      message: fatalError,
      fatal: true,
    };
  }

  if (
    !fatalError &&
    input.mode === "plan" &&
    input.action === "send" &&
    !context.plan
  ) {
    fatalError =
      context.lastToolError ?? "The assistant did not produce a valid plan.";
    yield {
      type: "error",
      runId,
      message: fatalError,
      fatal: true,
    };
  }

  yield {
    type: "run_finished",
    runId,
    cancelled: false,
  };

  return {
    runId,
    assistantText,
    plan: context.plan,
    planMessage: context.planMessage,
    proposal: fatalError ? null : context.proposal,
    cancelled: false,
    errorMessage: fatalError,
  };
}

export async function* runResumeAssistant(
  input: AssistantRunnerInput,
): AsyncGenerator<AssistantStreamEvent, AssistantRunnerResult> {
  const release = await acquireResumeAssistantLock(input.resume.id);
  try {
    return yield* runAssistantUnlocked(input);
  } finally {
    release();
  }
}

export function createAssistantEventStream(
  input: AssistantRunnerInput,
  onFinished: (result: AssistantRunnerResult) => Promise<void> | void,
) {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const iterator = runResumeAssistant(input);
      try {
        while (true) {
          const next = await iterator.next();
          if (next.done) {
            try {
              await onFinished(next.value);
            } catch (persistError) {
              const message =
                persistError instanceof Error
                  ? persistError.message
                  : "Failed to persist assistant session.";
              controller.enqueue(
                encoder.encode(
                  encodeAssistantEvent({
                    type: "error",
                    runId: next.value.runId,
                    message,
                    fatal: false,
                  }),
                ),
              );
            }
            break;
          }
          controller.enqueue(encoder.encode(encodeAssistantEvent(next.value)));
        }
        controller.close();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Assistant stream failed.";
        controller.enqueue(
          encoder.encode(
            encodeAssistantEvent({
              type: "error",
              runId: "unknown",
              message,
              fatal: true,
            }),
          ),
        );
        controller.enqueue(
          encoder.encode(
            encodeAssistantEvent({
              type: "run_finished",
              runId: "unknown",
              cancelled: input.signal.aborted,
            }),
          ),
        );
        controller.close();
      }
    },
    cancel() {
      if (!input.signal.aborted) {
        // Best-effort: caller should abort the request signal.
      }
    },
  });
}
