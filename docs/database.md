# Database Module

## Responsibilities

- Abstract SQLite and Postgres backends
- Create tables on startup (`ensureDatabase`)
- Expose repository layer for resumes and job descriptions

> **Iteration — retiring document storage:** User resume and JD documents will
> move to a workspace folder + isomorphic-git. After cutover, this module will
> no longer be the durable store for those entities. See
> [workspace.md](./workspace.md) and OpenSpec `workspace-git-storage`. Until
> that ships, the tables and repositories below remain authoritative.

## Key files

| Path | Description |
|------|-------------|
| `src/lib/db/client.ts` | `getDbClient()` singleton; picks driver from `DATABASE_PROVIDER` |
| `src/lib/db/migrate.ts` | `ensureDatabase()`: idempotent `CREATE TABLE IF NOT EXISTS` |
| `src/lib/db/schema/sqlite.ts` | SQLite Drizzle schema |
| `src/lib/db/schema/postgres.ts` | Postgres Drizzle schema |
| `src/lib/db/resume-repository.ts` | Resume CRUD (transactional save + optimistic lock) |
| `src/lib/db/ai-chat-repository.ts` | Assistant session persistence |
| `src/lib/db/job-description-repository.ts` | JD CRUD |
| `drizzle.config.ts` | Drizzle Kit config (`db:generate` / `db:push`) |

## Tables

### `resumes`

| Column | Description |
|--------|-------------|
| `id` | UUID primary key |
| `title` | Resume title |
| `template_id` | Template ID; default `classic` |
| `created_at` / `updated_at` | ISO timestamps |

### `resume_nodes`

| Column | Description |
|--------|-------------|
| `id` | Node UUID |
| `resume_id` | FK with `ON DELETE CASCADE` |
| `type` | Node type (see [resume.md](./resume.md)) |
| `title` | Section title |
| `content` | JSON payload (SQLite uses `mode: "json"`) |
| `sort_order` | Display order |
| `enabled` | Whether the node appears in preview |

### `job_descriptions`

| Column | Description |
|--------|-------------|
| `id` | UUID |
| `title` | JD title |
| `content` | Full JD text |
| `created_at` / `updated_at` | ISO timestamps |

### `ai_chat_sessions`

One row per resume (FK cascade on resume delete).

| Column | Description |
|--------|-------------|
| `resume_id` | Primary key / FK to `resumes` |
| `mode` | `chat` \| `edit` \| `plan` |
| `messages` | JSON chat transcript |
| `summary` | Optional compacted history summary |
| `pending_plan` | JSON plan awaiting step selection |
| `selected_plan_step_ids` | JSON string array |
| `pending_proposal` | JSON patch proposal awaiting confirm |
| `session_version` | Optimistic concurrency counter |
| `last_run_id` | Last assistant run id |
| `agent_context` / `agent_state` | AgentScope / assistant extras; `agent_state.undoSnapshot` holds the pre-confirm resume for one-shot AI undo |
| `updated_at` | ISO timestamp |

**Planned** (iteration — not shipped): first-class AI change artifacts (生成产物)
and before/after comparison remain under OpenSpec
`plan-ai-change-artifacts-diff-git`. **Git versioning / commit hashes** for
document updates are owned by the workspace plan
([workspace.md](./workspace.md), OpenSpec `workspace-git-storage`) rather than a
separate AI-only Git repo.

## Provider differences

- **SQLite**: `better-sqlite3`, WAL + foreign keys; default path `./data/resume-pro.sqlite`; Electron uses `~/.resume-pro/resume-pro.sqlite`.
- **Postgres**: `pg` pool; `content` stored as JSON string; `enabled` as `0/1` integer.

## Repository API

### Resumes (`resume-repository.ts`)

- `listResumes()` — ordered by `updatedAt` descending
- `getResume(id)` — includes nodes, sorted by `sortOrder`
- `createResume(title, locale?)` — seeds default nodes via `createDefaultResumeNodes`
- `saveResume(id, ResumeSaveInput, { expectedUpdatedAt? })` — transactional update that **replaces all nodes**; throws `ResumeVersionConflictError` when the optimistic lock fails
- `deleteResume(id)`

### AI chat sessions (`ai-chat-repository.ts`)

- `getAiChatSession(resumeId, introContent)`
- `saveAiChatSession(resumeId, session, introContent, { expectedSessionVersion? })`

### Job descriptions (`job-description-repository.ts`)

- `listJobDescriptions()` / `getJobDescription(id)`
- `createJobDescription({ title, content })`
- `updateJobDescription(id, input)`

## Migrations

Runtime DDL in `migrate.ts` ensures tables exist. The `drizzle/` folder holds Kit-generated migrations for `npm run db:generate` and `db:push` when evolving schema.
