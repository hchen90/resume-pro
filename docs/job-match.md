# Job Fit Module

## Responsibilities

Save job descriptions (JDs), select an existing resume, and call AI to score fit (0–10) with strengths, gaps, and improvement suggestions.

## Key files

| Path | Description |
|------|-------------|
| `src/lib/job-descriptions/types.ts` | `JobDescription` type |
| `src/lib/db/job-description-repository.ts` | JD persistence |
| `src/app/tools/job-match/page.tsx` | Tool home: list and create JDs |
| `src/app/tools/job-match/[id]/page.tsx` | Single JD edit and run match |
| `src/components/job-match/job-match-tool.tsx` | Client match UI |
| `src/app/api/job-match/route.ts` | `POST` scoring API |
| `src/app/actions.ts` | `createJobDescriptionAction`, `updateJobDescriptionAction` |

## User flow

1. Home → **Tools** → Job fit radar (`/tools/job-match`).
2. Paste JD title and content; server action saves it.
3. Open a JD detail page, select a resume, click run match.
4. Client `POST /api/job-match` and displays score and structured analysis.

## API (`POST /api/job-match`)

Request:

```json
{
  "jobDescriptionId": "uuid",
  "resumeId": "uuid",
  "locale": "zh-CN"
}
```

Response `result`:

| Field | Description |
|-------|-------------|
| `score` | 0–10, one decimal place |
| `summary` | One-line overview |
| `strengths` | Matching strengths |
| `gaps` | Gaps / risks |
| `suggestions` | Improvement ideas |

Without `AI_API_KEY`, returns the same localized “not configured” message as the AI assistant.

## Prompt strategy

The system prompt requires scoring only from facts on the resume, no invented experience, replies in the user’s locale, and **JSON-only** output (see inline prompt in `route.ts`).

Resume context is injected via `summarizeResume(resume)`, shared with the AI editor.
