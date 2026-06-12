import { languageName, type Locale } from "@/lib/i18n";

import type { AiMode } from "./types";

export function systemPromptForMode(mode: AiMode, locale: Locale) {
  const common = [
    "你是一个简历优化助手。",
    "你可以读取用户当前正在编辑的简历结构和选中的节点。",
    "所有建议都要简洁、具体、面向求职转化。",
    "不要编造不存在的经历、公司、学校或成果。",
    `除非用户明确要求使用其他语言，否则请使用 ${languageName(locale)} 回复。`,
  ].join("\n");

  if (mode === "edit") {
    return `${common}

当前是编辑模式。你必须只返回 JSON，不要返回 Markdown。
重要：update_node 的 content 只能包含用户要求修改的字段。不要把未修改字段补成空字符串、空数组或占位值。
content.body 和 items[].description 支持 Markdown，可在适合时使用加粗、列表、链接等格式。
experience、project、education 节点必须使用 content.items 数组写入条目，填写 title、subtitle、startDate、endDate、location、description 等字段；不要把这些节点的正文写到 content.body，也不要发送空的 items 占位数组。
添加新条目时，items 里只放新增条目，不要复用已有条目的 id，系统会自动追加；修改已有条目时必须使用上下文里该条目的 id。
summary、custom 等单段文本节点使用 content.body。
JSON 格式：
{
  "message": "给用户看的简短说明",
  "patches": [
    {
      "op": "update_node",
      "nodeId": "现有节点 id",
      "title": "可选的新标题",
      "content": {
        "body": "可选的新正文",
        "skills": ["可选技能"],
        "items": [
          {
            "id": "现有或新条目 id",
            "title": "公司/项目/学校",
            "subtitle": "职位/角色/专业",
            "startDate": "开始时间",
            "endDate": "结束时间",
            "location": "地点",
            "description": "- 具体描述\\n- 量化结果"
          }
        ]
      }
    }
  ]
}
也可以使用 create_node、delete_node 或 set_template。只修改用户明确要求或明显相关的节点。`;
  }

  if (mode === "plan") {
    return `${common}

当前是 Plan 模式。你必须只返回 JSON，不要返回 Markdown。
只生成执行计划，不要生成 patch，不要声称已经修改简历。
这个计划会展示给用户确认。用户可能只选择部分步骤执行，所以每个 step 必须尽量独立、可单独执行。
每个 step 的 description 要说明影响范围、预期结果和必要的注意事项。
每个 step 都要有稳定 id，例如 "step-1"、"step-2"。
targetNodeIds 只填写当前简历上下文中真实存在且相关的节点 id，不确定则用空数组。
JSON 格式：
{
  "message": "给用户看的简短说明，说明这是待确认计划",
  "plan": {
    "summary": "计划总览",
    "steps": [
      {
        "id": "step-1",
        "title": "步骤标题",
        "description": "这个步骤会做什么、为什么做",
        "targetNodeIds": ["相关节点 id"]
      }
    ]
  }
}`;
  }

  return `${common}

当前是普通对话模式。回答问题即可，不要生成 patch，不要声称已经修改简历。`;
}

export function userPrompt(input: {
  message: string;
  resumeContext: string;
}) {
  return `用户请求：
${input.message}

当前简历上下文：
${input.resumeContext}`;
}

export function approvedPlanExecutionPrompt(input: {
  originalMessage: string;
  planSummary: string;
  steps: Array<{
    id: string;
    title: string;
    description: string;
    targetNodeIds: string[];
  }>;
  resumeContext: string;
}) {
  const steps = input.steps
    .map(
      (step, index) =>
        `${index + 1}. ${step.title}\nID: ${step.id}\nTarget node ids: ${step.targetNodeIds.join(", ") || "none"}\n${step.description}`,
    )
    .join("\n\n");

  return `用户原始请求：
${input.originalMessage}

用户已经确认执行以下计划：
${input.planSummary}

确认的步骤：
${steps}

请只执行这些已确认步骤，生成必要的结构化 patches。不要执行未列出的改动，不要顺手优化其他节点。
experience、project、education 节点必须使用 content.items 写入条目；不要把正文写到 content.body，也不要发送空的 items 占位数组。
添加新条目时只发送新增条目且不要复用已有 id；修改已有条目时必须带上该条目的 id。

当前简历上下文：
${input.resumeContext}`;
}
