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

- **Decision**: Persist human-readable update records as local documents (e.g.
  under app data dir / Electron `~/.resume-pro/` or a per-resume docs folder),
  with metadata also in SQLite for query. On apply (and optionally reject),
  create a Git commit in a dedicated local repo (or per-resume repo) and store
  the commit SHA on the artifact. UI shows abbreviated hash (with full hash on
  hover/copy).
- **Why**: Matches “本地化文档数据存储 + Git 版本记录 + 界面显示提交哈希”.
- **Alternatives**: DB-only versioning without Git — fails the Git/hash
  requirement; using the product source repo — pollutes app development history.

### 4. Iteration sequencing

- **Decision**: Phase docs + OpenSpec first; then artifacts + diff UI; then Git
  commit pipeline + hash display. Keep existing confirm/undo until Git-backed
  history can replace one-shot undo (undo may remain as a convenience).
- **Why**: Reduces risk; current confirm path stays trustworthy.

## Risks / Trade-offs

- [Git availability on all platforms] → Detect `git` binary; degrade gracefully
  (store docs without commit, show “Git unavailable”) rather than fail confirm.
- [Snapshot storage size] → Store compact JSON snapshots or content-addressed
  blobs; prune older than N versions per resume.
- [Electron vs web paths] → Centralize docs/Git root resolution in one module
  (mirror settings/AI env pattern).
- [Confusion with product repo Git] → Document clearly that AI change Git is a
  separate local data repository.

## Migration Plan

1. Document iteration plan in `docs/ai.md` (and cross-links).
2. Add artifact persistence alongside existing pending proposal (dual-write).
3. Ship diff UI using dry-run apply without requiring Git.
4. Add Git commit + hash display; backfill hashes only for new applies.
5. Optionally retire or narrow one-shot undo once history restore exists.

## Open Questions

- Single shared AI-changes Git repo vs one repo per resume.
- Whether rejected proposals create commits or only applied ones.
- Exact document format (Markdown vs JSON + Markdown summary).
