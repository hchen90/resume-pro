# Workspace (iteration plan)

**Status:** Planned — OpenSpec change
[`workspace-git-storage`](../openspec/changes/workspace-git-storage/).
Not implemented yet. Until cutover, resumes and JDs still persist via
[database.md](./database.md).

## Goal

Make a **workspace folder** the single source of truth for user documents
(resumes, job descriptions), versioned with **isomorphic-git**. Abolish
database-backed saves for those documents after migration.

## Planned layout

```text
workspace/                    # WORKSPACE_PATH (default ./data/workspace;
                              # Electron ~/.resume-pro/workspace)
  README.md
  resumes/
    <resume-id>/
      resume.json             # canonical structured resume
      resume.md               # optional Markdown projection
      meta.json               # title, timestamps, templateId
      ai/                     # optional: session / artifacts (follow-up)
  jds/
    <jd-id>/
      jd.md                   # primary JD content (Markdown)
      meta.json
  .git/                       # isomorphic-git repository
```

Documents may be **Markdown**, **JSON**, or both; resumes use JSON as
canonical form for node fidelity; JDs use Markdown as canonical prose.

## Git and save UX

| Action | Behavior |
|--------|----------|
| First use | Create layout + `isomorphic-git` `init` |
| Save / AI confirm apply | Write files → stage → **auto-commit** |
| Commit message | AI summary of workspace **git diff** when AI configured; else deterministic fallback |
| UI clean | No uncommitted changes → mark workspace **clean** |
| UI dirty | Uncommitted changes → mark **can save**; enable primary save |

System `git` binary is **not** required for core save/commit.

## Database retirement

**BREAKING:** After migration, `resumes` / `resume_nodes` / `job_descriptions`
are no longer written for document durability. A one-shot export from existing
SQLite/Postgres into the workspace (+ initial commit) is part of the change.

## Relation to AI iteration plan

[`plan-ai-change-artifacts-diff-git`](../openspec/changes/plan-ai-change-artifacts-diff-git/)
still covers AI **生成产物** and before/after **diff** UX. Git versioning and
commit-hash display for AI applies are **folded into this workspace Git
history** (not a separate AI-only repo). See [ai.md](./ai.md#iteration-plan-not-yet-implemented).

## Specs / tasks

See the OpenSpec change `proposal.md`, `design.md`, `specs/*`, and `tasks.md`.
