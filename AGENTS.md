# Resume Pro — Agent 指引

面向在本仓库中工作的 AI Agent 与开发者。

## 项目简介

本地优先的 AI 简历编辑器（Next.js 16 + React 19 + Drizzle + SQLite/Postgres + LangChain + Electron）。功能包括结构化简历编辑、多模板预览、AI 优化（Chat / Edit / Plan）、岗位 JD 契合度评分。

## 文档（优先阅读）

模块说明已拆分到 [`docs/`](./docs/) 目录：

| 文档 | 内容 |
|------|------|
| [docs/README.md](./docs/README.md) | 文档索引 |
| [docs/overview.md](./docs/overview.md) | 技术栈、目录结构、数据流 |
| [docs/database.md](./docs/database.md) | 数据库与 Repository |
| [docs/resume.md](./docs/resume.md) | 简历类型、节点、Patch |
| [docs/templates.md](./docs/templates.md) | 简历模板 |
| [docs/ai.md](./docs/ai.md) | AI 模式与 API |
| [docs/job-match.md](./docs/job-match.md) | 岗位契合度工具 |
| [docs/frontend.md](./docs/frontend.md) | 页面与组件 |
| [docs/api.md](./docs/api.md) | HTTP API |
| [docs/i18n-and-settings.md](./docs/i18n-and-settings.md) | 多语言与主题 |
| [docs/electron.md](./docs/electron.md) | 桌面端 |
| [docs/release-notes.md](./docs/release-notes.md) | 发布说明 |

修改某模块前，先打开对应文档了解边界与关键路径。

## 代码布局（速查）

```
src/app/           # 页面、API Routes、Server Actions
src/components/    # UI（resume/、job-match/、system-settings）
src/lib/           # db、resume、ai、i18n、settings、electron-env
src/templates/     # 简历 HTML 模板
electron/          # 主进程
drizzle/           # ORM 迁移文件
```

## 开发约定

- **数据库**：默认 SQLite；`ensureDatabase()` 在首次 Repository 调用时建表。勿在客户端引用 `server-only` 模块。
- **保存简历**：`saveResume` 全量替换节点；PATCH 需提交完整 `nodes` 数组。
- **AI**：依赖 `AI_API_KEY`；未配置时 API 返回友好提示，不抛 500。Edit/Plan 执行路径必须解析 JSON patch（见 `src/lib/ai/patch.ts`）。
- **i18n**：新增 UI 文案需同步 `src/lib/i18n.ts` 中所有 `dictionaries` 语言项。
- **链接**：站内跳转携带 `settingsQuery({ lang, style })` 以保持语言与主题。
- **测试**：`npm run test`（Vitest）；改 patch/registry 时补充测试。

## 常用命令

```bash
npm run dev              # Web 开发
npm run dev:electron     # 桌面开发
npm run build            # 生产构建（含 release notes）
npm run lint && npm run typecheck && npm run test
npm run db:generate      # Drizzle 迁移生成
npm run db:push          # 推送 schema
```

环境变量见 `.env.example` 与 [README.md](./README.md)。

<!-- BEGIN:nextjs-agent-rules -->
## Next.js 注意

**This is NOT the Next.js you know.** 本仓库使用的 Next.js 16 与常见训练数据中的 API/约定可能不同。写路由、数据获取或配置前，请阅读 `node_modules/next/dist/docs/` 中相关指南，并遵守其中的弃用说明。
<!-- END:nextjs-agent-rules -->
