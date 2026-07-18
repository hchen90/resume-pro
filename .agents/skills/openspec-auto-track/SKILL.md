---
name: openspec-auto-track
description: Automatically records every agent-performed code change with OpenSpec. Use for any task that creates, edits, renames, or deletes source code, tests, configuration, scripts, migrations, or developer documentation, even when the user does not mention OpenSpec.
allowed-tools: Bash(npx:*), Bash(git:*)
license: MIT
compatibility: Requires Node.js and npx.
metadata:
  author: resume-pro
  version: "1.0"
---

# Automatically track code changes with OpenSpec

Apply this workflow to every agent-performed code modification. Do not require
the user to mention OpenSpec.

Use this command prefix for every OpenSpec CLI call:

```bash
npx --yes @fission-ai/openspec@latest
```

## Before the first code edit

1. Run:

   ```bash
   npx --yes @fission-ai/openspec@latest list --json
   ```

2. Reuse an active change only when its name or proposal clearly matches the
   current request. Otherwise derive a concise kebab-case change name and run:

   ```bash
   npx --yes @fission-ai/openspec@latest new change "<change-name>"
   ```

3. Run `status --change "<change-name>" --json`, then follow
   `instructions <artifact-id> --change "<change-name>" --json` in dependency
   order. Create every artifact required for apply before editing code.

4. Keep the proposal scoped to the user's request. Record expected behavior,
   affected areas, important decisions, and verification steps. Do not invent
   unrelated work.

## While editing

- Treat one user request as one OpenSpec change unless the request contains
  independent changes that should be reviewed separately.
- After each completed logical implementation step, immediately mark its task
  checkbox complete in the change's task artifact.
- If implementation differs materially from the proposal, specs, or design,
  update those artifacts before continuing.
- Never create a second change merely because the same task spans multiple
  files or messages.
- OpenSpec-generated files are tracking artifacts; editing them does not
  recursively require another OpenSpec change.

## Before reporting completion

1. Ensure every implemented task is checked and incomplete work remains
   unchecked.
2. Run:

   ```bash
   npx --yes @fission-ai/openspec@latest validate "<change-name>" --strict
   npx --yes @fission-ai/openspec@latest status --change "<change-name>"
   ```

3. Fix tracking errors before reporting success. If validation cannot pass,
   report the exact blocker.
4. Include the OpenSpec change name and validation result in the final summary.
5. Do not archive automatically. Archive only when the user requests it or
   explicitly confirms that the completed change should be archived.

## Exceptions

Do not create a change for read-only analysis, explanations, searches, test
runs without file edits, or OpenSpec artifact maintenance alone.
