"use client";

import { useCallback, useEffect, useState } from "react";

import type { AiChangeArtifactStatus } from "@/lib/ai/change-artifact";
import type { AiChangeFieldDiff } from "@/lib/ai/change-diff";
import type { Dictionary } from "@/lib/i18n";

import { DiffList } from "./ai-proposal-review";

type ArtifactListItem = {
  id: string;
  status: AiChangeArtifactStatus;
  message: string;
  shortCommitHash: string | null;
  commitHash: string | null;
  updatedAt: string;
};

type AiChangeHistoryProps = {
  resumeId: string;
  labels: Dictionary;
  refreshKey?: number;
};

function statusLabel(status: AiChangeArtifactStatus, labels: Dictionary) {
  switch (status) {
    case "pending":
      return labels.aiChangeStatusPending;
    case "applied":
      return labels.aiChangeStatusApplied;
    case "rejected":
      return labels.aiChangeStatusRejected;
    case "undone":
      return labels.aiChangeStatusUndone;
    default:
      return status;
  }
}

export function AiChangeHistory({
  resumeId,
  labels,
  refreshKey = 0,
}: AiChangeHistoryProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ArtifactListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [diffs, setDiffs] = useState<AiChangeFieldDiff[]>([]);
  const [detailCommit, setDetailCommit] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    const response = await fetch(
      `/api/ai/artifacts?resumeId=${encodeURIComponent(resumeId)}`,
    );
    if (!response.ok) {
      setItems([]);
      return;
    }
    const payload = (await response.json()) as { artifacts: ArtifactListItem[] };
    setItems(
      (payload.artifacts ?? []).filter((item) => item.status !== "pending"),
    );
  }, [resumeId]);

  useEffect(() => {
    void loadList();
  }, [loadList, refreshKey]);

  useEffect(() => {
    if (!selectedId) {
      setDiffs([]);
      setDetailCommit(null);
      return;
    }

    let cancelled = false;
    void fetch(
      `/api/ai/artifacts?resumeId=${encodeURIComponent(resumeId)}&artifactId=${encodeURIComponent(selectedId)}`,
    )
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }
        return response.json() as Promise<{
          artifact: { commitHash: string | null; shortCommitHash: string | null };
          diffs: AiChangeFieldDiff[];
        }>;
      })
      .then((payload) => {
        if (cancelled || !payload) {
          return;
        }
        setDiffs(payload.diffs ?? []);
        setDetailCommit(
          payload.artifact.shortCommitHash ?? payload.artifact.commitHash,
        );
      })
      .catch(() => {
        if (!cancelled) {
          setDiffs([]);
          setDetailCommit(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [resumeId, selectedId]);

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="text-xs font-semibold text-[var(--app-accent)] underline-offset-2 hover:underline"
      >
        {open ? labels.aiChangeHideHistory : labels.aiChangeShowHistory}
      </button>
      {open ? (
        <div className="mt-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-muted-surface)] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--app-muted)]">
            {labels.aiChangeHistory}
          </p>
          {items.length === 0 ? (
            <p className="mt-2 text-xs text-[var(--app-muted)]">—</p>
          ) : (
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedId((current) =>
                        current === item.id ? null : item.id,
                      )
                    }
                    className="flex w-full items-start justify-between gap-2 rounded-md px-2 py-1.5 text-left hover:bg-[var(--app-surface)]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-[var(--app-text)]">
                        {item.message || item.id}
                      </span>
                      <span className="text-[var(--app-muted)]">
                        {statusLabel(item.status, labels)}
                        {item.shortCommitHash
                          ? ` · ${labels.aiChangeCommitHash} ${item.shortCommitHash}`
                          : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {selectedId ? (
            <div className="mt-3 border-t border-[var(--app-border)] pt-2">
              <p className="text-xs font-semibold text-[var(--app-text)]">
                {labels.aiChangeComparison}
                {detailCommit
                  ? ` · ${labels.aiChangeCommitHash} ${detailCommit}`
                  : ""}
              </p>
              <DiffList diffs={diffs} labels={labels} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
