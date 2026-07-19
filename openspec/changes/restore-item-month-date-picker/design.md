## Context

Plain text date inputs fixed blank year-only display but removed the native month picker. Users want picker UX back.

## Goals / Non-Goals

**Goals:**

- Restore `type="month"` pickers for experience/education/project item dates.
- Ensure year-only stored values still appear (via `YYYY` → `YYYY-01` for the control value).

**Non-Goals:**

- Building a custom dual year/month picker UI.

## Decisions

1. Add `toMonthInputValue()` that maps `^\d{4}$` → `${year}-01`, passes through `YYYY-MM`, and clears other invalid strings for the month control.
2. Bind month inputs to `toMonthInputValue(stored)`; on change, store the browser `YYYY-MM` string.
3. Preview continues to show stored strings via `itemDateRange` (year-only remains `2020 - 2022` until the user re-picks).
4. Add a file-scoped Cursor rule for resume form components: preserve semantic input types and solve data incompatibility through normalization, migration, validation, or an explicitly approved custom control. Any control-type change requires checking UX, accessibility, browser behavior, persistence, and regression tests.

## Risks / Trade-offs

- [Risk] Year-only displayed as January may look more precise than intended → Mitigation: common resume convention; user can re-pick the month.
