## 1. Documentation (iteration plan)

- [x] 1.1 Add `docs/workspace.md` describing workspace layout, Markdown/JSON roles, isomorphic-git save/commit, dirty/clean UI, and DB retirement; verify linked from `docs/README.md` and `AGENTS.md`
- [x] 1.2 Update `docs/overview.md`, `docs/database.md`, `README.md` to mark DB document storage as retiring in favor of workspace; verify wording matches proposal **BREAKING** note
- [x] 1.3 Update `docs/ai.md` iteration plan and `plan-ai-change-artifacts-diff-git` design/proposal to point Git versioning at the workspace repo; verify cross-links resolve

## 2. Workspace folder + document I/O

- [x] 2.1 Add `WORKSPACE_PATH` (and Electron default) + layout bootstrap (`resumes/`, `jds/`, README); verify unit tests create expected dirs
- [x] 2.2 Implement resume read/write (`resume.json` + optional `meta.json` / `resume.md`); verify round-trip equals current `ResumeWithNodes` shape
- [x] 2.3 Implement JD read/write (`jd.md` + `meta.json`); verify list/get/save/delete against filesystem
- [x] 2.4 Replace resume/JD repository call sites (API + server actions) with workspace document layer behind a clear interface; verify existing HTTP contracts still work against workspace

## 3. isomorphic-git auto-commit + AI messages

- [x] 3.1 Add `isomorphic-git` dependency and workspace git helper (init, status, add, commit); verify init + commit test with temp dir
- [x] 3.2 Wire save paths to auto-commit after successful file writes; verify save creates a new HEAD commit
- [x] 3.3 Implement commit message from git diff via AI with deterministic fallback; verify fallback when AI key missing and success path when mocked

## 4. Dirty / clean UI

- [x] 4.1 Expose workspace status API (clean vs dirty + optional short hash); verify status flips after edit and after save
- [x] 4.2 Update resume (and JD if applicable) UI to show clean vs can-save and enable/disable primary save; verify i18n strings in all locales

## 5. Retire DB document storage + migration

- [x] 5.1 Implement one-shot migration from SQLite/Postgres resumes + JDs into workspace + initial commit; verify migrated files and commit exist
- [x] 5.2 Remove or no-op DB writes for resume/JD documents after cutover; verify no inserts/updates to `resumes` / `resume_nodes` / `job_descriptions` on save
- [x] 5.3 Align AI confirm/undo persistence with workspace write + commit (replace DB optimistic lock with workspace/HEAD checks as designed); verify confirm still applies patches and leaves a commit

## 6. Validation

- [x] 6.1 Extend Vitest coverage for workspace FS, git helpers, and migration; verify `npm run test` for touched suites
- [x] 6.2 Run `npx --yes @fission-ai/openspec@latest validate workspace-git-storage --strict` and keep docs aligned with shipped behavior
