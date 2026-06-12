import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveAssistantHistoryConfig } from "@/lib/ai/assistant-history-config";
import { summarizeResume } from "@/lib/ai/context";
import { invokeChatModel } from "@/lib/ai/invoke";
import { createChatModel, hasAiConfiguration } from "@/lib/ai/model";
import {
  aiPlanResponseSchema,
  aiPlanSchema,
  applyResumePatches,
  extractJsonResponse,
  parseAiEditResponse,
} from "@/lib/ai/patch";
import {
  approvedPlanExecutionPrompt,
  systemPromptForMode,
  userPrompt,
} from "@/lib/ai/prompts";
import { aiModes } from "@/lib/ai/types";
import { getAiChatSession } from "@/lib/db/ai-chat-repository";
import { getResume, saveResume } from "@/lib/db/resume-repository";
import { dictionaries, locales, resolveLocale } from "@/lib/i18n";

export const runtime = "nodejs";

const aiMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const aiRequestSchema = z.object({
  resumeId: z.string(),
  selectedNodeId: z.string().optional(),
  mode: z.enum(aiModes),
  action: z.enum(["send", "execute_plan"]).default("send"),
  locale: z.enum(locales).optional(),
  message: z.string().min(1),
  messages: z.array(aiMessageSchema).optional(),
  plan: aiPlanSchema.optional(),
});

export async function POST(request: Request) {
  let locale = resolveLocale(undefined);

  try {
    const input = aiRequestSchema.parse(await request.json());
    locale = resolveLocale(input.locale);
    const t = dictionaries[locale];
    const resume = await getResume(input.resumeId);

    if (!resume) {
      return new NextResponse("Resume not found.", { status: 404 });
    }

    if (!hasAiConfiguration()) {
      return NextResponse.json({
        message: t.aiNotConfigured,
        patches: [],
      });
    }

    const model = createChatModel();

    if (input.mode === "plan" && input.action === "execute_plan") {
      if (!input.plan) {
        return new NextResponse("Plan is required before execution.", {
          status: 400,
        });
      }

      const result = await invokeChatModel(
        model,
        [
          { role: "system", content: systemPromptForMode("edit", locale) },
          {
            role: "user",
            content: approvedPlanExecutionPrompt({
              originalMessage: input.message,
              planSummary: input.plan.summary,
              steps: input.plan.steps,
              resumeContext: summarizeResume(resume, input.selectedNodeId),
            }),
          },
        ],
        {
          label: "plan:execute",
          resumeId: input.resumeId,
          mode: input.mode,
          action: input.action,
        },
      );

      return applyEditResponse({
        content: stringifyModelContent(result.content),
        resume,
        emptyMessage: t.aiEditNoChanges,
        parseErrorMessage: t.aiEditParseFailed,
      });
    }

    const storedChatSession =
      input.mode === "chat"
        ? await getAiChatSession(input.resumeId, t.aiIntro)
        : null;
    const summaryPrefix =
      storedChatSession?.summary && input.mode === "chat"
        ? [
            {
              role: "user" as const,
              content: `Earlier conversation summary:\n${storedChatSession.summary}`,
            },
          ]
        : [];
    const historyConfig = resolveAssistantHistoryConfig();
    const chatHistory =
      input.mode === "chat"
        ? (input.messages ?? []).slice(-historyConfig.contextMessages)
        : [];

    const result = await invokeChatModel(
      model,
      [
        { role: "system", content: systemPromptForMode(input.mode, locale) },
        ...summaryPrefix,
        ...chatHistory.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        {
          role: "user",
          content: userPrompt({
            message: input.message,
            resumeContext: summarizeResume(resume, input.selectedNodeId),
          }),
        },
      ],
      {
        label: input.mode,
        resumeId: input.resumeId,
        mode: input.mode,
        action: input.action,
      },
    );
    const content = stringifyModelContent(result.content);

    if (input.mode === "plan") {
      const parsed = aiPlanResponseSchema.parse(
        JSON.parse(extractJsonResponse(content)),
      );

      return NextResponse.json({
        message: parsed.message,
        patches: [],
        plan: parsed.plan,
      });
    }

    if (input.mode !== "edit") {
      return NextResponse.json({ message: content, patches: [] });
    }

    return applyEditResponse({
      content,
      resume,
      emptyMessage: t.aiEditNoChanges,
      parseErrorMessage: t.aiEditParseFailed,
    });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : dictionaries[locale].aiError;

    return NextResponse.json({
      message: `${dictionaries[locale].aiError}: ${detail}`,
      patches: [],
      error: true,
    });
  }
}

async function applyEditResponse(input: {
  content: string;
  resume: NonNullable<Awaited<ReturnType<typeof getResume>>>;
  emptyMessage: string;
  parseErrorMessage: string;
}) {
  let parsed;
  try {
    parsed = parseAiEditResponse(input.content, input.resume);
  } catch {
    return NextResponse.json({
      message: input.parseErrorMessage,
      patches: [],
    });
  }

  if (parsed.patches.length === 0) {
    return NextResponse.json({
      message: parsed.message || input.emptyMessage,
      patches: [],
    });
  }

  const saveInput = applyResumePatches(input.resume, parsed.patches);
  const updatedResume = await saveResume(input.resume.id, saveInput);

  return NextResponse.json({
    message: parsed.message,
    patches: parsed.patches,
    resume: updatedResume,
  });
}

function stringifyModelContent(content: unknown) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        if (
          part &&
          typeof part === "object" &&
          "text" in part &&
          typeof part.text === "string"
        ) {
          return part.text;
        }

        return JSON.stringify(part);
      })
      .join("\n");
  }

  return String(content ?? "");
}
