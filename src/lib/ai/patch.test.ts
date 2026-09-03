import { describe, expect, it } from "vitest";

import { createDefaultResumeNodes } from "@/lib/resume/defaults";
import type { ResumeWithNodes } from "@/lib/resume/types";

import {
  aiPlanResponseSchema,
  applyResumePatches,
  extractJsonResponse,
  parseAiEditResponse,
  resumePatchSchema,
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

  it("appends a new project item instead of replacing existing items", () => {
    const resume = sampleResume();
    const project = resume.nodes.find((node) => node.type === "project");

    expect(project).toBeDefined();

    const existingItem = project!.content.items?.[0];
    expect(existingItem).toBeDefined();

    const updated = applyResumePatches(resume, [
      {
        op: "update_node",
        nodeId: project!.id,
        content: {
          items: [
            {
              id: crypto.randomUUID(),
              title: "AI 测试项目",
              subtitle: "独立开发",
              startDate: "2024-01",
              endDate: "2024-06",
              location: "远程",
              description: "- 构建 LLM 工作流\n- 用于验证 AI 编辑能力",
            },
          ],
        },
      },
    ]);
    const updatedProject = updated.nodes.find((node) => node.id === project!.id);

    expect(updatedProject?.content.items).toHaveLength(2);
    expect(updatedProject?.content.items?.[0]?.id).toBe(existingItem!.id);
    expect(updatedProject?.content.items?.[1]?.title).toBe("AI 测试项目");
  });

  it("updates an existing item when the patch reuses its id", () => {
    const resume = sampleResume();
    const project = resume.nodes.find((node) => node.type === "project");

    expect(project).toBeDefined();

    const existingItem = project!.content.items?.[0];
    expect(existingItem).toBeDefined();

    const updated = applyResumePatches(resume, [
      {
        op: "update_node",
        nodeId: project!.id,
        content: {
          items: [
            {
              id: existingItem!.id,
              title: "智能客服系统开发",
              description: "- 使用 NLP 提升自动回复准确率",
            },
          ],
        },
      },
    ]);
    const updatedProject = updated.nodes.find((node) => node.id === project!.id);

    expect(updatedProject?.content.items).toHaveLength(1);
    expect(updatedProject?.content.items?.[0]?.title).toBe("智能客服系统开发");
    expect(updatedProject?.content.items?.[0]?.description).toBe(
      "- 使用 NLP 提升自动回复准确率",
    );
  });

  it("removes items listed in removeItemIds", () => {
    const resume = sampleResume();
    const education = resume.nodes.find((node) => node.type === "education");
    expect(education).toBeDefined();

    education!.content.items = [
      {
        id: "edu-legacy",
        title: "Legacy School",
        description: "old format",
      },
      {
        id: "edu-structured",
        title: "Structured School",
        subtitle: "Bachelor",
        startDate: "2016",
        endDate: "2020",
      },
    ];

    const updated = applyResumePatches(resume, [
      {
        op: "update_node",
        nodeId: education!.id,
        removeItemIds: ["edu-legacy"],
      },
    ]);
    const updatedEducation = updated.nodes.find(
      (node) => node.id === education!.id,
    );

    expect(updatedEducation?.content.items).toHaveLength(1);
    expect(updatedEducation?.content.items?.[0]?.id).toBe("edu-structured");
  });

  it("replaces and reorders items when replaceItems is true", () => {
    const resume = sampleResume();
    const education = resume.nodes.find((node) => node.type === "education");
    expect(education).toBeDefined();

    education!.content.items = [
      {
        id: "edu-legacy",
        title: "Legacy School",
      },
      {
        id: "edu-bachelor",
        title: "Bachelor School",
        startDate: "2016",
        endDate: "2020",
        description: "kept description",
      },
    ];

    const updated = applyResumePatches(resume, [
      {
        op: "update_node",
        nodeId: education!.id,
        replaceItems: true,
        content: {
          items: [
            {
              id: "edu-master",
              title: "Master School",
              startDate: "2021",
              endDate: "2023",
            },
            {
              id: "edu-bachelor",
              title: "Bachelor School",
              startDate: "2016",
              endDate: "2020",
            },
          ],
        },
      },
    ]);
    const updatedEducation = updated.nodes.find(
      (node) => node.id === education!.id,
    );

    expect(updatedEducation?.content.items?.map((item) => item.id)).toEqual([
      "edu-master",
      "edu-bachelor",
    ]);
    expect(updatedEducation?.content.items?.[1]?.description).toBe(
      "kept description",
    );
  });

  it("preserves omitted item fields when replaceItems only reorders by id/title", () => {
    const resume = sampleResume();
    const experience = resume.nodes.find((node) => node.type === "experience")!;
    experience.content.items = [
      {
        id: "exp-a",
        title: "Company A",
        subtitle: "Engineer",
        startDate: "2020-01",
        endDate: "2021-01",
        location: "Shanghai",
        description: "Built APIs",
      },
      {
        id: "exp-b",
        title: "Company B",
        subtitle: "Lead",
        startDate: "2021-02",
        endDate: "2024-06",
        description: "Led team",
      },
    ];

    const updated = applyResumePatches(resume, [
      {
        op: "update_node",
        nodeId: experience.id,
        replaceItems: true,
        content: {
          items: [
            { id: "exp-b", title: "Company B" },
            { id: "exp-a", title: "Company A" },
          ],
        },
      },
    ]);
    const items = updated.nodes.find((node) => node.id === experience.id)
      ?.content.items;

    expect(items?.map((item) => item.id)).toEqual(["exp-b", "exp-a"]);
    expect(items?.[0]).toMatchObject({
      id: "exp-b",
      title: "Company B",
      subtitle: "Lead",
      startDate: "2021-02",
      endDate: "2024-06",
      description: "Led team",
    });
    expect(items?.[1]).toMatchObject({
      id: "exp-a",
      title: "Company A",
      subtitle: "Engineer",
      startDate: "2020-01",
      endDate: "2021-01",
      location: "Shanghai",
      description: "Built APIs",
    });
  });

  it("keeps omitted education items when upserting without removeItemIds or replaceItems", () => {
    const resume = sampleResume();
    const education = resume.nodes.find((node) => node.type === "education")!;
    education.content.items = [
      { id: "edu-legacy", title: "Legacy Hangzhou" },
      { id: "edu-hzdu", title: "Hangzhou Dianzi", startDate: "2016", endDate: "2020" },
    ];

    const updated = applyResumePatches(resume, [
      {
        op: "update_node",
        nodeId: education.id,
        content: {
          items: [
            {
              id: "edu-uts",
              title: "UTS",
              startDate: "2020",
              endDate: "2022",
            },
          ],
        },
      },
    ]);
    const items = updated.nodes.find((node) => node.id === education.id)
      ?.content.items;

    expect(items?.map((item) => item.id)).toEqual([
      "edu-legacy",
      "edu-hzdu",
      "edu-uts",
    ]);
  });

  it("applies year-only startDate and endDate onto an existing education item", () => {
    const resume = sampleResume();
    const education = resume.nodes.find((node) => node.type === "education")!;
    education.content.items = [
      {
        id: "edu-uts-ai-pm-master",
        title: "UTS",
        subtitle: "AI Project Management",
        location: "Sydney",
      },
    ];

    const updated = applyResumePatches(resume, [
      {
        op: "update_node",
        nodeId: education.id,
        content: {
          items: [
            {
              id: "edu-uts-ai-pm-master",
              title: "UTS",
              startDate: "2020",
              endDate: "2022",
            },
          ],
        },
      },
    ]);
    const item = updated.nodes.find((node) => node.id === education.id)
      ?.content.items?.[0];

    expect(item?.startDate).toBe("2020");
    expect(item?.endDate).toBe("2022");
  });

  it("can remove a duplicate and update year-only dates in one patch", () => {
    const resume = sampleResume();
    const education = resume.nodes.find((node) => node.type === "education")!;
    education.content.items = [
      { id: "edu-legacy", title: "Legacy" },
      {
        id: "edu-uts",
        title: "UTS",
        location: "Sydney",
      },
    ];

    const updated = applyResumePatches(resume, [
      {
        op: "update_node",
        nodeId: education.id,
        removeItemIds: ["edu-legacy"],
        content: {
          items: [
            {
              id: "edu-uts",
              title: "UTS",
              startDate: "2020",
              endDate: "2022",
            },
          ],
        },
      },
    ]);
    const items = updated.nodes.find((node) => node.id === education.id)
      ?.content.items;

    expect(items).toHaveLength(1);
    expect(items?.[0]?.id).toBe("edu-uts");
    expect(items?.[0]?.startDate).toBe("2020");
    expect(items?.[0]?.endDate).toBe("2022");
  });

  it("accepts removeItemIds and replaceItems on resumePatchSchema", () => {
    const parsed = resumePatchSchema.safeParse({
      op: "update_node",
      nodeId: "node-1",
      replaceItems: true,
      removeItemIds: ["item-1"],
      content: {
        items: [{ id: "item-2", title: "Kept" }],
      },
    });

    expect(parsed.success).toBe(true);
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
