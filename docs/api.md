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

Resume AI assistant. See [ai.md](./ai.md).

- **Body**: `resumeId`, `mode`, `message`, optional `action`, `plan`, `locale`, `selectedNodeId`
- **Response**: `message`, `patches`, optional `plan`, `resume`
- **Errors**: 404 if resume missing; 400 if plan execute lacks `plan`

## Job fit

### `POST /api/job-match`

Score resume against a JD. See [job-match.md](./job-match.md).

- **Body**: `jobDescriptionId`, `resumeId`, optional `locale`
- **Response**: `{ result: { score, summary, strengths, gaps, suggestions } }`

## Settings (Electron)

### `POST /api/settings/ai`

Electron only. Updates AI variables in `~/.resume-pro/.env`.

- **Body**: `aiApiUrl`, `aiApiKey`, `aiApiModel`
- Restart is usually required for the main process to reload env

Implementation: `src/app/api/settings/ai/route.ts` → `updateElectronAiConfig`.

## Missing AI configuration

When `AI_API_KEY` is unset, `/api/ai` and `/api/job-match` return **200** with a localized `message` (not 5xx). The UI prompts the user to configure AI.
