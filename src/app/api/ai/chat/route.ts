import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveAssistantHistoryConfig } from "@/lib/ai/assistant-history-config";
import { normalizeAiChatSession } from "@/lib/ai/chat-session";
import { compactChatSessionIfNeeded } from "@/lib/ai/compact-chat";
import { createSummaryChatModel, hasAiConfiguration } from "@/lib/ai/model";
import { aiPlanSchema } from "@/lib/ai/patch";
import { aiModes } from "@/lib/ai/types";
import {
  getAiChatSession,
  saveAiChatSession,
} from "@/lib/db/ai-chat-repository";
import { getResume } from "@/lib/db/resume-repository";
import { dictionaries, locales, resolveLocale } from "@/lib/i18n";

export const runtime = "nodejs";

const aiMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  aiMode: z.enum(aiModes).optional(),
  isError: z.boolean().optional(),
});

const aiChatSessionSchema = z.object({
  resumeId: z.string(),
  locale: z.enum(locales).optional(),
  mode: z.enum(aiModes),
  messages: z.array(aiMessageSchema),
  pendingPlan: z
    .object({
      originalMessage: z.string(),
      plan: aiPlanSchema,
    })
    .nullable(),
  selectedPlanStepIds: z.array(z.string()),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const resumeId = searchParams.get("resumeId");
  const locale = resolveLocale(searchParams.get("locale") ?? undefined);
  const intro = dictionaries[locale].aiIntro;

  if (!resumeId) {
    return new NextResponse("resumeId is required.", { status: 400 });
  }

  const resume = await getResume(resumeId);
  if (!resume) {
    return new NextResponse("Resume not found.", { status: 404 });
  }

  const stored = await getAiChatSession(resumeId, intro);
  const session = stored ?? normalizeAiChatSession(null, intro);

  return NextResponse.json({ session });
}

export async function PUT(request: Request) {
  let locale = resolveLocale(undefined);

  try {
    const input = aiChatSessionSchema.parse(await request.json());
    locale = resolveLocale(input.locale);
    const intro = dictionaries[locale].aiIntro;

    const resume = await getResume(input.resumeId);
    if (!resume) {
      return new NextResponse("Resume not found.", { status: 404 });
    }

    const existing = await getAiChatSession(input.resumeId, intro);
    const normalized = normalizeAiChatSession(
      {
        messages: input.messages,
        mode: input.mode,
        pendingPlan: input.pendingPlan,
        selectedPlanStepIds: input.selectedPlanStepIds,
        summary: existing?.summary ?? null,
      },
      intro,
    );

    const model = hasAiConfiguration() ? createSummaryChatModel() : null;
    const compacted = await compactChatSessionIfNeeded({
      session: normalized,
      introContent: intro,
      locale,
      resumeId: input.resumeId,
      model,
      historyConfig: resolveAssistantHistoryConfig(),
    });

    const saved = await saveAiChatSession(input.resumeId, compacted, intro);
    return NextResponse.json({ session: saved });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : dictionaries[locale].aiError;

    return NextResponse.json(
      { message: `${dictionaries[locale].aiError}: ${detail}` },
      { status: 400 },
    );
  }
}
