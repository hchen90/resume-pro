# AI Module

## Responsibilities

Use an OpenAI-compatible API (LangChain `ChatOpenAI`) for resume chat, structured edits, step-by-step plans, and converting model output into persistable patches.

## Key files

| Path | Description |
|------|-------------|
| `src/lib/ai/model.ts` | `createChatModel()`, `hasAiConfiguration()` |
| `src/lib/ai/types.ts` | `AiMode`: `chat` \| `edit` \| `plan` |
| `src/lib/ai/prompts.ts` | System and user prompts per mode |
| `src/lib/ai/context.ts` | `summarizeResume()` resume context |
| `src/lib/ai/patch.ts` | Patch schemas, `applyResumePatches`, `extractJsonResponse` |
| `src/app/api/ai/route.ts` | `POST` entry point |
| `src/components/resume/ai-panel.tsx` | Editor AI panel UI |

## Configuration

Environment variables (or Electron `~/.resume-pro/.env`):

- `AI_API_URL` — compatible API base URL
- `AI_API_KEY` — when missing, AI endpoints return a friendly “not configured” message; core editing still works
- `AI_API_MODEL` — default `gpt-4o-mini`
- `AI_SUMMARY_MODEL` — optional; chat-history summarization model. Falls back to `AI_API_MODEL` when unset
- `AI_HISTORY_MAX_MESSAGES` — max conversational messages stored per resume (default `50`)
- `AI_HISTORY_SUMMARIZE_ABOVE` — summarize older turns when conversational count exceeds this (default `30`)
- `AI_HISTORY_CONTEXT_MESSAGES` — recent turns kept after summarization and sent to the model (default `20`)

On Electron, **System settings** + `POST /api/settings/ai` can update the local `.env` (see [electron.md](./electron.md)).

## Modes

| Mode | Behavior | Persists to DB |
|------|----------|----------------|
| `chat` | Text suggestions only | No |
| `edit` | JSON `{ message, patches }`, then `saveResume` | Yes |
| `plan` | Returns `{ message, plan }`; user confirms with `action: execute_plan` (edit path) | On execute |

### Plan flow

1. `mode: plan`, `action: send` → `plan.steps[]` (`id`, `title`, `description`, `targetNodeIds`).
2. User confirms → `mode: plan`, `action: execute_plan`, with `plan` → `approvedPlanExecutionPrompt` produces patches and saves.

## Patch protocol

Defined in `resumePatchSchema` (`patch.ts`):

- `update_node` — partial update of `title` / `content` / `enabled` (empty fields do not overwrite)
- `create_node` — optional `afterNodeId` for insertion position
- `delete_node` — cannot delete `profile`
- `set_template` — change `templateId`

## Request body (`POST /api/ai`)

```json
{
  "resumeId": "uuid",
  "selectedNodeId": "optional",
  "mode": "chat|edit|plan",
  "action": "send|execute_plan",
  "locale": "zh-CN",
  "message": "user message",
  "plan": {}
}
```

Response includes `message`, `patches`; on successful edit/execute_plan, also `resume`.

## Tests

- `src/lib/ai/patch.test.ts` — patch merge and JSON extraction
