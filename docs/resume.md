# 简历数据模块

## 职责

定义简历与节点的 TypeScript 类型、Zod 校验、默认节点工厂，以及面向 AI 的摘要格式化。

## 关键文件

| 路径 | 说明 |
|------|------|
| `src/lib/resume/types.ts` | 核心类型：`Resume`、`ResumeNode`、`ResumeSaveInput` |
| `src/lib/resume/defaults.ts` | `createDefaultResumeNodes`、`createNode` |
| `src/lib/resume/validation.ts` | `resumeSaveSchema`、`resumeNodeContentSchema` |
| `src/lib/resume/format.ts` | 展示用格式化辅助函数 |

## 节点类型（`ResumeNodeType`）

| 类型 | 典型用途 |
|------|----------|
| `profile` | 姓名、头衔、联系方式（不可删除） |
| `summary` | 个人总结 |
| `experience` | 工作经历（`items[]`） |
| `education` | 教育背景 |
| `project` | 项目经历 |
| `skills` | 技能列表（`skills[]`） |
| `custom` | 自定义区块 |

## 节点内容（`ResumeNodeContent`）

- **Profile 字段**：`name`、`headline`、`email`、`phone`、`location`、`website`
- **正文**：`body`（Markdown）
- **列表项**：`items[]`，每项含 `id`、`title`、`subtitle`、日期、地点、`description`
- **技能**：`skills: string[]`

## 保存语义

`saveResume` 会删除该简历下全部节点后重新插入，因此客户端需提交完整节点列表。API `PATCH /api/resumes/[id]` 使用 `resumeSaveSchema` 校验入参。

## 默认简历

`createResume` 调用 `createDefaultResumeNodes(resumeId, locale)`，按语言生成各区块默认标题与示例结构（见 `defaults.ts`）。

## 与 AI 的衔接

- `src/lib/ai/context.ts` 的 `summarizeResume()` 将简历压缩为模型可读文本，并高亮 `selectedNodeId`。
- `src/lib/ai/patch.ts` 的 `applyResumePatches()` 将 AI 返回的 patch 合并为 `ResumeSaveInput`。

Patch 操作：`update_node`、`create_node`、`delete_node`（`profile` 不可删）、`set_template`。
