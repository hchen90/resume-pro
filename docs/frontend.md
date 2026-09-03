# Frontend and Routes

## App Router pages

| Route | File | Description |
|-------|------|-------------|
| `/` | `src/app/page.tsx` | Home: version, settings link, new resume, tools, resume list |
| `/settings` | `src/app/settings/page.tsx` | Dedicated settings: locale, theme, AI skills, Electron AI config |
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
| `node-editor.tsx` | Per-node-type form fields. Multi-item start/end dates use native `type="month"` pickers. Year-only stored values (e.g. `2020` from AI) are coerced to `YYYY-01` for display so the control is not blank. |
| `resume-preview.tsx` | Live template preview |
| `template-select.tsx` | Switch `templateId` |
| `ai-panel.tsx` | AI modes and plan confirmation UI |
| `ai-proposal-review.tsx` | Pending proposal summary + confirm/reject (counts/titles only today) |
| `print-button.tsx` | Link to download page |

**Planned UI** (iteration — not shipped): before/after comparison and Git commit
hash display for AI changes. See
[ai.md — Iteration plan](./ai.md#iteration-plan-not-yet-implemented).

#### Form control constraints

- Preserve semantic/native controls (`month`, `date`, `number`, `color`,
  `email`, `url`, etc.); do not downgrade them to plain text just to accept an
  incompatible stored value.
- Normalize, migrate, or validate data at the boundary instead. For example,
  adapt stored `YYYY` to `YYYY-01` for a month input.
- Any intentional input-type change must account for accessibility, browser
  behavior, persistence, AI-generated values, legacy data, and regression
  tests. Canonical rule: `.agents/rules/resume-form-controls.md` (loaded via
  `.claude/rules/` for Claude Code and `.cursor/rules/` for Cursor).

### System (`src/components/`)

| Component | Role |
|-----------|------|
| `settings-page.tsx` | Full settings page: locale, theme, searchable AI skills, Electron AI config |
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
