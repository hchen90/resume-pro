# HTTP API

All API routes use `export const runtime = "nodejs"` so they can access SQLite and the filesystem.

## Resumes

### `PATCH /api/resumes/[id]`

Save a full resume (title, template, all nodes).

- **Body**: `ResumeSaveInput` (Zod: `resumeSaveSchema`)
- **Response**: `ResumeWithNodes`

### `DELETE /api/resumes/[id]`

Delete a resume (nodes cascade).

- **Response**: `{ ok: true }`

## AI

### `POST /api/ai`

Streaming resume assistant powered by AgentScope. See [ai.md](./ai.md).

- **Body**: `resumeId`, `mode`, `message`, `resumeSnapshot`, optional `action`, `plan`, `locale`, `selectedNodeId`, `messages`
- **Response**: NDJSON stream of assistant events (`run_started`, `text_delta`, `plan_ready`, `proposal_ready`, …)
- **Errors before stream**: 404 if resume missing; 400 for invalid body / missing plan on execute

### `POST /api/ai/confirm`

Confirm or reject a pending patch proposal.

- **Body**: `resumeId`, `proposalId`, `decision` (`confirm` \| `reject`), `resumeSnapshot`, optional `locale`
- **Response**: `{ ok, decision, resume?, session? }` (`session.canUndo` is true after a successful confirm)
- **409**: snapshot or resume version conflict

### `POST /api/ai/undo`

Restore the resume to the snapshot saved just before the last confirmed AI apply (one-shot).

- **Body**: `resumeId`, optional `locale`, optional `expectedUpdatedAt`
- **Response**: `{ ok, resume, session }`
- **404**: no undo snapshot
- **409**: resume version conflict

**Workspace status:** `GET /api/workspace/status` returns `{ clean, headSha,
shortHash, dirtyFileCount }`. See [workspace.md](./workspace.md).

**Still planned:** AI change artifacts + before/after diff —
[ai.md — Iteration plan](./ai.md#iteration-plan-not-yet-implemented).

### `GET /api/ai/chat?resumeId=&locale=`

Load persisted assistant session for a resume.

### `PUT /api/ai/chat`

Lightweight session sync (mode / pending plan selection). Server remains authoritative for messages after agent runs.

- Optional `expectedSessionVersion` for optimistic concurrency (`409` on conflict)

### `GET /api/ai/skills`

List AgentScope skills available to the resume assistant.

- **Response**: `{ enabled, skills: [{ name, description, source }] }`
- Filesystem paths and full skill instructions are not exposed to the browser.
- The Settings page (`/settings`) consumes this endpoint (or equivalent server-side listing) to show skill names and descriptions.

## Workspace

### `GET /api/workspace/status`

Git cleanliness for the document workspace.

- **Response**: `{ clean, headSha, shortHash, dirtyFileCount }`
- See [workspace.md](./workspace.md)

## Job fit

### `POST /api/job-match`

Score resume against a JD. See [job-match.md](./job-match.md).

- **Body**: `jobDescriptionId`, `resumeId`, optional `locale`
- **Response**: `{ result: { score, summary, strengths, gaps, suggestions } }`

## Settings (Electron)

### `PUT /api/settings/ai`

Electron only. Updates AI variables in `~/.resume-pro/.env`.

- **Body**: `aiApiUrl`, `aiApiKey`, `aiApiModel`, optional `aiSummaryModel`
- Restart is usually required for the main process to reload env

Implementation: `src/app/api/settings/ai/route.ts` → `updateElectronAiConfig`.

## Missing AI configuration

When `AI_API_KEY` is unset, `/api/ai` returns a short NDJSON stream with a localized not-configured message (not 5xx). `/api/job-match` returns **200** with a localized `message`. The UI prompts the user to configure AI.
