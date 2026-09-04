## Context

See proposal.md — Why. Today AI Edit/Plan produces a `PendingPatchProposal`
stored on `ai_chat_sessions.pending_proposal`. Confirm applies patches via
`POST /api/ai/confirm`; undo restores a one-shot `agent_state.undoSnapshot`.
Review UI (`ai-proposal-review.tsx`) shows summary counts only. Resume data
lives in SQLite/Postgres; there is no Git history for AI updates and no commit
hash in the UI.

Constraints: local-first app; patches still validate through `patch.ts` +
`patch-validate.ts`; AgentScope stays server-side; confirmation remains
required before persist.

## Goals / Non-Goals

**Goals:**

- Model AI changes as durable **生成产物** (artifacts) with status and identity.
- Expose before/after comparison for pending and historical AI changes.
- Store AI update documentation locally; version those docs with Git; show
  commit hashes in the assistant / history UI.
- Land docs iteration plan first so product intent is reviewable before code.

**Non-Goals:**

- Replacing chat transcript storage or AgentScope skills.
- Remote Git hosting / multi-user collaboration for resume repos (local Git
  only in the first iteration).
- Automatic apply without user confirmation.
- Full line-level HTML preview diff of rendered templates (structured/
  content-level comparison is enough for v1).

## Decisions

### 1. Artifact model over “proposal-only”

- **Decision**: Introduce an `AiChangeArtifact` (or equivalent) with id, resume
  id, proposal id, status (`pending` | `applied` | `rejected` | `undone`),
  before snapshot ref, after snapshot ref (when applied), patches, summary,
  timestamps, and optional Git commit hash.
- **Why**: Makes AI output a product object, not only chat session JSON.
- **Alternatives**: Keep enriching `pending_proposal` only — insufficient for
  history and Git linkage.

### 2. Before/after comparison

- **Decision**: On `proposal_ready` / artifact create, capture a before resume
  snapshot (or hash + materialize on demand). Diff UI shows per-node/field
  before vs after by dry-running patches; after confirm, history reuses stored
  before/after.
- **Why**: Users need reference comparison, not only counts.
- **Alternatives**: Side-by-side rendered HTML preview only — heavier and
  template-coupled; can be a later enhancement.

### 3. Local docs + Git versioning

- **Decision (updated):** Do **not** create a separate AI-only Git repo. Persist
  AI-related files under the **workspace** (`workspace-git-storage` /
  `docs/workspace.md`) and use **isomorphic-git** workspace commits for
  versioning and commit-hash UI. Artifacts may store the workspace commit SHA.
- **Why**: User direction superseded dedicated AI Git with a unified workspace.
- **Alternatives**: Dedicated AI-docs repo — superseded.

### 4. Iteration sequencing

- **Decision**: Phase docs + OpenSpec first; workspace storage cutover
  (`workspace-git-storage`) before or with Git hash display; then artifacts +
  diff UI on workspace files. Keep existing confirm/undo until workspace
  history can replace one-shot undo (undo may remain as a convenience).
- **Why**: Reduces risk; storage foundation must land first.

## Risks / Trade-offs

- [Workspace Git unavailable] → isomorphic-git is in-process; degrade only if
  FS fails — see workspace change.
- [Snapshot storage size] → Store compact JSON snapshots or content-addressed
  blobs under the resume folder; prune older than N versions per resume.
- [Electron vs web paths] → Use shared `WORKSPACE_PATH` resolution.
- [Confusion with product repo Git] → Workspace `.git` is under the data
  workspace, never the application source tree.

## Migration Plan

1. Document plans (`docs/ai.md`, `docs/workspace.md`).
2. Land workspace FS + isomorphic-git (`workspace-git-storage`).
3. Artifact persistence + before/after diff on workspace files.
4. Surface workspace commit hashes on AI apply history.
5. Optionally retire or narrow one-shot undo once history restore exists.

## Open Questions

- Whether rejected proposals create workspace commits or only applied ones.
- Exact on-disk layout for AI artifact sidecar files under `resumes/<id>/ai/`.
