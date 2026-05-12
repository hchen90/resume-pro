## Resume Pro

Resume Pro is an open-source, local-first AI resume editor for managing resumes, previewing multiple templates, improving content with AI, and scoring resume fit against job descriptions.

<video src="./ResumePro.mp4" controls width="100%">
  Your browser does not support the video tag.
</video>

[Watch the introduction video](./ResumePro.mp4)

## Highlights

- Local-first by default, using SQLite out of the box with optional Postgres support.
- Structured resume editing across personal information, summary, work experience, projects, education, skills, and other sections.
- Multiple resume templates, including Classic, Modern, Compact, Elegant, Timeline, and Creative styles.
- AI-assisted editing with chat suggestions, direct edit mode, and a Plan mode that lets users review changes before applying them.
- Job fit analysis that compares saved job descriptions against existing resumes and returns a 10-point score, strengths, gaps, and improvement suggestions.
- Browser-based local app with Electron development and packaging support for desktop use.

## Preview

![Resume Pro home page](./docs/home.png)

![Editor with AI assistant](./docs/editor_ai_plan.png)

![Job fit score result](./docs/role_fit_radar_score.png)

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Drizzle ORM
- SQLite / Postgres
- LangChain OpenAI-compatible API
- Electron

## Local Development

Install dependencies:

```bash
npm install
```

Copy the example environment file:

```bash
cp .env.example .env
```

Start the local web app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## AI And Database Configuration

Resume Pro uses SQLite by default, with the local database stored at `./data/resume-pro.sqlite`. To use Postgres instead, configure `.env` with:

```bash
DATABASE_PROVIDER=postgres
DATABASE_URL=postgres://user:password@localhost:5432/resume_pro
```

AI features use an OpenAI-compatible API:

```bash
AI_API_URL=https://api.openai.com/v1
AI_API_KEY=your-api-key
AI_API_MODEL=gpt-4o-mini
```

If `AI_API_KEY` is not configured, core resume editing still works. The AI assistant and job fit analysis will prompt for AI configuration.

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

## Common Commands

- `npm run dev` - Start the Next.js development server.
- `npm run dev:electron` - Start Next.js and open the Electron development app.
- `npm run build` - Generate release notes and build the production Next.js app.
- `npm run build:electron` - Build and package the Electron desktop app.
- `npm run lint` - Run ESLint.
- `npm run typecheck` - Run TypeScript type checking.
- `npm run test` - Run the Vitest test suite.
- `npm run db:generate` - Generate Drizzle database migration files.
- `npm run db:push` - Push the current Drizzle schema to the configured database.

## License

Resume Pro is released under the [MIT License](./LICENSE).
