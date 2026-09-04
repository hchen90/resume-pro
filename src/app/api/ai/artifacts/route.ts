import { NextResponse } from "next/server";
import { z } from "zod";

import { buildAiChangeDiff } from "@/lib/ai/change-diff";
import { abbreviateCommitHash } from "@/lib/ai/change-artifact";
import { ensureWorkspace } from "@/lib/workspace/ensure";
import {
  getAiChangeArtifact,
  listAiChangeArtifacts,
} from "@/lib/workspace/ai-artifact-store";

export const runtime = "nodejs";

const querySchema = z.object({
  resumeId: z.string().min(1),
  artifactId: z.string().min(1).optional(),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = querySchema.parse({
      resumeId: url.searchParams.get("resumeId") ?? "",
      artifactId: url.searchParams.get("artifactId") ?? undefined,
    });

    await ensureWorkspace();

    if (parsed.artifactId) {
      const artifact = await getAiChangeArtifact(
        parsed.resumeId,
        parsed.artifactId,
      );
      if (!artifact) {
        return new NextResponse("Artifact not found.", { status: 404 });
      }

      const diffs =
        artifact.beforeSnapshot && artifact.afterSnapshot
          ? buildAiChangeDiff(
              artifact.beforeSnapshot,
              artifact.afterSnapshot,
              { affectedNodeIds: artifact.summary.affectedNodeIds },
            )
          : [];

      return NextResponse.json({
        artifact: {
          ...artifact,
          shortCommitHash: artifact.commitHash
            ? abbreviateCommitHash(artifact.commitHash)
            : null,
        },
        diffs,
      });
    }

    const artifacts = await listAiChangeArtifacts(parsed.resumeId);
    return NextResponse.json({
      artifacts: artifacts.map((artifact) => ({
        id: artifact.id,
        proposalId: artifact.proposalId,
        status: artifact.status,
        mode: artifact.mode,
        message: artifact.message,
        summary: artifact.summary,
        commitHash: artifact.commitHash,
        shortCommitHash: artifact.commitHash
          ? abbreviateCommitHash(artifact.commitHash)
          : null,
        createdAt: artifact.createdAt,
        updatedAt: artifact.updatedAt,
        appliedAt: artifact.appliedAt,
        rejectedAt: artifact.rejectedAt,
        undoneAt: artifact.undoneAt,
      })),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Invalid request.";
    return NextResponse.json({ message: detail, error: true }, { status: 400 });
  }
}
