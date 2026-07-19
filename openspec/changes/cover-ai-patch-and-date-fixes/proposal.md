## Why

Recent fixes for AI item delete/reorder and year-only date display need durable unit coverage so regressions (silent upsert, month-input blanking) are caught in CI.

## What Changes

- Expand Vitest coverage for `removeItemIds`, `replaceItems`, and `assertPatchMatchesMutationClaims`.
- Cover year-only date patch apply and locale date placeholders.
- Assert edit/plan prompts document delete/reorder/date formats.

## Capabilities

### New Capabilities

- (none — test-only change)

### Modified Capabilities

- `ai-confirm-apply`: add testable scenarios already required by the delta spec
- `resume-item-dates`: add testable scenarios for year-only date persistence/display contract

## Impact

- `src/lib/ai/patch.test.ts`, `patch-validate.test.ts`, `prompts.test.ts`
- New or extended i18n / resume format tests under `src/lib/`
