## Resume Pro

Resume Pro is an open-source, local-first AI resume editor for managing resumes, previewing multiple templates, improving content with AI, and scoring resume fit against job descriptions.

[Watch the introduction video](https://github.com/user-attachments/assets/4882beb8-16af-4e7c-8986-d2be5c994c0b)

## Highlights

- Local-first by default: resumes and JDs live in a workspace folder versioned
  with isomorphic-git (`WORKSPACE_PATH`; see [docs/workspace.md](./docs/workspace.md)).
  Legacy SQLite/Postgres may still hold AI chat sessions.
- Structured resume editing across personal information, summary, work experience, projects, education, skills, and other sections.
- Seven built-in templates: Classic, Modern, Compact, Elegant, Timeline, Creative, and Academic.
- Live preview, resume font selection, section reordering, and print/PDF export.
- AI-assisted editing with Chat, Edit, and Plan modes. Edit and Plan changes are reviewed before they are applied.
- Job fit analysis that compares saved job descriptions against existing resumes and returns a 10-point score, strengths, gaps, and improvement suggestions.
- Eight interface languages, three themes, and bundled multilingual fonts.
- Browser-based local app with Electron packaging support for macOS, Windows, and Linux.

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Drizzle ORM
- Workspace folder + isomorphic-git (resumes / JDs)
- SQLite / Postgres (legacy / AI session)
- AgentScope for the resume assistant
- LangChain for job fit analysis
- OpenAI-compatible AI APIs
- Electron

## Prerequisites

- Node.js 20.9 or newer (Node.js 22 recommended)
- npm
- Native build tools if a prebuilt `better-sqlite3` binary is unavailable for your platform

## Local Development

Install dependencies:

```bash
npm ci
```

Copy the example environment file. `.env` is used by both the web app and database CLI commands:

```bash
cp .env.example .env
```

Start the local web app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## AI And Database Configuration

Resumes, job descriptions, and AI chat sessions are stored under
`WORKSPACE_PATH` (default `./data/workspace`) and versioned with isomorphic-git.
See [docs/workspace.md](./docs/workspace.md).

```bash
WORKSPACE_PATH=./data/workspace
```

Migrate once from a legacy SQLite/Postgres database:

```bash
npm run workspace:migrate
# or force re-export:
npm run workspace:migrate -- --force
```

For that migration only, configure the old DB (optional afterward):

```bash
DATABASE_PROVIDER=sqlite
SQLITE_PATH=./data/resume-pro.sqlite
# or:
# DATABASE_PROVIDER=postgres
# DATABASE_URL=postgres://user:password@localhost:5432/resume_pro
```

AI features use an OpenAI-compatible API:

```bash
AI_API_URL=https://api.openai.com/v1
AI_API_KEY=your-api-key
AI_API_MODEL=gpt-4o-mini
```

Any provider that exposes an OpenAI-compatible base URL can be used. The same settings are shared by the AgentScope resume assistant and LangChain job fit analysis. See [`.env.example`](./.env.example) and the [AI documentation](./docs/ai.md) for optional model, temperature, history, and skill settings.

If `AI_API_KEY` is not configured, core resume editing still works. The AI assistant and job fit analysis will prompt for AI configuration. Keep secrets out of version control.

On first workspace use (or via `npm run workspace:migrate`), existing database
resumes, JDs, and AI sessions are exported into the workspace.

## Electron Desktop App

Start Electron in development mode:

```bash
npm run dev:electron
```

Build the desktop app:

```bash
npm run build:electron
```

Create an unpacked build for local inspection:

```bash
npm run pack:electron
```

The packaged app runs its own local Next.js server and stores its configuration and SQLite database under `~/.resume-pro/`. AI settings can be changed in System Settings and take effect after restarting the app.

`build:electron` creates the installer configured for the host platform: DMG on macOS, NSIS on Windows, or AppImage on Linux.

## Docker

Pull the published image from [GitHub Container Registry](https://github.com/hchen90/resume-pro/pkgs/container/resume-pro) and run it:

```bash
docker pull ghcr.io/hchen90/resume-pro
docker run --rm -p 3000:3000 \
  --env-file .env \
  -v resume-pro-data:/app/data \
  ghcr.io/hchen90/resume-pro
```

## Common Commands

- `npm run dev` - Start the Next.js development server.
- `npm start` - Start a previously built production server.
- `npm run dev:electron` - Start Next.js and open the Electron development app.
- `npm run build` - Generate release notes and build the production Next.js app.
- `npm run build:electron` - Build and package the Electron desktop app.
- `npm run pack:electron` - Create an unpacked desktop build for inspection.
- `npm run lint` - Run ESLint.
- `npm run typecheck` - Run TypeScript type checking.
- `npm run test` - Run the Vitest test suite.
- `npm run test:coverage` - Run tests with coverage enforcement.
- `npm run db:generate` - Generate Drizzle database migration files.
- `npm run db:push` - Push the current Drizzle schema to the configured database.
- `npm run release-notes:generate` - Regenerate release notes from Git history.

## Documentation

- [Documentation index](./docs/README.md)
- [Architecture and data flow](./docs/overview.md)
- [Resume model and patches](./docs/resume.md)
- [Templates](./docs/templates.md)
- [AI assistant](./docs/ai.md)
- [Job matching](./docs/job-match.md)
- [API routes](./docs/api.md)
- [Electron runtime and packaging](./docs/electron.md)

## License

Resume Pro is released under the [MIT License](./LICENSE).
