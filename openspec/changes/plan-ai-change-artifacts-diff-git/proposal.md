## Why

AI Edit/Plan today yields a transient `pending_proposal` (patch summary + confirm),
not a first-class **生成产物** (generated artifact). Review UI shows counts and
affected titles only—no before/after comparison. Confirmed applies keep a
one-shot undo snapshot in SQLite and have no Git-backed history or commit-hash
UI. Users cannot treat AI updates as versioned, comparable products.

## What Changes

- Treat confirmed (and optionally pending) AI resume mutations as **generated
  artifacts** with stable identity, metadata, and lifecycle—not only ephemeral
  chat proposals.
- Add **before/after reference comparison** for AI changes (structured field/
  node diff and/or dual preview) so users can judge patches before confirm and
  revisit them after apply.
- Persist AI update records in **local document data storage** (app DB / local
  files under the existing local-first model).
- Record versions with **Git commits** for those update documents; surface the
  short or full **commit hash in the UI** next to each AI change / version.
- Document the above as an **iteration plan** in module docs (`docs/ai.md` and
  related) before or alongside implementation.
- This change is planning-first: artifacts capture the roadmap; implementation
  tasks may ship in later apply passes.

**Supersession (storage):** Git versioning for user documents (including AI
applies) is now owned by OpenSpec `workspace-git-storage` / [docs/workspace.md](../../../docs/workspace.md)
(workspace folder + isomorphic-git). This change keeps **生成产物** identity and
**before/after diff** UX; do not invent a separate AI-only Git repo.

## Capabilities

### New Capabilities

- `ai-change-artifacts`: AI Edit/Plan outcomes are first-class generated
  artifacts with identity, status (pending / applied / rejected / undone), and
  linkage to resume + proposal.
- `ai-change-diff`: Users can compare resume (or node/field) state before vs
  after an AI change for confirm and history review.
- `ai-change-git-versioning`: AI update documentation is stored locally and
  versioned via Git; the UI displays the associated commit hash.

### Modified Capabilities

None (no main `openspec/specs/` capabilities exist yet for AI).

## Impact

- `docs/ai.md`, `docs/api.md`, `docs/database.md`, `docs/frontend.md` — iteration
  plan and eventual behavior docs
- Future: `src/lib/ai/**`, `src/app/api/ai/**`, `src/components/resume/ai-*`,
  chat/session repositories, possible local Git workspace for AI change docs
- Does not remove the existing patch confirm / one-shot undo path until the new
  model supersedes it
