# 岗位契合度模块

## 职责

保存招聘 JD，选择已有简历，调用 AI 评估匹配度（0–10 分）并输出优势、差距与优化建议。

## 关键文件

| 路径 | 说明 |
|------|------|
| `src/lib/job-descriptions/types.ts` | `JobDescription` 类型 |
| `src/lib/db/job-description-repository.ts` | JD 持久化 |
| `src/app/tools/job-match/page.tsx` | 工具首页：列表与新建 JD |
| `src/app/tools/job-match/[id]/page.tsx` | 单条 JD 编辑与匹配执行 |
| `src/components/job-match/job-match-tool.tsx` | 客户端匹配 UI |
| `src/app/api/job-match/route.ts` | `POST` 评分 API |
| `src/app/actions.ts` | `createJobDescriptionAction`、`updateJobDescriptionAction` |

## 用户流程

1. 首页「工具」→ **岗位契合度雷达**（`/tools/job-match`）。
2. 粘贴 JD 标题与内容，Server Action 保存。
3. 进入某条 JD 详情页，选择一份简历，点击「开始匹配评分」。
4. 前端 `POST /api/job-match`，展示分数与结构化分析。

## API（`/api/job-match`）

请求：

```json
{
  "jobDescriptionId": "uuid",
  "resumeId": "uuid",
  "locale": "zh-CN"
}
```

响应 `result`：

| 字段 | 说明 |
|------|------|
| `score` | 0–10，保留一位小数 |
| `summary` | 一句总评 |
| `strengths` | 匹配优势列表 |
| `gaps` | 差距 / 风险 |
| `suggestions` | 优化建议 |

未配置 `AI_API_KEY` 时返回与 AI 助手相同的未配置提示。

## 提示词策略

系统提示要求：仅基于简历已有事实评分、不编造经历、按用户语言回复、**只返回 JSON**（见 `route.ts` 内联 prompt）。

简历上下文通过 `summarizeResume(resume)` 注入，与 AI 编辑共用同一摘要逻辑。
