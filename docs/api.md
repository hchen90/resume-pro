# HTTP API

所有 API Route 使用 `export const runtime = "nodejs"`，以便访问 SQLite / 文件系统。

## 简历

### `PATCH /api/resumes/[id]`

保存整份简历（标题、模板、全部节点）。

- **Body**：`ResumeSaveInput`（Zod：`resumeSaveSchema`）
- **Response**：`ResumeWithNodes`

### `DELETE /api/resumes/[id]`

删除简历（节点级联删除）。

- **Response**：`{ ok: true }`

## AI

### `POST /api/ai`

简历 AI 助手，详见 [ai.md](./ai.md)。

- **Body**：`resumeId`、`mode`、`message`、`action?`、`plan?`、`locale?`、`selectedNodeId?`
- **Response**：`message`、`patches`、可选 `plan`、`resume`
- **Errors**：404 简历不存在；400 Plan 执行缺少 plan

## 岗位匹配

### `POST /api/job-match`

JD 与简历契合度评分，详见 [job-match.md](./job-match.md)。

- **Body**：`jobDescriptionId`、`resumeId`、`locale?`
- **Response**：`{ result: { score, summary, strengths, gaps, suggestions } }`

## 设置（Electron）

### `POST /api/settings/ai`

仅在 Electron 运行时有效，更新 `~/.resume-pro/.env` 中的 AI 变量。

- **Body**：`aiApiUrl`、`aiApiKey`、`aiApiModel`
- 修改后通常需重启应用使主进程重新加载环境

实现：`src/app/api/settings/ai/route.ts`（调用 `updateElectronAiConfig`）。

## 错误与未配置 AI

当 `AI_API_KEY` 缺失时，`/api/ai` 与 `/api/job-match` 返回 200 + 本地化 `message`（非 5xx），前端据此提示用户配置 AI。
