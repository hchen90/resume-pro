# Internationalization and UI Settings

## i18n (`src/lib/i18n.ts`)

### Supported locales

`zh-CN` (default), `en`, `ko`, `es`, `ja`, `ru`, `de`, `fr`

### Core APIs

- `resolveLocale(value?)` — valid locale or default
- `languageName(locale)` — used in AI prompts for reply language
- `dictionaries[locale]` — all UI strings (home, editor, AI, job fit, etc.)

### How locale is applied

1. URL query `?lang=xx`
2. Cookie `resume-pro-locale` (set by `language-switcher` / settings page)

Pages resolve `searchParams.lang ?? cookie` and append `settingsQuery({ lang, style })` on internal links to preserve state.

## UI themes (`src/lib/settings.ts`)

### Styles

| ID | Description |
|----|-------------|
| `github` | Default neutral palette |
| `warm` | Warm palette |
| `slate` | Slate gray palette |

### Core APIs

- `resolveUiStyle(value?)` — from `ui` query param or cookie `resume-pro-ui-style`
- `settingsQuery({ lang, style })` — builds `lang=...&ui=...`

Root `layout.tsx` sets `data-ui-style={uiStyle}` on `<html>`; `globals.css` switches CSS variables by attribute.

## Settings page

`/settings` (`src/app/settings/page.tsx` + `src/components/settings-page.tsx`) provides:

- Locale dropdown
- UI style picker
- Searchable, scrollable AI skills list (name + description + source)
- On Electron: AI API URL / key / model form (`PUT /api/settings/ai`)

The home page links to `/settings` instead of embedding a dropdown panel, so large skill catalogs stay readable.
