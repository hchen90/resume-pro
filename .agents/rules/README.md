# Agent rules

Shared policy text for coding agents. This directory is the **canonical source**.

Tool auto-loaders (required because each product only scans its own path):

| Tool | Auto-load path |
|------|----------------|
| Claude Code | `.claude/rules/*.md` |
| Cursor | `.cursor/rules/*.mdc` |

Edit the markdown body under `.agents/rules/` first, then update the matching
loader file(s) so both tools stay in sync.
