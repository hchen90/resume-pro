import { describe, expect, it } from "vitest";

import {
  approvedPlanExecutionPrompt,
  chatHistorySummarizationPrompt,
  systemPromptForMode,
  userPrompt,
} from "./prompts";

describe("systemPromptForMode", () => {
  it("returns chat guidance for chat mode", () => {
    const prompt = systemPromptForMode("chat", "en");
    expect(prompt).toContain("普通对话模式");
    expect(prompt).not.toContain("propose_resume_patch 工具提交");
  });

  it("returns edit guidance for edit mode", () => {
    const prompt = systemPromptForMode("edit", "zh-CN");
    expect(prompt).toContain("编辑");
    expect(prompt).toContain("propose_resume_patch");
  });

  it("returns plan drafting guidance for plan send", () => {
    const prompt = systemPromptForMode("plan", "en", "send");
    expect(prompt).toContain("Plan 模式");
    expect(prompt).toContain("draft_resume_plan");
  });

  it("returns execution guidance for plan execute_plan", () => {
    const prompt = systemPromptForMode("plan", "en", "execute_plan");
    expect(prompt).toContain("计划执行");
    expect(prompt).toContain("propose_resume_patch");
  });
});

describe("userPrompt", () => {
  it("includes only the message and resume context by default", () => {
    const prompt = userPrompt({
      message: "Improve summary",
      resumeContext: "{context}",
    });

    expect(prompt).toContain("Improve summary");
    expect(prompt).toContain("{context}");
    expect(prompt).not.toContain("更早的对话摘要");
  });

  it("includes summary, history, and approved plan when present", () => {
    const prompt = userPrompt({
      message: "go",
      resumeContext: "ctx",
      historySummary: "prior summary",
      historyText: "recent chat",
      approvedPlanText: "approved plan block",
    });

    expect(prompt).toContain("prior summary");
    expect(prompt).toContain("recent chat");
    expect(prompt).toContain("approved plan block");
  });
});

describe("chatHistorySummarizationPrompt", () => {
  it("asks for a single paragraph when no summary exists", () => {
    const prompt = chatHistorySummarizationPrompt({
      existingSummary: null,
      locale: "en",
    });
    expect(prompt).toContain("single summary paragraph");
  });

  it("asks to merge when a summary already exists", () => {
    const prompt = chatHistorySummarizationPrompt({
      existingSummary: "old",
      locale: "zh-CN",
    });
    expect(prompt).toContain("Merge the existing summary");
  });
});

describe("approvedPlanExecutionPrompt", () => {
  it("renders steps with and without target node ids", () => {
    const prompt = approvedPlanExecutionPrompt({
      originalMessage: "original request",
      planSummary: "plan overview",
      steps: [
        {
          id: "step-1",
          title: "Rewrite",
          description: "desc",
          targetNodeIds: ["n1", "n2"],
        },
        {
          id: "step-2",
          title: "Trim",
          description: "desc2",
          targetNodeIds: [],
        },
      ],
    });

    expect(prompt).toContain("original request");
    expect(prompt).toContain("plan overview");
    expect(prompt).toContain("n1, n2");
    expect(prompt).toContain("none");
  });
});
