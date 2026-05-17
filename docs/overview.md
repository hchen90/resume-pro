# 项目概览

Resume Pro 是一款**本地优先**的开源 AI 简历编辑器：管理多份简历、切换模板预览、用 AI 优化内容，并对照招聘 JD 做契合度评分。

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 16（`output: "standalone"`） |
| UI | React 19、Tailwind CSS 4 |
| 语言 | TypeScript |
| ORM | Drizzle ORM |
| 数据库 | SQLite（默认）、可选 Postgres |
| AI | LangChain + OpenAI 兼容 API |
| 桌面 | Electron 39 |
| 测试 | Vitest |

## 顶层目录结构

```
resume-pro/
├── src/
│   ├── app/              # Next.js App Router：页面与 API
│   ├── components/       # React 组件
│   ├── lib/              # 业务逻辑（db、resume、ai、i18n 等）
│   └── templates/        # 简历 HTML 模板
├── electron/             # Electron 主进程与 preload
├── drizzle/              # Drizzle 迁移产物（sqlite / postgres）
├── scripts/              # 构建与 release notes 脚本
├── public/               # 静态资源
└── docs/                 # 本目录
```

## 核心数据流

```mermaid
flowchart LR
  UI[页面 / 组件] --> Actions[Server Actions / API]
  Actions --> Repo[Repository]
  Repo --> DB[(SQLite / Postgres)]
  UI --> AI[/api/ai]
  AI --> LLM[OpenAI 兼容 API]
  AI --> Repo
```

## 主要功能模块

1. **简历 CRUD**：首页创建列表，编辑页结构化节点编辑，PATCH 持久化。
2. **模板预览**：六种内置模板实时预览，支持打印 / PDF 下载页。
3. **AI 助手**：Chat（建议）、Edit（直接改简历）、Plan（先出计划再执行）。
4. **岗位契合度**：保存 JD，选简历，AI 返回 0–10 分与优劣势分析。
5. **国际化**：8 种语言字典；3 种 UI 主题（github / warm / slate）。
6. **Electron**：开发时连本地 Next；生产打包内置 standalone 服务。

## 环境变量（摘要）

| 变量 | 用途 |
|------|------|
| `DATABASE_PROVIDER` | `sqlite`（默认）或 `postgres` |
| `SQLITE_PATH` | SQLite 文件路径，默认 `./data/resume-pro.sqlite` |
| `DATABASE_URL` | Postgres 连接串 |
| `AI_API_URL` / `AI_API_KEY` / `AI_API_MODEL` | OpenAI 兼容 AI 配置 |
| `APP_TARGET` / `ELECTRON` | 标识 Electron 运行时 |

完整说明见根目录 `.env.example` 与 [README.md](../README.md)。
