"use client";

import { useMemo } from "react";

import {
  buildAiChangeDiff,
  dryRunResumePatches,
  type AiChangeFieldDiff,
} from "@/lib/ai/change-diff";
import type { PendingPatchProposal } from "@/lib/ai/protocol";
import type { Dictionary } from "@/lib/i18n";
import type { ResumeWithNodes } from "@/lib/resume/types";

type AiProposalReviewProps = {
  proposal: PendingPatchProposal;
  resume: ResumeWithNodes;
  labels: Dictionary;
  isLoading: boolean;
  onConfirm: () => void;
  onReject: () => void;
};

function DiffList({
  diffs,
  labels,
}: {
  diffs: AiChangeFieldDiff[];
  labels: Dictionary;
}) {
  if (diffs.length === 0) {
    return (
      <p className="mt-2 text-xs text-[var(--app-muted)]">
        {labels.aiChangeEmptyDiff}
      </p>
    );
  }

  return (
    <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto text-xs leading-5">
      {diffs.map((diff) => (
        <li
          key={`${diff.nodeId ?? "root"}:${diff.field}:${diff.kind}`}
          className="rounded-md bg-[var(--app-surface)] p-2 ring-1 ring-[var(--app-border)]"
        >
          <p className="font-medium text-[var(--app-text)]">
            {diff.nodeTitle} · {diff.field}
          </p>
          <div className="mt-1 grid gap-1 sm:grid-cols-2">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-[var(--app-muted)]">
                {labels.aiChangeBefore}
              </p>
              <pre className="mt-0.5 whitespace-pre-wrap break-words text-[var(--app-muted)]">
                {diff.before ?? "—"}
              </pre>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-[var(--app-muted)]">
                {labels.aiChangeAfter}
              </p>
              <pre className="mt-0.5 whitespace-pre-wrap break-words text-[var(--app-text)]">
                {diff.after ?? "—"}
              </pre>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function AiProposalReview({
  proposal,
  resume,
  labels,
  isLoading,
  onConfirm,
  onReject,
}: AiProposalReviewProps) {
  const summaryLines = [
    proposal.summary.createCount > 0
      ? labels.aiPatchCreates(proposal.summary.createCount)
      : null,
    proposal.summary.updateCount > 0
      ? labels.aiPatchUpdates(proposal.summary.updateCount)
      : null,
    proposal.summary.deleteCount > 0
      ? labels.aiPatchDeletes(proposal.summary.deleteCount)
      : null,
    proposal.summary.templateChange
      ? labels.aiPatchTemplate(proposal.summary.templateChange)
      : null,
  ].filter(Boolean);

  const diffs = useMemo(() => {
    try {
      const { before, after } = dryRunResumePatches(resume, proposal.patches);
      return buildAiChangeDiff(before, after, {
        affectedNodeIds: proposal.summary.affectedNodeIds,
      });
    } catch {
      return [] as AiChangeFieldDiff[];
    }
  }, [proposal.patches, proposal.summary.affectedNodeIds, resume]);

  return (
    <div className="mt-4 rounded-lg border border-[var(--app-accent-border)] bg-[var(--app-accent-soft)] p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--app-accent)]">
        {labels.aiProposalReview}
      </p>
      <p className="mt-2 text-sm font-medium text-[var(--app-text)]">
        {proposal.message}
      </p>
      <ul className="mt-3 space-y-1 text-xs leading-5 text-[var(--app-muted)]">
        {summaryLines.map((line) => (
          <li key={line}>{line}</li>
        ))}
        {proposal.summary.affectedTitles.length > 0 ? (
          <li>{proposal.summary.affectedTitles.join(" · ")}</li>
        ) : null}
      </ul>
      <div className="mt-3">
        <p className="text-xs font-semibold text-[var(--app-text)]">
          {labels.aiChangeComparison}
        </p>
        <DiffList diffs={diffs} labels={labels} />
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className="flex flex-1 items-center justify-center rounded-md bg-[var(--app-primary)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--app-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {labels.aiConfirmProposal}
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={isLoading}
          className="rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-xs font-semibold text-[var(--app-muted)] transition hover:bg-[var(--app-muted-surface)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {labels.aiRejectProposal}
        </button>
      </div>
    </div>
  );
}

export { DiffList };
