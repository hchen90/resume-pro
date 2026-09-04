## 1. Session storage

- [x] 1.1 Add workspace AI session read/write under `resumes/<id>/ai/session.json`; verify unit tests
- [x] 1.2 Rewrite `ai-chat-repository` to use workspace sessions (no DB writes); verify conflict version behavior
- [x] 1.3 Exclude `ai/` paths from workspace dirty UI status; verify chatting does not mark can-save solely due to session files

## 2. Migration + CLI

- [x] 2.1 Extend DB→workspace migration to include AI sessions; verify sessionCount in result/marker
- [x] 2.2 Add `scripts/migrate-db-to-workspace.mjs` + `npm run workspace:migrate` with `--force`; verify script --help / dry run path
- [x] 2.3 Update docs (workspace, database, ai, README, .env.example); verify DATABASE_PROVIDER documented as migration-only for docs

## 3. Validation

- [x] 3.1 Run `npm test` and `openspec validate workspace-ai-sessions-migrate-cli --strict`
