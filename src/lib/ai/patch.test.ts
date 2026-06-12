import { describe, expect, it } from "vitest";

import { createDefaultResumeNodes } from "@/lib/resume/defaults";
import type { ResumeWithNodes } from "@/lib/resume/types";

import {
  aiPlanResponseSchema,
  applyResumePatches,
  extractJsonResponse,
  parseAiEditResponse,
} from "./patch";

function sampleResume(): ResumeWithNodes {
  return {
    id: "resume-1",
    title: "Test Resume",
    templateId: "classic",
    fontPreset: "sans",
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

  it("migrates experience body into items when AI writes to body", () => {
    const resume = sampleResume();
    const experience = resume.nodes.find((node) => node.type === "experience");

    expect(experience).toBeDefined();
    experience!.content.items = [
      {
        id: "empty-item",
        title: "",
        subtitle: "",
        startDate: "",
        endDate: "",
        location: "",
        description: "",
      },
    ];

    const updated = applyResumePatches(resume, [
      {
        op: "update_node",
        nodeId: experience!.id,
        content: {
          body: "**Acme Corp | Senior Engineer**\n- Shipped billing platform",
        },
      },
    ]);
    const updatedExperience = updated.nodes.find(
      (node) => node.id === experience!.id,
    );

    expect(updatedExperience?.content.body).toBeUndefined();
    expect(updatedExperience?.content.items?.[0]?.title).toBe(
      "**Acme Corp | Senior Engineer**",
    );
    expect(updatedExperience?.content.items?.[0]?.description).toBe(
      "- Shipped billing platform",
    );
  });

  it("migrates body into items when creating experience nodes", () => {
    const resume = sampleResume();

    const updated = applyResumePatches(resume, [
      {
        op: "create_node",
        nodeType: "experience",
        title: "实习经历",
        content: {
          body: "Startup Inc\nBuilt MVP in 8 weeks",
        },
      },
    ]);
    const created = updated.nodes.find((node) => node.title === "实习经历");

    expect(created?.content.body).toBeUndefined();
    expect(created?.content.items?.[0]?.title).toBe("Startup Inc");
    expect(created?.content.items?.[0]?.description).toBe(
      "Built MVP in 8 weeks",
    );
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

describe("parseAiEditResponse", () => {
  it("normalizes json-patch style updates", () => {
    const resume = sampleResume();
    const summary = resume.nodes.find((node) => node.type === "summary");

    const parsed = parseAiEditResponse(
      JSON.stringify({
        message: "Updated summary.",
        patches: [
          {
            op: "update_node",
            path: `/nodes/${summary!.id}/content`,
            value: { body: "Clear bullet-style summary." },
          },
        ],
      }),
      resume,
    );

    expect(parsed.patches).toHaveLength(1);
    expect(parsed.patches[0]?.op).toBe("update_node");
  });

  it("maps invalid create_node types instead of failing", () => {
    const parsed = parseAiEditResponse(
      JSON.stringify({
        message: "Added section.",
        patches: [
          {
            op: "create_node",
            nodeType: "个人简介",
            title: "简介",
            content: { body: "Hello" },
          },
        ],
      }),
    );

    expect(parsed.patches[0]?.op).toBe("create_node");
    if (parsed.patches[0]?.op === "create_node") {
      expect(parsed.patches[0].nodeType).toBe("summary");
    }
  });
});
