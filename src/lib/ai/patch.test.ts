import { describe, expect, it } from "vitest";

import { createDefaultResumeNodes } from "@/lib/resume/defaults";
import type { ResumeWithNodes } from "@/lib/resume/types";

import { aiPlanResponseSchema, applyResumePatches, extractJsonResponse } from "./patch";

function sampleResume(): ResumeWithNodes {
  return {
    id: "resume-1",
    title: "Test Resume",
    templateId: "classic",
    fontPreset: "default",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    nodes: createDefaultResumeNodes("resume-1"),
  };
}

describe("applyResumePatches", () => {
  it("updates an existing node and keeps ordering stable", () => {
    const resume = sampleResume();
    const summary = resume.nodes.find((node) => node.type === "summary");

    expect(summary).toBeDefined();

    const updated = applyResumePatches(resume, [
      {
        op: "update_node",
        nodeId: summary!.id,
        content: { body: "更聚焦前端工程和业务结果。" },
      },
    ]);

    expect(updated.nodes[1].content.body).toBe("更聚焦前端工程和业务结果。");
    expect(updated.nodes.map((node) => node.sortOrder)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("creates nodes after a target node and can switch template", () => {
    const resume = sampleResume();
    const project = resume.nodes.find((node) => node.type === "project");

    const updated = applyResumePatches(resume, [
      {
        op: "create_node",
        nodeType: "custom",
        title: "开源贡献",
        content: { body: "维护一个简历生成工具。" },
        afterNodeId: project!.id,
      },
      { op: "set_template", templateId: "modern" },
    ]);

    expect(updated.templateId).toBe("modern");
    expect(updated.nodes[4].title).toBe("开源贡献");
  });

  it("does not let empty AI patch fields clear existing profile fields", () => {
    const resume = sampleResume();
    const profile = resume.nodes.find((node) => node.type === "profile");

    expect(profile).toBeDefined();

    const updated = applyResumePatches(resume, [
      {
        op: "update_node",
        nodeId: profile!.id,
        content: {
          name: "李四",
          phone: "",
          location: "",
          website: "",
        },
      },
    ]);
    const updatedProfile = updated.nodes.find((node) => node.id === profile!.id);

    expect(updatedProfile?.content.name).toBe("李四");
    expect(updatedProfile?.content.phone).toBe("138-0000-0000");
    expect(updatedProfile?.content.location).toBe("城市");
    expect(updatedProfile?.content.website).toBe("https://example.com");
  });
});

describe("extractJsonResponse", () => {
  it("extracts fenced json", () => {
    expect(extractJsonResponse("```json\n{\"message\":\"ok\"}\n```")).toBe(
      "{\"message\":\"ok\"}",
    );
  });
});

describe("aiPlanResponseSchema", () => {
  it("parses a structured plan and defaults target nodes", () => {
    const parsed = aiPlanResponseSchema.parse({
      message: "请确认以下计划。",
      plan: {
        summary: "优化项目经历。",
        steps: [
          {
            id: "step-1",
            title: "重写项目描述",
            description: "突出业务结果和技术贡献。",
          },
        ],
      },
    });

    expect(parsed.plan.steps[0].targetNodeIds).toEqual([]);
  });
});
