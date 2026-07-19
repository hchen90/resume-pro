## ADDED Requirements

### Requirement: Shared form-control rules load in Cursor and Claude Code

Form-control constraints MUST have a single canonical source under `.agents/rules/` and MUST be auto-loadable by both Cursor and Claude Code through their native rule directories.

#### Scenario: Claude Code opens resume editor files

- **WHEN** Claude Code works on `src/components/resume/**/*.tsx`
- **THEN** the form-control rule is available via `.claude/rules/`

#### Scenario: Cursor opens resume editor files

- **WHEN** Cursor works on `src/components/resume/**/*.tsx`
- **THEN** the form-control rule is available via `.cursor/rules/`

#### Scenario: Canonical source of truth

- **WHEN** maintainers update the form-control policy
- **THEN** they edit `.agents/rules/resume-form-controls.md` as the canonical body
