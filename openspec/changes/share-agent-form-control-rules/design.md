## Context

Cursor loads `.cursor/rules/*.mdc`. Claude Code loads `CLAUDE.md` / `.claude/rules/*.md` (with optional `paths` frontmatter). This repo’s `.agents/` is for skills/workflows and is **not** auto-loaded by Claude Code.

## Goals / Non-Goals

**Goals:**

- Single canonical rule body under `.agents/rules/`.
- Auto-load for Claude Code and Cursor without duplicating policy text by hand forever.

**Non-Goals:**

- Moving OpenSpec skills out of `.agents/skills/`.
- Making Claude Code read arbitrary `.agents/**` paths.

## Decisions

1. Canonical body: `.agents/rules/resume-form-controls.md` (no tool-specific frontmatter).
2. Claude Code adapter: `.claude/rules/resume-form-controls.md` with `paths` frontmatter and the same body (Claude Code only auto-loads `.claude/rules/`, not `.agents/`).
3. Cursor adapter: `.cursor/rules/resume-form-controls.mdc` keeps Cursor `globs`/`alwaysApply` frontmatter and the same body.
4. Document that `.agents/rules` is the source of truth; tool directories are loaders that must be updated together.

## Risks / Trade-offs

- [Risk] Duplicated body across loaders can drift → Mitigation: `.agents/rules/README.md` requires editing the canonical file first, then syncing loaders; headers point at the canonical path.
- [Risk] Expecting Claude Code to read `.agents/rules` directly → Mitigation: documented that Claude only auto-loads `.claude/rules/`.
