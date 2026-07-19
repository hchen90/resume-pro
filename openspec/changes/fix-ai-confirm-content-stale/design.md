## Context

AI Edit/Plan proposals are confirmed via `POST /api/ai/confirm`, which validates patches, applies them with `applyResumePatches`, persists with `saveResume`, and returns the updated resume. The client calls `onResumeUpdated` to refresh workspace state. Users report confirmation success text while education content stays unchanged (duplicates remain, expected UTS entry / reorder missing).

Current `update_node` item semantics use upsert-merge (`mergeItemsPatch`): matching ids update, new ids append, omitted ids are kept. There is no item-delete or full-replace op. That may make “delete duplicate / reorder” proposals succeed without changing visible items.

## Goals / Non-Goals

**Goals:**

- Confirm root cause with runtime evidence (patches applied vs UI resume state).
- Make confirmed proposals produce the intended visible content when users confirm.
- Keep editor state in sync with the saved resume after confirm.

**Non-Goals:**

- Redesigning the full AI agent prompt or AgentScope adapter.
- Changing Job Match / LangChain flows.
- Auto-applying patches without user confirmation.

## Decisions

1. **Instrument before fixing** — Log proposal patches, pre/post education item summaries on confirm, client payload resume, and workspace update so we can distinguish merge-no-op vs UI stale vs empty patches.
2. **Root cause (DB evidence)** — Confirmed resume still contained both Hangzhou education items plus an appended UTS item. `mergeItemsPatch` only upserts; omitted ids are kept and order is not rewritten. Assistant narrative claimed delete/reorder that the patch engine could not perform.
3. **Minimal semantic fix** — Extend `update_node` with `removeItemIds` (explicit deletes) and `replaceItems: true` (full list replace/reorder). Keep default upsert for add/update. Update edit/plan prompts and docs so the agent encodes deletes correctly and does not claim success before confirm.
4. **Intent enforcement (hypothesis F)** — `propose_resume_patch` rejects proposals whose message claims delete/dedupe/reorder but patches lack `removeItemIds` / `replaceItems`, forcing the model to retry with expressible mutations.
5. **UI refresh stays replace-from-server** — Continue setting workspace resume from confirm response; logs did not show a missing `onResumeUpdated` path as the primary failure.

## Risks / Trade-offs

- [Risk] Changing item merge to replace could break “append one bullet” proposals → Mitigation: explicit replace/delete ops or clear agent tool docs + tests.
- [Risk] Debug logs in hot paths → Mitigation: remove after verified fix.

## Open Questions

- Does the confirmed proposal intend full item-list replacement, or only upserts?
- Is the assistant narrative (✅ delete/reorder) aligned with the actual `patches` array?
