# Electron 桌面端

## 职责

将 Next.js 应用包装为桌面程序：开发时加载 `localhost:3000`；生产环境启动内置 standalone 服务器并在 BrowserWindow 中展示。

## 关键文件

| 路径 | 说明 |
|------|------|
| `electron/main.ts` | 主进程：窗口、生产 Next 启动、环境文件 |
| `electron/preload.ts` | Preload 脚本（contextIsolation） |
| `electron-builder.yml` | 打包配置 |
| `scripts/run-electron-builder.mjs` | 调用 electron-builder |
| `src/lib/electron-env.ts` | 检测 Electron、读写 `~/.resume-pro/.env` |
| `dist-electron/` | esbuild 输出的 main/preload CJS |

## 开发与构建命令

| 命令 | 说明 |
|------|------|
| `npm run dev:electron` | 并行启动 Next（3000）与 Electron |
| `npm run build:electron` | 构建 Next standalone + 打包安装包 |
| `npm run pack:electron` | 未打包目录，便于本地检查 |

`package.json` 的 `main` 指向 `dist-electron/main.cjs`。

## 运行时配置

首次启动在 `~/.resume-pro/.env` 生成默认配置（`main.ts` / `electron-env.ts`）：

- `DATABASE_PROVIDER=sqlite`
- `SQLITE_PATH=~/.resume-pro/resume-pro.sqlite`
- `AI_API_*` 占位
- `APP_TARGET=electron`

用户可在应用内 **系统设置** 修改 AI 配置（需重启生效，文案见 i18n `aiSettingsRestartRequired`）。

## 生产启动流程

1. `startProductionNextServer()` 分配本地端口，设置 `HOSTNAME`、`PORT`、`SQLITE_PATH` 等。
2. `createRequire` 加载 `.next/standalone/server.js`。
3. 轮询 HTTP 直至服务就绪，再 `loadURL` 到 BrowserWindow。

## 安全策略

- `contextIsolation: true`，`nodeIntegration: false`
- 外部链接 `shell.openExternal`，阻止窗口内跨域导航

## 与 Web 部署的差异

| 项 | Web | Electron |
|----|-----|----------|
| 数据库路径 | 项目 `./data/` | 用户目录 `~/.resume-pro/` |
| AI 配置 | 项目 `.env` | `~/.resume-pro/.env` + UI 写入 |
| `isElectronRuntime()` | false | true（`APP_TARGET` / `ELECTRON`） |

`next.config.ts` 的 `output: "standalone"` 为 Electron 生产包所必需。
