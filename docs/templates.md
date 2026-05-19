# Resume Templates

## Responsibilities

Provide multiple switchable resume layouts for live preview in the editor and for the print/PDF download page.

## Key files

| Path | Description |
|------|-------------|
| `src/templates/resume/registry.ts` | Template registry and `getResumeTemplate()` |
| `src/templates/resume/types.ts` | `ResumeTemplate` type |
| `src/templates/resume/*.tsx` | Template implementations |
| `src/templates/resume/markdown-content.tsx` | Shared Markdown rendering for nodes |
| `src/templates/resume/registry.test.ts` | Registry unit tests |

## Built-in templates

| ID | File | Style |
|----|------|-------|
| `classic` | `classic.tsx` | Classic two-column |
| `modern` | `modern.tsx` | Clean modern |
| `compact` | `compact.tsx` | Dense compact |
| `elegant` | `elegant.tsx` | Elegant serif feel |
| `timeline` | `timeline.tsx` | Timeline layout |
| `creative` | `creative.tsx` | Creative visual |
| `academic` | `academic.tsx` | Academic two-column (labels/dates left, content right) |

Unknown `templateId` values fall back to `classic`.

## Typography (all templates)

Resume fonts are **not** set per template file. Each resume stores `fontPreset` (`default` | `serif`) in the database. Preview and print wrap templates with `ResumeDocument` (`src/components/resume/resume-document.tsx`), which sets `data-resume-font` and drives `--resume-font-family` in `src/app/globals.css`.

Users change the font in the editor sidebar; the download page shows the current preset read-only. When adding a template, do **not** use Tailwind `font-sans` / `font-serif` for resume content—use weight/size utilities only so print and CJK fallbacks stay consistent.

Preset definitions: `src/lib/resume/fonts.ts`.

## Template contract

Each template exports a `ResumeTemplate` object, typically including:

- `id`, `name` (display label)
- A React component that accepts `ResumeWithNodes` and renders the full resume

## Usage

- **Editor preview**: `src/components/resume/resume-preview.tsx` picks the component from `resume.templateId`.
- **Template picker**: `src/components/resume/template-select.tsx` lists `resumeTemplates`.
- **Download page**: `src/app/resumes/[id]/download/page.tsx` — print/PDF layout without the app chrome.

## Adding a template

1. Add `src/templates/resume/<name>.tsx` implementing `ResumeTemplate`.
2. Register it in `registry.ts` → `resumeTemplates`.
3. Optionally extend `registry.test.ts` for ID uniqueness and required fields.
