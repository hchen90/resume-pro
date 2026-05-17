# 数据库模块

## 职责

- 抽象 SQLite 与 Postgres 双后端
- 启动时自动建表（`ensureDatabase`）
- 提供简历与 JD 的 Repository 访问层

## 关键文件

| 路径 | 说明 |
|------|------|
| `src/lib/db/client.ts` | `getDbClient()` 单例，按 `DATABASE_PROVIDER` 选择驱动 |
| `src/lib/db/migrate.ts` | `ensureDatabase()`：幂等 `CREATE TABLE IF NOT EXISTS` |
| `src/lib/db/schema/sqlite.ts` | SQLite Drizzle Schema |
| `src/lib/db/schema/postgres.ts` | Postgres Drizzle Schema |
| `src/lib/db/resume-repository.ts` | 简历 CRUD |
| `src/lib/db/job-description-repository.ts` | JD CRUD |
| `drizzle.config.ts` | Drizzle Kit 配置（`db:generate` / `db:push`） |

## 表结构

### `resumes`

| 列 | 说明 |
|----|------|
| `id` | UUID 主键 |
| `title` | 简历标题 |
| `template_id` | 模板 ID，默认 `classic` |
| `created_at` / `updated_at` | ISO 时间戳 |

### `resume_nodes`

| 列 | 说明 |
|----|------|
| `id` | 节点 UUID |
| `resume_id` | 外键，级联删除 |
| `type` | 节点类型（见 [resume.md](./resume.md)） |
| `title` | 区块标题 |
| `content` | JSON 内容（SQLite 用 `mode: "json"`） |
| `sort_order` | 排序 |
| `enabled` | 是否在预览中显示 |

### `job_descriptions`

| 列 | 说明 |
|----|------|
| `id` | UUID |
| `title` | JD 标题 |
| `content` | JD 全文 |
| `created_at` / `updated_at` | ISO 时间戳 |

## Provider 差异

- **SQLite**：`better-sqlite3`，WAL + 外键；路径默认 `./data/resume-pro.sqlite`；Electron 下默认 `~/.resume-pro/resume-pro.sqlite`。
- **Postgres**：`pg` Pool；`content` 存 JSON 字符串；`enabled` 用 `0/1` 整数。

## Repository API

### 简历（`resume-repository.ts`）

- `listResumes()` — 按 `updatedAt` 降序
- `getResume(id)` — 含节点，按 `sortOrder` 排序
- `createResume(title, locale?)` — 创建默认节点（见 `createDefaultResumeNodes`）
- `saveResume(id, ResumeSaveInput)` — 更新简历并**全量替换**节点
- `deleteResume(id)`

### JD（`job-description-repository.ts`）

- `listJobDescriptions()` / `getJobDescription(id)`
- `createJobDescription({ title, content })`
- `updateJobDescription(id, input)`

## 迁移策略

运行时通过 `migrate.ts` 内联 DDL 保证表存在；`drizzle/` 目录存放 Kit 生成的迁移文件，用于 `npm run db:generate` 与 `db:push` 的 schema 演进。
