## Why

Agent-authored code changes currently have no mandatory, structured change
record. Initializing OpenSpec and adding an automatically discovered tracking
skill makes the intent, implementation tasks, and validation status reviewable.

## What Changes

- Initialize the repository-local OpenSpec spec-driven workflow for Antigravity.
- Add an automatically invoked skill for all agent-performed code modifications.
- Require agents to create or reuse an OpenSpec change before editing code.
- Require task updates and strict OpenSpec validation before completion.

## Capabilities

### New Capabilities

- `automatic-change-tracking`: Records agent-performed code changes through an
  OpenSpec change lifecycle without requiring the user to mention OpenSpec.

### Modified Capabilities

None.

## Impact

- Adds generated OpenSpec workflows and skills under `.agent/`.
- Adds repository-local OpenSpec configuration and change artifacts under
  `openspec/`.
- Requires Node.js and `npx` when agents perform code modifications.
