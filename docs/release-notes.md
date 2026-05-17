# Release Notes

## Responsibilities

Generate versioned release notes JSON at build time for `/release-notes` pages; show current version on the home page.

## Key files

| Path | Description |
|------|-------------|
| `scripts/generate-release-notes.mjs` | Builds `public/release-notes.json` from Git tags/commits |
| `src/lib/release-notes.ts` | Read JSON, `getCurrentVersion()` |
| `src/app/release-notes/page.tsx` | Version list |
| `src/app/release-notes/[version]/page.tsx` | Single version detail |

## Build integration

`npm run build` runs `release-notes:generate` before `next build`.

In Electron production, `RELEASE_NOTES_PATH` points at the bundled `public/release-notes.json` (see `electron/main.ts`).

## Environment

- `RELEASE_NOTES_PATH` — optional override for `public/release-notes.json`
