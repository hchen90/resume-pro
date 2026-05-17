# 发布说明模块

## 职责

在构建时生成版本发布说明 JSON，供站内 `/release-notes` 页面展示；首页显示当前版本号。

## 关键文件

| 路径 | 说明 |
|------|------|
| `scripts/generate-release-notes.mjs` | 从 Git 标签/提交生成 `public/release-notes.json` |
| `src/lib/release-notes.ts` | 读取 JSON、`getCurrentVersion()` |
| `src/app/release-notes/page.tsx` | 版本列表 |
| `src/app/release-notes/[version]/page.tsx` | 单版本详情 |

## 构建集成

`npm run build` 会先执行 `release-notes:generate`，再 `next build`。

Electron 生产环境通过 `RELEASE_NOTES_PATH` 指向打包内的 `public/release-notes.json`（见 `electron/main.ts`）。

## 环境变量

- `RELEASE_NOTES_PATH` — 可选，覆盖默认 `public/release-notes.json` 路径
