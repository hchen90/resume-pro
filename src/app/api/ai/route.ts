import { NextResponse } from "next/server";
import { z } from "zod";

import { summarizeResume } from "@/lib/ai/context";
import { createChatModel, hasAiConfiguration } from "@/lib/ai/model";
import {
  aiEditResponseSchema,
  aiPlanResponseSchema,
  aiPlanSchema,
  applyResumePatches,
  extractJsonResponse,
} from "@/lib/ai/patch";
import {
  approvedPlanExecutionPrompt,
  systemPromptForMode,
  userPrompt,
} from "@/lib/ai/prompts";
import { aiModes } from "@/lib/ai/types";
import { getResume, saveResume } from "@/lib/db/resume-repository";
import { dictionaries, locales, resolveLocale } from "@/lib/i18n";

export const runtime = "nodejs";

const aiRequestSchema = z.object({
  resumeId: z.string(),
  selectedNodeId: z.string().optional(),
  mode: z.enum(aiModes),
  action: z.enum(["send", "execute_plan"]).default("send"),
  locale: z.enum(locales).optional(),
  message: z.string().min(1),
  plan: aiPlanSchema.optional(),
});

export async function POST(request: Request) {
  const input = aiRequestSchema.parse(await request.json());
  const locale = resolveLocale(input.locale);
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

    const result = await model.invoke([
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
    ]);
    const content = stringifyModelContent(result.content);
    const parsed = aiEditResponseSchema.parse(
      JSON.parse(extractJsonResponse(content)),
    );
    const saveInput = applyResumePatches(resume, parsed.patches);
    const updatedResume = await saveResume(resume.id, saveInput);

    return NextResponse.json({
      message: parsed.message,
      patches: parsed.patches,
      resume: updatedResume,
    });
  }

  const result = await model.invoke([
    { role: "system", content: systemPromptForMode(input.mode, locale) },
    {
      role: "user",
      content: userPrompt({
        message: input.message,
        resumeContext: summarizeResume(resume, input.selectedNodeId),
      }),
    },
  ]);
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

  const parsed = aiEditResponseSchema.parse(
    JSON.parse(extractJsonResponse(content)),
  );
  const saveInput = applyResumePatches(resume, parsed.patches);
  const updatedResume = await saveResume(resume.id, saveInput);

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
