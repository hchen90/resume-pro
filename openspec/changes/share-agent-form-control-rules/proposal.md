## Why

Form-control constraints currently live only under `.cursor/rules/`, so Claude Code sessions do not auto-load them. We need one shared source that both Cursor and Claude Code can use.

## What Changes

- Move the canonical form-control rule body to `.agents/rules/`.
- Wire Claude Code via `.claude/rules/` (auto-loaded path-scoped rules).
- Keep Cursor via `.cursor/rules/` pointing at the same shared content.
- Document the dual-tool rule layout in AGENTS.md / frontend docs.

## Capabilities

### New Capabilities

- (none — tooling/docs only)

### Modified Capabilities

- (none)

## Impact

- `.agents/rules/resume-form-controls.md`
- `.claude/rules/resume-form-controls.md`
- `.cursor/rules/resume-form-controls.mdc`
- `AGENTS.md`, `docs/frontend.md`
