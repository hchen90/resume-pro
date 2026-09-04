## Context

See proposal.md — Why. Today `saveResume` / JD repositories write SQLite or
Postgres. AI confirm uses DB optimistic locks and `undoSnapshot`. There is no
user-visible document tree and no isomorphic-git workspace.

Prior plan `plan-ai-change-artifacts-diff-git` assumed a dedicated AI-docs Git
repo beside the DB. **Superseded for storage:** use the workspace Git repo from
`workspace-git-storage` / `docs/workspace.md`. This change still owns before/
after comparison UX; commits and hashes come from the workspace.

## Goals / Non-Goals

**Goals:**

- Clear workspace directory layout (resumes, jds, optional ai/meta).
- Documents readable as Markdown and/or JSON on disk.
- isomorphic-git for init + auto-commit; AI commit messages from diff when
  configured.
- Dirty/clean UI from Git status.
- Retire DB as the store for resume/JD documents.

**Non-Goals:**

- Remote remotes / push-pull collaboration in v1 (local Git only).
- Replacing AgentScope or the patch confirm protocol (confirm still applies
  patches, then writes workspace files + commits).
- Keeping Postgres/SQLite dual-backend for document data after cutover.
- Storing secrets or API keys inside the workspace Git repo.

## Decisions

### 1. Workspace root and layout

- **Decision**: One workspace root (env `WORKSPACE_PATH`, default
  `./data/workspace`; Electron `~/.resume-pro/workspace`). Suggested tree:

```text
workspace/
  README.md                 # human orientation
  resumes/
    <resume-id>/
      resume.json           # canonical structured resume (nodes, template, …)
      resume.md             # optional human-readable projection
      meta.json             # title, timestamps, templateId mirrors
  jds/
    <jd-id>/
      jd.md                 # primary JD text (Markdown)
      meta.json             # title, timestamps
  .git/                     # isomorphic-git repository
```

- **Why**: Clear separation; JSON for app fidelity; Markdown for JD and optional
  resume readability.
- **Alternatives**: Flat files only — harder to attach meta; one file per resume
  without folders — less extensible for AI artifacts later.

### 2. Canonical format

- **Decision**: Resume **canonical** form is `resume.json` (same shape as
  today’s `ResumeWithNodes` / save payload). `resume.md` is a generated or
  synced projection when useful. JD **canonical** form is `jd.md` with
  `meta.json` for title/id.
- **Why**: App already validates JSON structures; Markdown suits JD prose.
- **Alternatives**: Markdown-only resumes — loses structured nodes without a
  heavy parser.

### 3. isomorphic-git (not system `git`)

- **Decision**: Use `isomorphic-git` with Node `fs` for init, status, add,
  commit. No dependency on a system Git binary for core save.
- **Why**: Matches user request; works in Electron/Node; portable.
- **Alternatives**: shell out to `git` — brittle on Windows / packaged apps.

### 4. Save = write files + auto-commit

- **Decision**: Explicit user **Save** (and successful AI confirm apply) writes
  files then stages + commits via isomorphic-git. Autosave-to-disk without
  commit MAY exist later; v1 keep “Save” = commit so dirty state is meaningful.
- **Commit message**: Prefer AI summary of `git.diff` / status; fallback
  template e.g. `Update resume <title>` / `Update JD <title>`.
- **Author**: fixed local identity (e.g. `Resume Pro <resume-pro@local>`).

### 5. Dirty / clean UI

- **Decision**: `status` via isomorphic-git: if no unstaged/untracked/staged
  changes relative to HEAD → **clean**; else → **can save** (dirty). Saving
  when dirty commits; when clean, Save is disabled or shows clean.
- **Why**: Matches “全部提交界面标记工作区干净，否则标记可以保存”.

### 6. Retire database document storage

- **Decision**: After cutover, resume/JD CRUD does not read/write SQL tables.
  One-shot migration: export existing DB rows into workspace files + initial
  commit, then stop using those tables (drop or leave unused). Settings /
  ephemeral caches MAY remain elsewhere if needed; AI chat session storage
  moves to workspace files under the resume folder (e.g. `ai/session.json`) in
  the same cutover or a follow-up task in this change.
- **Why**: User asked to abolish DB-saved document data.
- **Alternatives**: Dual-write forever — rejected.

### 7. Relationship to `plan-ai-change-artifacts-diff-git`

- **Decision**: Git versioning + commit hash UI for AI changes use **workspace
  commits**. Before/after artifact comparison remains in that change but stores
  snapshots as workspace files when implemented. Update that change’s docs to
  point here for storage.

## Risks / Trade-offs

- [Large JSON diffs / noisy commits] → Pretty-print stable key order; avoid
  rewriting untouched files.
- [AI commit message latency] → Timeout + fallback message; never block forever.
- [Concurrent editors] → File mtime / HEAD hash checks replace DB
  `updatedAt` optimistic lock.
- [Migration data loss] → Migration dry-run + backup copy of sqlite before
  cutover.
- [Electron path sandbox] → Resolve workspace under user data dir; document in
  electron.md.

## Migration Plan

1. Document iteration plan (`docs/workspace.md` + overview/database updates).
2. Implement workspace FS + isomorphic-git layer behind a feature flag or new
   repository interface.
3. Migrate existing DB → workspace; initial commit.
4. Switch APIs/UI to workspace; mark DB document repos deprecated/removed.
5. Align AI confirm/undo with workspace write + commit; update prior AI plan.

## Open Questions

- Whether AI chat transcripts live under each resume folder in v1 or a later
  slice (default in tasks: include under `resumes/<id>/ai/`).
- Whether users may choose an arbitrary workspace path in Settings in v1
  (default: env + Electron path only).
