# Resume Pro — Agent Guide

For AI agents and developers working in this repository.

## Overview

Local-first AI resume editor (Next.js 16 + React 19 + Drizzle + SQLite/Postgres + AgentScope + LangChain + Electron). Features: structured resume editing, multi-template preview, AI optimization (Chat / Edit / Plan), and job-description fit scoring.

## Documentation (read first)

Module docs live under [`docs/`](./docs/):

| Document | Topics |
|----------|--------|
| [docs/README.md](./docs/README.md) | Documentation index |
| [docs/overview.md](./docs/overview.md) | Tech stack, layout, data flow |
| [docs/database.md](./docs/database.md) | Database and repositories (legacy / AI sessions) |
| [docs/workspace.md](./docs/workspace.md) | Workspace folder + isomorphic-git storage |
| [docs/resume.md](./docs/resume.md) | Resume types, nodes, patches |
| [docs/templates.md](./docs/templates.md) | Resume templates |
| [docs/ai.md](./docs/ai.md) | AI modes and API |
| [docs/job-match.md](./docs/job-match.md) | Job fit tool |
| [docs/frontend.md](./docs/frontend.md) | Pages and components |
| [docs/api.md](./docs/api.md) | HTTP API |
| [docs/i18n-and-settings.md](./docs/i18n-and-settings.md) | Locales and themes |
| [docs/electron.md](./docs/electron.md) | Desktop app |
| [docs/release-notes.md](./docs/release-notes.md) | Release notes |

Open the relevant doc before changing a module to learn boundaries and key paths.

## Code layout (quick reference)

```
src/app/           # Pages, API routes, server actions
src/components/    # UI (resume/, job-match/, settings)
src/lib/           # db, resume, ai, i18n, settings, electron-env
src/templates/     # Resume HTML templates
electron/          # Main process
drizzle/           # ORM migrations
```

## Conventions

- **Database / workspace**: Resumes, JDs, and AI sessions persist under
  `WORKSPACE_PATH` with isomorphic-git ([docs/workspace.md](./docs/workspace.md)).
  `DATABASE_PROVIDER` is only needed for `npm run workspace:migrate` from a
  legacy DB. Do not import `server-only` modules from the client.
- **Saving resumes**: Save writes workspace files and auto-commits; PATCH must
  send the full `nodes` array.
- **AI**: Requires `AI_API_KEY`; when missing, APIs return a friendly message (not 500). The assistant uses AgentScope in Node.js routes (`src/lib/ai/agentscope/`) and streams NDJSON events. AgentScope skills live under `skills/resume-assistant/<name>/SKILL.md`; they provide guidance but cannot bypass mode or patch-confirmation rules. Edit/Plan produce confirmable proposals; patches still validate through `src/lib/ai/patch.ts` + `patch-validate.ts`. Job Match still uses LangChain.
- **i18n**: New UI strings must be added to every locale in `dictionaries` in `src/lib/i18n.ts`.
- **Form controls**: Preserve semantic/native input types; fix incompatible stored values through normalization or validation instead of downgrading controls to plain text. Canonical rule: `.agents/rules/resume-form-controls.md` (Claude Code: `.claude/rules/`; Cursor: `.cursor/rules/`).
- **Links**: Internal navigation should include `settingsQuery({ lang, style })` to preserve locale and theme.
- **Tests**: `npm run test` (Vitest); `npm run test:coverage` enforces ≥90% coverage on `src/lib/ai/**` (AgentScope adapter under `src/lib/ai/agentscope/**` is excluded). Extend tests when changing patch, AI, or registry logic.

## Common commands

```bash
npm run dev              # Web development
npm run dev:electron     # Desktop development
npm run build            # Production build (includes release notes)
npm run lint && npm run typecheck && npm run test
npm run db:generate      # Generate Drizzle migrations
npm run db:push          # Push schema to database
```

Environment variables: `.env.example` and [README.md](./README.md).

<!-- BEGIN:nextjs-agent-rules -->
## Next.js note

**This is NOT the Next.js you know.** This repo uses Next.js 16; APIs and conventions may differ from common training data. Before changing routes, data fetching, or config, read the relevant guides under `node_modules/next/dist/docs/` and follow deprecation notices.
<!-- END:nextjs-agent-rules -->
