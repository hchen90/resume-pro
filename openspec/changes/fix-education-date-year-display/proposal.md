## Why

After AI confirm saves education/experience dates as year-only values (e.g. `2020`), the editor still shows empty start/end fields. Users think the update failed even though the database already has the dates.

## What Changes

- Stop using HTML `type="month"` for multi-item date fields when values may be year-only (`YYYY`) or freeform.
- Show stored date strings immediately in the editor after AI confirm or load.
- Add a short placeholder hint (`YYYY` / `YYYY-MM`) in all locales.
- Document the accepted date formats for editors and AI patches.

## Capabilities

### New Capabilities

- `resume-item-dates`: Multi-item node date fields display and accept year-only and month precision values without blanking invalid month-input values.

### Modified Capabilities

- (none)

## Impact

- `src/components/resume/node-editor.tsx`
- `src/lib/i18n.ts` (placeholders)
- `docs/frontend.md` / resume-related notes if needed
- Optional AI prompt note on date formats
