# AI 模块

## 职责

通过 OpenAI 兼容 API（LangChain `ChatOpenAI`）提供简历对话建议、结构化编辑、分步计划，以及将模型输出转为可持久化的 patch。

## 关键文件

| 路径 | 说明 |
|------|------|
| `src/lib/ai/model.ts` | `createChatModel()`、`hasAiConfiguration()` |
| `src/lib/ai/types.ts` | `AiMode`：`chat` \| `edit` \| `plan` |
| `src/lib/ai/prompts.ts` | 各模式的 system / user 提示词 |
| `src/lib/ai/context.ts` | `summarizeResume()` 简历上下文 |
| `src/lib/ai/patch.ts` | Patch Schema、`applyResumePatches`、`extractJsonResponse` |
| `src/app/api/ai/route.ts` | `POST` 统一入口 |
| `src/components/resume/ai-panel.tsx` | 编辑页 AI 面板 UI |

## 配置

环境变量（或 Electron `~/.resume-pro/.env`）：

- `AI_API_URL` — 兼容 API Base URL
- `AI_API_KEY` — 未配置时 AI 功能返回「未配置」提示，核心编辑仍可用
- `AI_API_MODEL` — 默认 `gpt-4o-mini`

Electron 下可通过 `SystemSettings` + `POST /api/settings/ai` 写入本地 `.env`（见 [electron.md](./electron.md)）。

## 三种模式

| 模式 | 行为 | 是否写库 |
|------|------|----------|
| `chat` | 纯文本建议 | 否 |
| `edit` | 返回 JSON `{ message, patches }`，应用后 `saveResume` | 是 |
| `plan` | 返回 `{ message, plan }`，用户确认后 `action: execute_plan` 再 edit | 第二次请求写库 |

### Plan 流程

1. `mode: plan`, `action: send` → 返回 `plan.steps[]`（含 `id`、`title`、`description`、`targetNodeIds`）。
2. 用户确认 → `mode: plan`, `action: execute_plan`, 附带 `plan` → 按 `approvedPlanExecutionPrompt` 生成 patches 并保存。

## Patch 协议

定义于 `resumePatchSchema`（`patch.ts`）：

- `update_node` — 部分更新 `title` / `content` / `enabled`（空字段不覆盖）
- `create_node` — 可指定 `afterNodeId` 插入位置
- `delete_node` — 禁止删除 `profile`
- `set_template` — 切换 `templateId`

## API 请求体（`/api/ai`）

```json
{
  "resumeId": "uuid",
  "selectedNodeId": "optional",
  "mode": "chat|edit|plan",
  "action": "send|execute_plan",
  "locale": "zh-CN",
  "message": "用户输入",
  "plan": { }
}
```

响应含 `message`、`patches`；edit / execute_plan 成功时额外返回 `resume`。

## 测试

- `src/lib/ai/patch.test.ts` — patch 合并与 JSON 提取逻辑
