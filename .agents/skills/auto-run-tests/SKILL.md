---
name: auto-run-tests
description: Automatically runs Vitest unit tests (and coverage when AI code changes) after any agent-performed source-code edit. Use for any task that creates, edits, or deletes source, tests, or config under src/, even when the user does not mention testing or coverage.
allowed-tools: Bash(npm:*)
license: MIT
compatibility: Requires Node.js and installed npm dependencies.
metadata:
  author: resume-pro
  version: "1.0"
---

# Automatically run tests after code changes

Apply this workflow after completing agent-performed code edits. Do not require
the user to mention tests or coverage.

## When to run

Run after you finish a logical set of edits that touch any file under `src/`
(source, tests, or config). Run once per completed step, not after every single
file write.

## What to run

Decide the command by what changed:

- **Touched `src/lib/ai/**` (excluding `src/lib/ai/agentscope/**`)** → run
  coverage, which also enforces the ≥90% threshold on `src/lib/ai/**`:

  ```bash
  npm run test:coverage
  ```

- **Any other change under `src/`** → run the unit tests only:

  ```bash
  npm test
  ```

If a change set touches both areas, run `npm run test:coverage` (it is the
superset).

## Feedback loop

1. Run the appropriate command above.
2. If it fails (test failure or coverage below threshold):
   - Read the reported failures.
   - Fix the code or add/adjust tests. When changing patch, AI, or registry
     logic, extend tests to keep `src/lib/ai/**` at ≥90% coverage.
   - Re-run the command.
3. Only report completion once the command passes.
4. Include the command run and its pass/fail result in the final summary.

## Exceptions

Do not run for read-only analysis, explanations, searches, documentation-only
edits, or changes that do not affect anything under `src/`.
