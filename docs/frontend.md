# Frontend and Routes

## App Router pages

| Route | File | Description |
|-------|------|-------------|
| `/` | `src/app/page.tsx` | Home: version, settings, new resume, tools, resume list |
| `/resumes/[id]` | `src/app/resumes/[id]/page.tsx` | Resume editor workspace |
| `/resumes/[id]/download` | `src/app/resumes/[id]/download/page.tsx` | Print / PDF page |
| `/tools/job-match` | `src/app/tools/job-match/page.tsx` | JD list and create |
| `/tools/job-match/[id]` | `src/app/tools/job-match/[id]/page.tsx` | JD detail and match |
| `/release-notes` | `src/app/release-notes/page.tsx` | Version list |
| `/release-notes/[version]` | `src/app/release-notes/[version]/page.tsx` | Single version |

Query params `lang` and `ui`, plus cookies, control locale and theme (see [i18n-and-settings.md](./i18n-and-settings.md)).

## Core components

### Resume editor (`src/components/resume/`)

| Component | Role |
|-----------|------|
| `resume-workspace.tsx` | Three-pane layout: nodes, editor, preview; drag reorder; save/delete |
| `node-editor.tsx` | Per-node-type form fields |
| `resume-preview.tsx` | Live template preview |
| `template-select.tsx` | Switch `templateId` |
| `ai-panel.tsx` | AI modes and plan confirmation UI |
| `print-button.tsx` | Link to download page |

### System (`src/components/`)

| Component | Role |
|-----------|------|
| `system-settings.tsx` | Locale, UI theme, Electron AI config |
| `language-switcher.tsx` | Locale switcher |

### Job fit (`src/components/job-match/`)

- `job-match-tool.tsx` — JD picker, resume picker, API call, results display

## Server actions (`src/app/actions.ts`)

- `createResumeAction` — create resume and `redirect` to editor
- `createJobDescriptionAction` / `updateJobDescriptionAction` — save JD and redirect

## Client persistence

The editor uses `fetch` for:

- `PATCH /api/resumes/[id]` — save (`resume-workspace`)
- `DELETE /api/resumes/[id]` — delete resume
- `POST /api/ai` — AI interactions

## Layout and styling

- `src/app/layout.tsx` — root layout; sets `html[lang]` and `data-ui-style`
- `src/app/globals.css` — theme via CSS variables (`--app-*`)

## Dynamic rendering

Home and editor-related pages use `export const dynamic = "force-dynamic"` so each request reads the latest database state.
