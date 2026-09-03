## 1. Documentation (iteration plan)

- [x] 1.1 Add an Iteration plan section to `docs/ai.md` covering gaps vs current design (artifacts, before/after diff, local docs + Git hash UI) and link the OpenSpec change `plan-ai-change-artifacts-diff-git`; verify the section matches proposal/design
- [x] 1.2 Cross-link the iteration plan from `docs/api.md` and `docs/database.md` (brief “planned” notes only); verify links resolve

## 2. Artifact model

- [ ] 2.1 Define `AiChangeArtifact` types/status and persistence (DB and/or local docs index); verify unit tests for create/status transitions
- [ ] 2.2 Dual-write artifacts on `proposal_ready` / confirm / reject / undo without breaking existing pending proposal flow; verify confirm/reject/undo API tests still pass
- [ ] 2.3 Expose list/detail of artifacts per resume (API + minimal UI hook); verify list returns applied/rejected history after pending clears

## 3. Before/after comparison

- [ ] 3.1 Capture before snapshot (or reconstruct) and dry-run patches to produce after state for pending proposals; verify patch dry-run tests
- [ ] 3.2 Extend proposal review UI with before/after for affected nodes/fields; verify i18n strings exist in all locales
- [ ] 3.3 History detail reuses stored before/after for applied artifacts; verify applied artifact detail shows comparison

## 4. Local docs + Git versioning + hash UI

- [ ] 4.1 Resolve a dedicated local AI-changes docs root (web + Electron); verify path helpers with tests
- [ ] 4.2 Write update documents on apply; verify files exist under the local docs root
- [ ] 4.3 Init/commit in a dedicated local Git repo (not the product source repo); store commit hash on artifact; verify hash persisted when Git is available
- [ ] 4.4 Graceful degradation when Git is missing/fails (confirm still succeeds); verify confirm does not 500 on Git failure
- [ ] 4.5 Display abbreviated commit hash in assistant/history UI (full hash available); verify locale labels and visible hash after apply

## 5. Validation

- [ ] 5.1 Add/extend Vitest coverage for artifact lifecycle, diff building, and Git helper edge cases under `src/lib/ai/**` (or adjacent libs); verify `npm run test` passes for touched suites
- [ ] 5.2 Run `npx --yes @fission-ai/openspec@latest validate plan-ai-change-artifacts-diff-git --strict` and keep docs/specs aligned with shipped behavior
