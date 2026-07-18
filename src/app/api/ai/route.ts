import { NextResponse } from "next/server";

import { createAssistantEventStream } from "@/lib/ai/agentscope/runner";
import { resolveAssistantHistoryConfig } from "@/lib/ai/assistant-history-config";
import {
  createDefaultAiChatSession,
  normalizeAiChatSession,
  type AiChatSession,
} from "@/lib/ai/chat-session";
import { compactChatSessionIfNeeded } from "@/lib/ai/compact-chat";
import { createSummaryChatModel, hasAiConfiguration } from "@/lib/ai/model";
import { encodeAssistantEvent } from "@/lib/ai/protocol";
import { aiRunRequestSchema } from "@/lib/ai/request-schema";
import type { AiMessage } from "@/lib/ai/types";
import {
  getAiChatSession,
  saveAiChatSession,
} from "@/lib/db/ai-chat-repository";
import { getResume } from "@/lib/db/resume-repository";
import { dictionaries, resolveLocale } from "@/lib/i18n";

export const runtime = "nodejs";

function ndjsonResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function notConfiguredStream(message: string) {
  const runId = crypto.randomUUID();
  return (
    encodeAssistantEvent({
      type: "run_started",
      runId,
      mode: "chat",
      action: "send",
    }) +
    encodeAssistantEvent({
      type: "text_delta",
      runId,
      delta: message,
    }) +
    encodeAssistantEvent({
      type: "run_finished",
      runId,
    })
  );
}

export async function POST(request: Request) {
  let locale = resolveLocale(undefined);

  try {
    const input = aiRunRequestSchema.parse(await request.json());
    locale = resolveLocale(input.locale);
    const t = dictionaries[locale];
    const intro = t.aiIntro;

    if (input.resumeSnapshot.id !== input.resumeId) {
      return new NextResponse("Resume snapshot id mismatch.", { status: 400 });
    }

    const storedResume = await getResume(input.resumeId);
    if (!storedResume) {
      return new NextResponse("Resume not found.", { status: 404 });
    }

    if (!hasAiConfiguration()) {
      return ndjsonResponse(notConfiguredStream(t.aiNotConfigured));
    }

    if (input.mode === "plan" && input.action === "execute_plan" && !input.plan) {
      return new NextResponse("Plan is required before execution.", {
        status: 400,
      });
    }

    const existingSession =
      (await getAiChatSession(input.resumeId, intro)) ??
      createDefaultAiChatSession(intro);

    const historyConfig = resolveAssistantHistoryConfig();
    const historyMessages =
      input.mode === "chat"
        ? (input.messages ?? []).slice(-historyConfig.contextMessages)
        : undefined;

    const stream = createAssistantEventStream(
      {
        resume: input.resumeSnapshot,
        selectedNodeId: input.selectedNodeId,
        mode: input.mode,
        action: input.action,
        locale,
        message: input.message,
        historyMessages,
        historySummary: existingSession.summary,
        plan: input.plan,
        signal: request.signal,
      },
      async (result) => {
        if (result.cancelled) {
          return;
        }

        const readableReply =
          result.assistantText.trim() ||
          result.planMessage ||
          result.proposal?.message ||
          "";
        const assistantContent =
          readableReply ||
          (result.errorMessage ? `${t.aiError}: ${result.errorMessage}` : "");

        const assistantMessage: AiMessage = {
          role: "assistant",
          content: assistantContent || t.aiError,
          // Only mark as error when there is no readable reply to show.
          isError: Boolean(result.errorMessage) && !readableReply,
        };

        const appendedMessages: AiMessage[] =
          input.action === "execute_plan"
            ? [assistantMessage]
            : [
                {
                  role: "user",
                  content: input.message,
                },
                assistantMessage,
              ];

        let nextSession: AiChatSession = normalizeAiChatSession(
          {
            ...existingSession,
            mode: input.mode,
            messages: [...existingSession.messages, ...appendedMessages],
            pendingPlan:
              result.plan && !result.errorMessage
                ? {
                    originalMessage: input.message,
                    plan: result.plan,
                  }
                : input.action === "execute_plan"
                  ? null
                  : existingSession.pendingPlan,
            selectedPlanStepIds:
              result.plan && !result.errorMessage
                ? result.plan.steps.map((step) => step.id)
                : input.action === "execute_plan"
                  ? []
                  : existingSession.selectedPlanStepIds,
            pendingProposal: result.errorMessage ? null : result.proposal,
            lastRunId: result.runId,
          },
          intro,
        );

        const model = hasAiConfiguration() ? createSummaryChatModel() : null;
        nextSession = await compactChatSessionIfNeeded({
          session: nextSession,
          introContent: intro,
          locale,
          resumeId: input.resumeId,
          model,
          historyConfig,
        });

        try {
          await saveAiChatSession(input.resumeId, nextSession, intro, {
            expectedSessionVersion: existingSession.sessionVersion,
          });
        } catch {
          await saveAiChatSession(input.resumeId, nextSession, intro);
        }
      },
    );

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : dictionaries[locale].aiError;

    return NextResponse.json(
      {
        message: `${dictionaries[locale].aiError}: ${detail}`,
        patches: [],
        error: true,
      },
      { status: 400 },
    );
  }
}
