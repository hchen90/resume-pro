## Context

OpenSpec can generate Antigravity-compatible skills under `.agent/skills`, but
its standard skills activate only for explicit OpenSpec workflows. The project
also needs an ambient policy that applies whenever an agent edits code.

## Goals / Non-Goals

**Goals:**

- Install the standard OpenSpec spec-driven workflow.
- Make OpenSpec tracking discoverable for every agent code-editing task.
- Record intent before implementation and progress after logical edits.
- Validate each change before an agent reports completion.

**Non-Goals:**

- Intercept edits made manually or by tools that do not load agent skills.
- Archive changes without user confirmation.
- Add OpenSpec as a project runtime dependency.

## Decisions

- Use OpenSpec's `antigravity` adapter because it generates the requested
  `.agent/skills` and `.agent/workflows` layout.
- Add a separate `openspec-auto-track` skill instead of changing generated
  OpenSpec skills, because `openspec update` may overwrite generated files.
- Invoke `npx --yes @fission-ai/openspec@latest` explicitly so the workflow does
  not depend on a global installation or an unrelated `openspec` npm package.
- Track one OpenSpec change per user request and update tasks after logical
  implementation steps. Tracking each low-level file write would create noisy,
  unusable records.

## Risks / Trade-offs

- Agent skill activation is policy-based, not a filesystem guarantee. Agents
  that do not discover `.agent/skills` and manual edits are not intercepted.
- Using `@latest` keeps the CLI current but can introduce upstream behavior
  changes. Generated metadata and strict validation expose incompatibilities.
- Repeated `npx` startup adds latency to coding tasks, mitigated by npm's cache.
