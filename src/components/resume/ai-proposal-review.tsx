"use client";

import type { PendingPatchProposal } from "@/lib/ai/protocol";
import type { Dictionary } from "@/lib/i18n";

type AiProposalReviewProps = {
  proposal: PendingPatchProposal;
  labels: Dictionary;
  isLoading: boolean;
  onConfirm: () => void;
  onReject: () => void;
};

export function AiProposalReview({
  proposal,
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
