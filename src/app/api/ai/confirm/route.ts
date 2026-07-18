import { NextResponse } from "next/server";

import {
  createDefaultAiChatSession,
  normalizeAiChatSession,
} from "@/lib/ai/chat-session";
import { applyResumePatches } from "@/lib/ai/patch";
import { validateResumePatches } from "@/lib/ai/patch-validate";
import { aiConfirmRequestSchema } from "@/lib/ai/request-schema";
import { hashResumeSnapshot } from "@/lib/ai/snapshot";
import {
  getAiChatSession,
  saveAiChatSession,
} from "@/lib/db/ai-chat-repository";
import {
  getResume,
  ResumeVersionConflictError,
  saveResume,
} from "@/lib/db/resume-repository";
import { dictionaries, resolveLocale } from "@/lib/i18n";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let locale = resolveLocale(undefined);

  try {
    const input = aiConfirmRequestSchema.parse(await request.json());
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

    const session =
      (await getAiChatSession(input.resumeId, intro)) ??
      createDefaultAiChatSession(intro);

    const proposal = session.pendingProposal;
    if (!proposal || proposal.proposalId !== input.proposalId) {
      return NextResponse.json(
        { message: t.aiProposalMissing, error: true },
        { status: 404 },
      );
    }

    if (input.decision === "reject") {
      const nextSession = normalizeAiChatSession(
        {
          ...session,
          pendingProposal: null,
          messages: [
            ...session.messages,
            {
              role: "assistant",
              content: t.aiProposalRejected,
            },
          ],
        },
        intro,
      );
      const saved = await saveAiChatSession(input.resumeId, nextSession, intro);
      return NextResponse.json({
        ok: true,
        decision: "reject",
        session: saved,
      });
    }

    const snapshotHash = hashResumeSnapshot(input.resumeSnapshot);
    if (snapshotHash !== proposal.snapshotHash) {
      return NextResponse.json(
        {
          message: t.aiProposalConflict,
          error: true,
          code: "snapshot_conflict",
        },
        { status: 409 },
      );
    }

    if (storedResume.updatedAt !== proposal.baseUpdatedAt) {
      return NextResponse.json(
        {
          message: t.aiProposalConflict,
          error: true,
          code: "resume_conflict",
        },
        { status: 409 },
      );
    }

    const validated = validateResumePatches(
      input.resumeSnapshot,
      proposal.patches,
    );
    if (!validated.ok) {
      return NextResponse.json(
        {
          message: t.aiEditParseFailed,
          error: true,
          issues: validated.issues,
        },
        { status: 400 },
      );
    }

    const saveInput = applyResumePatches(input.resumeSnapshot, validated.patches);

    let updatedResume;
    try {
      updatedResume = await saveResume(input.resumeId, saveInput, {
        expectedUpdatedAt: proposal.baseUpdatedAt,
      });
    } catch (error) {
      if (error instanceof ResumeVersionConflictError) {
        return NextResponse.json(
          {
            message: t.aiProposalConflict,
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
        pendingProposal: null,
        pendingPlan: null,
        selectedPlanStepIds: [],
        messages: [
          ...session.messages,
          {
            role: "assistant",
            content: t.aiProposalApplied,
          },
        ],
      },
      intro,
    );
    const saved = await saveAiChatSession(input.resumeId, nextSession, intro);

    return NextResponse.json({
      ok: true,
      decision: "confirm",
      resume: updatedResume,
      session: saved,
      patches: validated.patches,
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
