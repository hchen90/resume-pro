import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createDefaultAiChatSession,
  normalizeAiChatSession,
  resumeToSaveInput,
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
import { commitWorkspaceChanges } from "@/lib/workspace/ensure";
import { markLatestUndoneArtifactApplied } from "@/lib/workspace/ai-artifact-store";

export const runtime = "nodejs";

const redoRequestSchema = z.object({
  resumeId: z.string().min(1),
  locale: z.enum(locales).optional(),
  expectedUpdatedAt: z.string().min(1).optional(),
});

function toClientSession<
  T extends {
    undoSnapshot: unknown;
    redoSnapshot?: unknown;
    canUndo?: boolean;
    canRedo?: boolean;
  },
>(session: T) {
  const { undoSnapshot, redoSnapshot, ...rest } = session;
  return {
    ...rest,
    canUndo: undoSnapshot != null || session.canUndo === true,
    canRedo: redoSnapshot != null || session.canRedo === true,
  };
}

export async function POST(request: Request) {
  let locale = resolveLocale(undefined);

  try {
    const input = redoRequestSchema.parse(await request.json());
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

    if (!session.redoSnapshot) {
      return NextResponse.json(
        { message: t.aiRedoMissing, error: true },
        { status: 404 },
      );
    }

    if (
      input.expectedUpdatedAt &&
      storedResume.updatedAt !== input.expectedUpdatedAt
    ) {
      return NextResponse.json(
        {
          message: t.aiRedoConflict,
          error: true,
          code: "resume_conflict",
        },
        { status: 409 },
      );
    }

    const undoSnapshot = resumeToSaveInput(storedResume);

    let updatedResume;
    try {
      updatedResume = await saveResume(input.resumeId, session.redoSnapshot, {
        expectedUpdatedAt: input.expectedUpdatedAt ?? storedResume.updatedAt,
      });
    } catch (error) {
      if (error instanceof ResumeVersionConflictError) {
        return NextResponse.json(
          {
            message: t.aiRedoConflict,
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
        redoSnapshot: null,
        // Re-arm one-shot undo so the restored AI apply can be undone again.
        undoSnapshot,
        pendingProposal: null,
        messages: [
          ...session.messages,
          {
            role: "assistant",
            content: `${t.aiRedoApplied}\n\n${t.aiUndoHint}`,
          },
        ],
      },
      intro,
    );
    const saved = await saveAiChatSession(input.resumeId, nextSession, intro);

    try {
      await markLatestUndoneArtifactApplied(input.resumeId);
      await commitWorkspaceChanges({
        hint: `Redo AI change for ${input.resumeId}`,
        useAi: false,
      });
    } catch {
      // Artifact dual-write must not block redo.
    }

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
