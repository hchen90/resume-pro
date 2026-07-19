## Context

Fixes landed for AI confirm item mutations and year-only date display. Some unit tests exist; gaps remain around regression cases (upsert keeps omitted items), English intent keywords, prompt contracts, and i18n placeholders.

## Goals / Non-Goals

**Goals:**

- Cover apply + validate + prompt contracts for the AI confirm fix.
- Cover year-only date persistence and locale placeholders for the date display fix.

**Non-Goals:**

- Adding React Testing Library / jsdom component suites in this change.
- Changing production patch semantics.

## Decisions

1. Prefer pure unit tests in existing `src/lib/**/*.test.ts` files.
2. Encode the date-display contract via patch apply + i18n keys rather than mounting `NodeEditor`.

## Risks / Trade-offs

- [Risk] UI wiring of placeholders untested in RTL → Mitigation: workspace already passes `t.itemDatePlaceholder`; i18n presence tested for all locales.
