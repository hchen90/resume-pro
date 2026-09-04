# Workspace

Local source of truth for resume and job-description documents. Versioned with
**isomorphic-git** inside the folder. OpenSpec change:
[`workspace-git-storage`](../openspec/changes/workspace-git-storage/).

## Layout

```text
workspace/                    # WORKSPACE_PATH (default ./data/workspace;
                              # Electron ~/.resume-pro/workspace)
  README.md
  resumes/
    <resume-id>/
      resume.json             # canonical structured resume
      resume.md               # Markdown projection
      meta.json               # title, timestamps, templateId
      ai/
        session.json          # AI chat session (not counted in dirty UI)
        artifacts/<id>.json   # AI change artifacts
        changes/<id>.md       # AI update docs written on apply
  jds/
    <jd-id>/
      jd.md                   # primary JD content (Markdown)
      meta.json
  .git/                       # isomorphic-git repository
  .resume-pro-migrated        # one-shot DB → workspace migration marker
```

## Behavior

| Action | Behavior |
|--------|----------|
| First use | Create layout, `git init`, migrate DB documents + AI sessions once, initial commit |
| Save / AI confirm apply | Write resume/JD files → stage → **auto-commit**; AI artifacts + change docs under `ai/` are included when present |
| AI chat session | Write `ai/session.json` immediately (no per-message commit); ignored for dirty/clean UI |
| AI change artifact | Dual-write under `ai/artifacts/`; on apply also write `ai/changes/<id>.md` and store workspace commit SHA |
| CLI migrate | `npm run workspace:migrate` (`--force` to re-export from DB) |
| UI | Dirty edits or unclean Git (excluding `ai/`) → **can save**; after commit → **clean** + short hash |

| Status API | `GET /api/workspace/status` → `{ clean, headSha, shortHash, dirtyFileCount }` (`ai/` excluded from dirty) |

Resume/JD/**AI session** repositories under `src/lib/db/*-repository.ts` now
delegate to `src/lib/workspace/*` and no longer write those rows to
SQLite/Postgres. `DATABASE_PROVIDER` is only required when running
`npm run workspace:migrate` against a legacy database.

## Key files

| Path | Role |
|------|------|
| `src/lib/workspace/paths.ts` | `WORKSPACE_PATH` resolution |
| `src/lib/workspace/layout.ts` | Folder bootstrap |
| `src/lib/workspace/resume-store.ts` / `jd-store.ts` | Document I/O |
| `src/lib/workspace/ai-session-store.ts` | AI chat session I/O |
| `src/lib/workspace/ai-artifact-store.ts` | AI change artifact + update-doc I/O |
| `src/lib/workspace/git.ts` | isomorphic-git init/status/commit |
| `src/lib/workspace/commit-message.ts` | AI / fallback messages |
| `src/lib/workspace/migrate.ts` | DB → workspace export |
| `scripts/migrate-db-to-workspace.ts` | One-click CLI (`npm run workspace:migrate`) |
| `src/lib/workspace/ensure.ts` | Ensure + commit helpers |
| `src/app/api/workspace/status/route.ts` | Dirty/clean API |

## Related

- AI artifacts / before-after diff:
  [`plan-ai-change-artifacts-diff-git`](../openspec/changes/plan-ai-change-artifacts-diff-git/)
  (artifacts + docs under `ai/`; Git history is this workspace).
- Legacy schema notes: [database.md](./database.md)
