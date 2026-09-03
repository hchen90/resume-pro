import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createDefaultAiChatSession,
  normalizeAiChatSession,
} from "@/lib/ai/chat-session";
import {
  getAiChatSession,
  saveAiChatSession,
} from "@/lib/db/ai-chat-repository";
import {
  getResume,
  ResumeVersionConflictError,
  saveResume,
} from "@/lib/db/resume-repository";
import { dictionaries, locales, resolveLocale } from "@/lib/i18n";

export const runtime = "nodejs";

const undoRequestSchema = z.object({
  resumeId: z.string().min(1),
  locale: z.enum(locales).optional(),
  expectedUpdatedAt: z.string().min(1).optional(),
});

function toClientSession<T extends { undoSnapshot: unknown; canUndo?: boolean }>(
  session: T,
) {
  const { undoSnapshot, ...rest } = session;
  return {
    ...rest,
    canUndo: undoSnapshot != null || session.canUndo === true,
  };
}

export async function POST(request: Request) {
  let locale = resolveLocale(undefined);

  try {
    const input = undoRequestSchema.parse(await request.json());
    locale = resolveLocale(input.locale);
    const t = dictionaries[locale];
    const intro = t.aiIntro;

    const storedResume = await getResume(input.resumeId);
    if (!storedResume) {
      return new NextResponse("Resume not found.", { status: 404 });
    }

    const session =
      (await getAiChatSession(input.resumeId, intro)) ??
      createDefaultAiChatSession(intro);

    if (!session.undoSnapshot) {
      return NextResponse.json(
        { message: t.aiUndoMissing, error: true },
        { status: 404 },
      );
    }

    if (
      input.expectedUpdatedAt &&
      storedResume.updatedAt !== input.expectedUpdatedAt
    ) {
      return NextResponse.json(
        {
          message: t.aiUndoConflict,
          error: true,
          code: "resume_conflict",
        },
        { status: 409 },
      );
    }

    let updatedResume;
    try {
      updatedResume = await saveResume(input.resumeId, session.undoSnapshot, {
        expectedUpdatedAt: input.expectedUpdatedAt ?? storedResume.updatedAt,
      });
    } catch (error) {
      if (error instanceof ResumeVersionConflictError) {
        return NextResponse.json(
          {
            message: t.aiUndoConflict,
            error: true,
            code: "resume_conflict",
          },
          { status: 409 },
        );
      }
      throw error;
    }

    const nextSession = normalizeAiChatSession(
      {
        ...session,
        undoSnapshot: null,
        pendingProposal: null,
        messages: [
          ...session.messages,
          {
            role: "assistant",
            content: t.aiUndoApplied,
          },
        ],
      },
      intro,
    );
    const saved = await saveAiChatSession(input.resumeId, nextSession, intro);

    return NextResponse.json({
      ok: true,
      resume: updatedResume,
      session: toClientSession(saved),
    });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : dictionaries[locale].aiError;

    return NextResponse.json(
      {
        message: `${dictionaries[locale].aiError}: ${detail}`,
        error: true,
      },
      { status: 400 },
    );
  }
}
