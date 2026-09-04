## Why

Resume and JD data today live in SQLite/Postgres, which hides documents from
users, complicates Git-style versioning, and blocks the “workspace folder”
local-first model. We need a clear on-disk workspace (Markdown/JSON),
isomorphic-git versioning with AI commit messages, and a dirty/clean save UX—
retiring database-backed persistence for user documents.

## What Changes

- Introduce a **workspace folder** as the single source of truth for user data
  (resumes, job descriptions, and related docs). Layout MUST be clear and
  human-browsable.
- Persist documents as **Markdown and/or JSON** (and optional companion files)
  under that workspace—not opaque DB blobs.
- Use **isomorphic-git** to initialize the workspace repo, stage changes, and
  **auto-commit** on save. Commit messages MAY be **AI-generated from `git
  diff`** (with a deterministic fallback when AI is unavailable).
- UI: when the workspace has **no uncommitted changes**, mark it **clean**;
  otherwise show that the user **can save** (commit).
- **BREAKING**: Abolish using the application database to save resume/JD (and
  related user document) data. Repositories and APIs switch to workspace I/O;
  SQLite/Postgres persistence for those entities is retired (optional one-shot
  migration from existing DB into the workspace).
- Supersedes the storage half of `plan-ai-change-artifacts-diff-git` (dedicated
  AI-docs Git repo): versioning happens in the **workspace** Git history
  instead. AI before/after comparison remains a separate concern of that change.

## Capabilities

### New Capabilities

- `workspace-folder`: Workspace root layout and Markdown/JSON document storage
  for resumes, JDs, and related files.
- `workspace-isomorphic-git`: isomorphic-git init, add, commit; auto-commit on
  save; AI-assisted commit messages from diff.
- `workspace-save-status`: UI dirty/clean state driven by workspace Git status
  (clean vs can save).
- `retire-db-document-storage`: Stop persisting resume/JD user documents in the
  app database; migrate or drop DB-backed document saves.

### Modified Capabilities

None (no main `openspec/specs/` for storage yet).

## Impact

- **BREAKING** for anyone relying on `data/resume-pro.sqlite` / Postgres tables
  for resumes and JDs
- New deps: `isomorphic-git` (+ filesystem adapter, e.g. Node `fs`)
- `src/lib/db/**` repositories → workspace document layer
- `src/app/api/resumes/**`, job-match JD APIs, AI confirm/undo persistence
- UI save button / status in `resume-workspace` and related surfaces
- Docs: `docs/overview.md`, `docs/database.md` (deprecate/rename), new
  `docs/workspace.md`, `README.md`, `AGENTS.md`, prior AI iteration notes
- Electron: workspace path under `~/.resume-pro/workspace` (or user-chosen)
