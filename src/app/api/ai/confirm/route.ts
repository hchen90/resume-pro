import { NextResponse } from "next/server";

import {
  createPendingArtifactFromProposal,
  transitionArtifactStatus,
} from "@/lib/ai/change-artifact";
import {
  createDefaultAiChatSession,
  normalizeAiChatSession,
  resumeToSaveInput,
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
import { commitWorkspaceChanges, readWorkspaceStatus } from "@/lib/workspace/ensure";
import {
  getAiChangeArtifactByProposalId,
  saveAiChangeArtifact,
  setArtifactCommitHash,
  writeAiChangeUpdateDocument,
} from "@/lib/workspace/ai-artifact-store";

export const runtime = "nodejs";

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
      try {
        const existing = await getAiChangeArtifactByProposalId(
          input.resumeId,
          proposal.proposalId,
        );
        if (existing && existing.status === "pending") {
          await saveAiChangeArtifact(
            transitionArtifactStatus(existing, "rejected"),
          );
        }
      } catch {
        // Artifact dual-write must not block reject.
      }

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
        session: toClientSession(saved),
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
    const beforeSnapshot = resumeToSaveInput(input.resumeSnapshot);

    // Persist artifact + update doc before saveResume so workspace Git includes them.
    let appliedArtifactId = proposal.proposalId;
    try {
      const existing =
        (await getAiChangeArtifactByProposalId(
          input.resumeId,
          proposal.proposalId,
        )) ??
        createPendingArtifactFromProposal({
          proposal,
          beforeSnapshot,
          afterSnapshot: saveInput,
        });
      const applied = transitionArtifactStatus(
        {
          ...existing,
          beforeSnapshot: existing.beforeSnapshot ?? beforeSnapshot,
        },
        "applied",
        { afterSnapshot: saveInput },
      );
      await saveAiChangeArtifact(applied);
      await writeAiChangeUpdateDocument(applied);
      appliedArtifactId = applied.id;
    } catch {
      // Artifact dual-write must not block confirm.
    }

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
        undoSnapshot: beforeSnapshot,
        redoSnapshot: null,
        messages: [
          ...session.messages,
          {
            role: "assistant",
            content: `${t.aiProposalApplied}\n\n${t.aiUndoHint}`,
          },
        ],
      },
      intro,
    );
    const saved = await saveAiChatSession(input.resumeId, nextSession, intro);

    let commitHash: string | null = null;
    try {
      const status = await readWorkspaceStatus();
      commitHash = status.headSha;
      if (commitHash) {
        await setArtifactCommitHash({
          resumeId: input.resumeId,
          artifactId: appliedArtifactId,
          commitHash,
        });
      }
      // Session + artifact hash live under `ai/`; commit them so git status is
      // clean after apply (UI dirty checks still ignore `ai/` for chat churn).
      await commitWorkspaceChanges({
        hint: `Record AI change ${appliedArtifactId}`,
        useAi: false,
      });
    } catch {
      // Confirm already succeeded; leftover ai/ dirt must not fail the request.
    }

    return NextResponse.json({
      ok: true,
      decision: "confirm",
      resume: updatedResume,
      session: toClientSession(saved),
      patches: validated.patches,
      artifactId: appliedArtifactId,
      commitHash,
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
