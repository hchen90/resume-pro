import { NextResponse } from "next/server";
import { z } from "zod";

import { summarizeResume } from "@/lib/ai/context";
import { createChatModel, hasAiConfiguration } from "@/lib/ai/model";
import { extractJsonResponse } from "@/lib/ai/patch";
import { getJobDescription } from "@/lib/db/job-description-repository";
import { getResume } from "@/lib/db/resume-repository";
import { dictionaries, languageName, locales, resolveLocale } from "@/lib/i18n";

export const runtime = "nodejs";

const jobMatchRequestSchema = z.object({
  jobDescriptionId: z.string(),
  resumeId: z.string(),
  locale: z.enum(locales).optional(),
});

const jobMatchResultSchema = z.object({
  score: z.number().min(0).max(10),
  summary: z.string(),
  strengths: z.array(z.string()).default([]),
  gaps: z.array(z.string()).default([]),
  suggestions: z.array(z.string()).default([]),
});

export async function POST(request: Request) {
  const input = jobMatchRequestSchema.parse(await request.json());
  const locale = resolveLocale(input.locale);
  const t = dictionaries[locale];
  const [jobDescription, resume] = await Promise.all([
    getJobDescription(input.jobDescriptionId),
    getResume(input.resumeId),
  ]);

  if (!jobDescription) {
    return new NextResponse("Job description not found.", { status: 404 });
  }

  if (!resume) {
    return new NextResponse("Resume not found.", { status: 404 });
  }

  if (!hasAiConfiguration()) {
    return NextResponse.json({
      message: t.aiNotConfigured,
    });
  }

  const model = createChatModel();
  const result = await model.invoke([
    {
      role: "system",
      content: [
        "你是一个严格的招聘岗位匹配度评估助手。",
        "你会读取 JD 和结构化简历，只基于已有事实评分，不要编造经历。",
        "评分使用 0 到 10 的一位小数，10.0 表示高度匹配。",
        `除非用户明确要求使用其他语言，否则请使用 ${languageName(locale)} 回复。`,
        "你必须只返回 JSON，不要返回 Markdown。",
        'JSON 格式：{"score":8.2,"summary":"一句总评","strengths":["优势"],"gaps":["差距"],"suggestions":["建议"]}',
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        `JD 标题：${jobDescription.title}`,
        "JD 内容：",
        jobDescription.content,
        "当前简历上下文：",
        summarizeResume(resume),
      ].join("\n\n"),
    },
  ]);

  const content = stringifyModelContent(result.content);
  const parsed = jobMatchResultSchema.parse(
    JSON.parse(extractJsonResponse(content)),
  );

  return NextResponse.json({
    result: {
      ...parsed,
      score: Math.round(parsed.score * 10) / 10,
    },
  });
}

function stringifyModelContent(content: unknown) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        if (
          part &&
          typeof part === "object" &&
          "text" in part &&
          typeof part.text === "string"
        ) {
          return part.text;
        }

        return JSON.stringify(part);
      })
      .join("\n");
  }

  return String(content ?? "");
}
