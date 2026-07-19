## Context

Multi-item editors use `<input type="month">`, which only accepts `YYYY-MM`. AI and many resumes store education dates as years (`2020`). Browsers treat year-only values as invalid and render blank controls even when React state/DB hold the string—so confirms look like they did not update.

## Goals / Non-Goals

**Goals:**

- Display year-only and `YYYY-MM` dates immediately in the editor after load or AI confirm.
- Keep preview/template rendering unchanged (already string-join based).

**Non-Goals:**

- Forcing all dates to month precision.
- Building a custom date picker widget.

## Decisions

1. Use `type="text"` for item start/end date fields with a locale placeholder (`YYYY` / `YYYY-MM`).
2. Prefer text over auto-coercing `2020` → `2020-01` for month inputs, to avoid rewriting user/AI year-only intent.
3. Optionally note accepted formats in AI edit prompts so models may still emit `YYYY-MM` when month precision is known.

## Risks / Trade-offs

- [Risk] Losing native month picker UX → Mitigation: placeholder documents formats; values remain free text as in templates.
