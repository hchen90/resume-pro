# Database Module

## Responsibilities

- Abstract SQLite and Postgres backends
- Create tables on startup (`ensureDatabase`)
- Expose repository layer for resumes and job descriptions

## Key files

| Path | Description |
|------|-------------|
| `src/lib/db/client.ts` | `getDbClient()` singleton; picks driver from `DATABASE_PROVIDER` |
| `src/lib/db/migrate.ts` | `ensureDatabase()`: idempotent `CREATE TABLE IF NOT EXISTS` |
| `src/lib/db/schema/sqlite.ts` | SQLite Drizzle schema |
| `src/lib/db/schema/postgres.ts` | Postgres Drizzle schema |
| `src/lib/db/resume-repository.ts` | Resume CRUD |
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

## Provider differences

- **SQLite**: `better-sqlite3`, WAL + foreign keys; default path `./data/resume-pro.sqlite`; Electron uses `~/.resume-pro/resume-pro.sqlite`.
- **Postgres**: `pg` pool; `content` stored as JSON string; `enabled` as `0/1` integer.

## Repository API

### Resumes (`resume-repository.ts`)

- `listResumes()` — ordered by `updatedAt` descending
- `getResume(id)` — includes nodes, sorted by `sortOrder`
- `createResume(title, locale?)` — seeds default nodes via `createDefaultResumeNodes`
- `saveResume(id, ResumeSaveInput)` — updates resume and **replaces all nodes**
- `deleteResume(id)`

### Job descriptions (`job-description-repository.ts`)

- `listJobDescriptions()` / `getJobDescription(id)`
- `createJobDescription({ title, content })`
- `updateJobDescription(id, input)`

## Migrations

Runtime DDL in `migrate.ts` ensures tables exist. The `drizzle/` folder holds Kit-generated migrations for `npm run db:generate` and `db:push` when evolving schema.
