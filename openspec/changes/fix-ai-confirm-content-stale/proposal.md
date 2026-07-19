## Why

After confirming an AI edit proposal, the assistant reports "Changes confirmed and saved," but the resume editor still shows the old education content (duplicate entries remain, expected reorder/new items missing). Users cannot trust AI confirmations.

## What Changes

- Diagnose why confirmed patches do not produce the visible content changes the assistant describes.
- Fix the confirm/apply/UI path so successful confirmation updates persisted resume content and the editor reflects it.
- Keep debug instrumentation only until runtime verification succeeds, then remove it.

## Capabilities

### New Capabilities

- `ai-confirm-apply`: Confirmed AI patch proposals must apply intended item-level mutations (including removals/reorders when proposed) and refresh the editor from the saved resume.

### Modified Capabilities

- (none — no existing main specs yet)

## Impact

- `src/app/api/ai/confirm/route.ts` — confirm/apply/persist path
- `src/lib/ai/patch.ts` — patch merge semantics for multi-item nodes
- `src/components/resume/ai-panel.tsx` / `resume-workspace.tsx` — client refresh after confirm
- Related Vitest coverage under `src/lib/ai/**`
