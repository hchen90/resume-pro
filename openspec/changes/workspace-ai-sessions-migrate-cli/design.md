## Context

See proposal.md. Workspace already stores resumes/JDs; AI sessions remain in
`ai_chat_sessions`. Auto-migration runs once via `.resume-pro-migrated` but there
is no user-facing CLI, and sessions are not migrated.

## Goals / Non-Goals

**Goals:** Session JSON under each resume; migrate sessions; CLI one-click migrate.

**Non-Goals:** Removing Drizzle packages entirely; remote sync; committing every
chat turn as its own Git commit.

## Decisions

1. **Path:** `resumes/<resume-id>/ai/session.json` (full normalized session payload
   including undoSnapshot).
2. **Save behavior:** Session writes update the file immediately; they do **not**
   auto-commit (avoids noisy commits / perpetual dirty UI). Resume/JD saves still
   commit the whole tree (including dirty session files). Dirty UI ignores paths
   under `ai/` so chatting alone does not force “can save”.
3. **CLI:** `npm run workspace:migrate` → script loads `.env`, runs migration with
   `--force` optional to re-export from DB even if marker exists (overwrite
   workspace docs from DB).
4. **DB:** Runtime AI chat no longer requires DB; migrate script still uses DB when
   present.

## Risks / Trade-offs

- [Force overwrite] → Document that `--force` replaces workspace files from DB.
- [Large undoSnapshot in session JSON] → Acceptable; same as DB agent_state.
