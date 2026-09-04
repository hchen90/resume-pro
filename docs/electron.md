# Electron Desktop

## Responsibilities

Wrap the Next.js app as a desktop app: development loads `localhost:3000`; production starts the bundled standalone server inside a `BrowserWindow`.

## Key files

| Path | Description |
|------|-------------|
| `electron/main.ts` | Main process: window, prod Next bootstrap, env file |
| `electron/preload.ts` | Preload script (`contextIsolation`) |
| `electron-builder.yml` | Packaging config |
| `scripts/run-electron-builder.mjs` | Invokes electron-builder |
| `src/lib/electron-env.ts` | Detect Electron; read/write `~/.resume-pro/.env` |
| `dist-electron/` | esbuild output for main/preload CJS |

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev:electron` | Next on :3000 + Electron |
| `npm run build:electron` | Next standalone + installer build |
| `npm run pack:electron` | Unpacked dir for local inspection |

`package.json` `main` points to `dist-electron/main.cjs`.

## Runtime config

First launch creates `~/.resume-pro/.env` (`main.ts` / `electron-env.ts`):

- `DATABASE_PROVIDER=sqlite`
- `SQLITE_PATH=~/.resume-pro/resume-pro.sqlite`
- `WORKSPACE_PATH=~/.resume-pro/workspace`
- `AI_API_*` placeholders
- `APP_TARGET=electron`

Users can change AI settings in-app (**System settings**); restart is required (`aiSettingsRestartRequired` in i18n).

Document storage: [workspace.md](./workspace.md).

## Production startup

1. `startProductionNextServer()` picks a free port and sets `HOSTNAME`, `PORT`, `SQLITE_PATH`, etc.
2. `createRequire` loads `.next/standalone/server.js`.
3. Poll HTTP until ready, then `loadURL` in `BrowserWindow`.

## Security

- `contextIsolation: true`, `nodeIntegration: false`
- External links via `shell.openExternal`; block in-window cross-origin navigation

## Web vs Electron

| Item | Web | Electron |
|------|-----|----------|
| DB path | `./data/` in project | `~/.resume-pro/` |
| AI config | project `.env` | `~/.resume-pro/.env` + UI writer |
| `isElectronRuntime()` | false | true (`APP_TARGET` / `ELECTRON`) |

`next.config.ts` `output: "standalone"` is required for the Electron production bundle.
