# AI Module

## Responsibilities

Use AgentScope (`@agentscope-ai/agentscope@0.0.13`) on the Node.js server for resume chat, plan drafting, and structured edit proposals. Resume mutations still go through the local patch protocol and only persist after user confirmation.

Job Match continues to use LangChain `ChatOpenAI` separately.

## Key files

| Path | Description |
|------|-------------|
| `src/lib/ai/agentscope/` | AgentScope model/agent/toolkit adapter, event mapping, runner |
| `src/lib/ai/protocol.ts` | Stable NDJSON event contract for the browser |
| `src/lib/ai/patch.ts` | Patch schemas and deterministic apply engine |
| `src/lib/ai/patch-validate.ts` | Strict patch validation against template registry and node ids |
| `src/lib/ai/snapshot.ts` | Editor snapshot hashing for conflict detection |
| `src/app/api/ai/route.ts` | Streaming `POST` entry point (NDJSON) |
| `src/app/api/ai/confirm/route.ts` | Confirm/reject patch proposals |
| `src/app/api/ai/chat/route.ts` | Session load / lightweight UI-state sync |
| `src/components/resume/ai-panel.tsx` | Streaming assistant UI |

## Configuration

Environment variables (or Electron `~/.resume-pro/.env`):

- `AI_API_URL` — OpenAI-compatible API base URL
- `AI_API_KEY` — when missing, AI endpoints return a friendly “not configured” stream; core editing still works
- `AI_API_MODEL` — default `gpt-4o-mini`
- `AI_TEMPERATURE` — sampling temperature for AgentScope and LangChain clients (default `0.3`). Some models only allow `1`
- `AI_SUMMARY_MODEL` — optional; chat-history summarization model. Falls back to `AI_API_MODEL` when unset
- `AI_HISTORY_MAX_MESSAGES` — max conversational messages stored per resume (default `50`)
- `AI_HISTORY_SUMMARIZE_ABOVE` — summarize older turns when conversational count exceeds this (default `30`)
- `AI_HISTORY_CONTEXT_MESSAGES` — recent turns kept after summarization and sent to the model (default `20`)
- `AI_SKILLS_ENABLED` — enable AgentScope skills and the built-in `Skill` tool (default enabled)
- `AI_SKILL_DIRS` — optional comma-separated or JSON-array directories whose direct subdirectories contain `SKILL.md`
- `AI_SKILLS` — optional comma-separated or JSON-array individual skill directories

On Electron, **System settings** + `PUT /api/settings/ai` can update the local `.env` (see [electron.md](./electron.md)).

## Runtime constraints

- AgentScope runs only in Node.js route handlers (`export const runtime = "nodejs"`).
- Do not import AgentScope Agent/Model/Toolkit into client components.
- Pin `@agentscope-ai/agentscope` to an exact `0.0.x` version; isolate upstream API drift behind `src/lib/ai/agentscope/`.
- Next.js marks the package as `serverExternalPackages` so it is required at runtime by Node instead of bundled by Turbopack. This is required because upstream’s `./event` export has a `development` condition pointing at `.ts` source, which Turbopack cannot load in `next dev`.

## AgentScope skills

Bundled resume skills live under `skills/resume-assistant/` and are discovered
on every Agent/Toolkit creation:

- `achievement-bullets`
- `ats-optimization`
- `resume-review`

Each skill is a directory containing a `SKILL.md` with YAML frontmatter:

```markdown
---
name: my-resume-skill
description: Concise trigger description for the agent
---

# Instructions

Detailed workflow, examples, and limitations.
```

AgentScope injects skill names/descriptions into the system prompt. When a skill
matches the request, the agent calls `Skill({ name })` to load the full file.
Skills provide instructions only: they cannot bypass mode restrictions, patch
validation, or proposal confirmation.

Use `GET /api/ai/skills` to inspect enabled skills without exposing filesystem
paths. The dedicated **Settings** page (`/settings`) lists enabled skills with
search, scroll, and descriptions. Relative custom paths resolve from the app
working directory. Docker and Electron packages include the bundled skill
directory.

## Modes

| Mode | Behavior | Persists resume |
|------|----------|-----------------|
| `chat` | Advice only via tools `get_resume_context` / `get_selected_node` | No |
| `edit` | Agent calls `propose_resume_patch`; UI confirms before save | On confirm |
| `plan` | Agent calls `draft_resume_plan`; execute selected steps produces a proposal | On confirm |

## Streaming protocol

`POST /api/ai` returns `application/x-ndjson` events:

- `run_started`
- `text_delta`
- `thinking_delta`
- `tool_started` / `tool_finished`
- `plan_ready`
- `proposal_ready`
- `error`
- `run_finished`

Validation and resume existence checks happen before the first chunk. Mid-stream failures are encoded as `error` events. Cancelled client requests must not save proposals.

## Confirm flow

1. Edit/Plan execution yields a `proposal_ready` event with `proposalId`, patches, snapshot hash, and base `updatedAt`.
2. User confirms via `POST /api/ai/confirm`.
3. Server re-validates patches, checks snapshot hash + DB optimistic lock, then transactionally saves.
4. Conflicts return `409` without overwriting newer edits.

## Patch protocol

Defined in `resumePatchSchema` (`patch.ts`), with stricter runtime checks in `patch-validate.ts`:

- `update_node` — target must exist; partial content only; multi-item nodes upsert `content.items` by id (add/update). Use `removeItemIds` to delete items, or `replaceItems: true` with a full `content.items` list to replace/reorder.
- `create_node` — cannot create `profile`; optional `afterNodeId` must exist
- `delete_node` — cannot delete `profile`; target must exist
- `set_template` — must match the template registry

## Tests

- `src/lib/ai/patch.test.ts` — patch merge, `removeItemIds` / `replaceItems`, year-only dates, JSON extraction
- `src/lib/ai/patch-validate.test.ts` — strict validation and mutation-claim checks
- `src/lib/ai/prompts.test.ts` — edit/plan prompt contracts for delete/reorder/date formats
- `src/lib/ai/client/stream.test.ts` — NDJSON chunk parsing
- `src/lib/ai/client/reducer.test.ts` — UI stream reducer
- `src/lib/i18n.test.ts` — locale `itemDatePlaceholder` coverage
- `src/lib/resume/format.test.ts` — year-only `itemDateRange` display
