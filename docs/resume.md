# Resume Data Module

## Responsibilities

Define resume and node TypeScript types, Zod validation, default node factories, and resume summarization for AI context.

## Key files

| Path | Description |
|------|-------------|
| `src/lib/resume/types.ts` | Core types: `Resume`, `ResumeNode`, `ResumeSaveInput` |
| `src/lib/resume/defaults.ts` | `createDefaultResumeNodes`, `createNode` |
| `src/lib/resume/validation.ts` | `resumeSaveSchema`, `resumeNodeContentSchema` |
| `src/lib/resume/format.ts` | Display formatting helpers |

## Node types (`ResumeNodeType`)

| Type | Typical use |
|------|-------------|
| `profile` | Name, headline, contact (cannot be deleted) |
| `summary` | Professional summary |
| `experience` | Work history (`items[]`) |
| `education` | Education |
| `project` | Projects |
| `skills` | Skill list (`skills[]`) |
| `custom` | Custom section |

## Node content (`ResumeNodeContent`)

- **Profile fields**: `name`, `headline`, `email`, `phone`, `location`, `website`
- **Body**: `body` (Markdown)
- **List items**: `items[]` with `id`, `title`, `subtitle`, dates, location, `description`
- **Skills**: `skills: string[]`

## Save semantics

`saveResume` deletes all nodes for the resume and re-inserts them. Clients must send the **full** node list. `PATCH /api/resumes/[id]` validates input with `resumeSaveSchema`.

## Default resume

`createResume` calls `createDefaultResumeNodes(resumeId, locale)` to seed section titles and sample structure per locale (see `defaults.ts`).

## AI integration

- `summarizeResume()` in `src/lib/ai/context.ts` compresses the resume for the model and highlights `selectedNodeId`.
- `applyResumePatches()` in `src/lib/ai/patch.ts` merges AI patches into `ResumeSaveInput`.

Patch operations: `update_node`, `create_node`, `delete_node` (`profile` is protected), `set_template`.
