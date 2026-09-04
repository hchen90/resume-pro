## Why

AI chat sessions still live in SQLite/Postgres while resumes/JDs already use the
workspace. Users need session history next to resume documents, plus an explicit
one-click CLI to migrate any remaining database data into the workspace.

## What Changes

- Persist AI chat sessions under `resumes/<id>/ai/session.json` in the workspace
  (no DB writes for sessions).
- Extend DB→workspace migration to include AI sessions.
- Add `npm run workspace:migrate` helper script for one-shot migration (with
  optional `--force`).
- Document that `DATABASE_PROVIDER` is only needed for migration from a legacy
  database, not for normal editing.

## Capabilities

### New Capabilities

- `workspace-ai-sessions`: AI chat session history stored in the workspace per
  resume.
- `workspace-migrate-cli`: CLI to migrate database resumes, JDs, and AI sessions
  into the workspace.

### Modified Capabilities

None.

## Impact

- `src/lib/db/ai-chat-repository.ts`, `src/lib/workspace/**`
- `scripts/migrate-db-to-workspace.mjs`, `package.json`
- Docs: `docs/workspace.md`, `docs/database.md`, `docs/ai.md`, `.env.example`,
  README
