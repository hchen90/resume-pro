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
  steps: Array<{ title: string; description: string }>;
  resumeContext: string;
}) {
  const steps = input.steps
    .map((step, index) => `${index + 1}. ${step.title}\n${step.description}`)
    .join("\n\n");

  return `用户原始请求：
${input.originalMessage}

用户已经确认执行以下计划：
${input.planSummary}

确认的步骤：
${steps}

请只执行这些已确认步骤，生成必要的结构化 patches。不要执行未列出的改动。

当前简历上下文：
${input.resumeContext}`;
}
