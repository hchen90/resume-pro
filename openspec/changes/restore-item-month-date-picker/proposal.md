## Why

Restoring month date pickers after year-only AI dates forced a temporary switch to plain text inputs. Users want the native month selector back without blank fields when values are `YYYY`.

## What Changes

- Restore `type="month"` for multi-item start/end date fields.
- Coerce year-only values (`2020`) to month-input-compatible `2020-01` for display (and document the helper).
- Keep year-only and `YYYY-MM` both visible; picking a month still stores `YYYY-MM`.
- Add a persistent repository rule that semantic form controls (date/month, number, color, etc.) MUST NOT be downgraded to plain text merely to accommodate incompatible stored values; adapt or validate data while preserving the intended control.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `resume-item-dates`: date fields use month inputs again while still displaying year-only stored values via coercion

## Impact

- `src/lib/resume/format.ts` (+ tests)
- `src/components/resume/node-editor.tsx`
- Docs/prompts noting month picker + year coercion
- `.cursor/rules/resume-form-controls.mdc`
