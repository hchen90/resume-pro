import { describe, expect, it } from "vitest";

import { createDefaultResumeNodes } from "@/lib/resume/defaults";
import type { ResumeWithNodes } from "@/lib/resume/types";

import {
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

describe("extractJsonResponse", () => {
  it("extracts a bare object when not fenced", () => {
    expect(extractJsonResponse('noise {"a":1} trailing')).toBe('{"a":1}');
  });

  it("returns the original text when no json is present", () => {
    expect(extractJsonResponse("just words")).toBe("just words");
  });
});

describe("parseAiEditResponse normalization", () => {
  it("maps action verbs to ops", () => {
    const resume = sampleResume();
    const summary = resume.nodes.find((node) => node.type === "summary")!;

    const parsed = parseAiEditResponse(
      JSON.stringify({
        message: "ok",
        patches: [
          { action: "update", nodeId: summary.id, content: { body: "x" } },
          { action: "delete", nodeId: summary.id },
          { action: "set_template", templateId: "modern" },
          { action: "create", title: "工作经历", content: { body: "b" } },
        ],
      }),
      resume,
    );

    const ops = parsed.patches.map((patch) => patch.op);
    expect(ops).toContain("update_node");
    expect(ops).toContain("delete_node");
    expect(ops).toContain("set_template");
    expect(ops).toContain("create_node");
  });

  it("infers update_node from a bare nodeId", () => {
    const resume = sampleResume();
    const summary = resume.nodes.find((node) => node.type === "summary")!;

    const parsed = parseAiEditResponse(
      JSON.stringify({
        message: "ok",
        patches: [{ nodeId: summary.id, content: { body: "hello" } }],
      }),
      resume,
    );

    expect(parsed.patches[0]?.op).toBe("update_node");
  });

  it("infers create_node type from the title when nodeType is missing", () => {
    const parsed = parseAiEditResponse(
      JSON.stringify({
        message: "ok",
        patches: [{ op: "create_node", title: "个人项目", content: {} }],
      }),
    );

    expect(parsed.patches[0]?.op).toBe("create_node");
    if (parsed.patches[0]?.op === "create_node") {
      expect(parsed.patches[0].nodeType).toBe("project");
    }
  });

  it("skips unrecognized patch shapes", () => {
    const parsed = parseAiEditResponse(
      JSON.stringify({ message: "ok", patches: ["not-an-object", { foo: "bar" }] }),
    );

    expect(parsed.patches).toHaveLength(0);
    expect(parsed.skipped.length).toBeGreaterThan(0);
  });
});

describe("parseAiEditResponse title inference", () => {
  it.each([
    ["联系方式", "profile"],
    ["关于我", "summary"],
    ["工作履历", "experience"],
    ["教育背景", "education"],
    ["技能专长", "skills"],
  ])("infers %s as %s", (title, expected) => {
    const parsed = parseAiEditResponse(
      JSON.stringify({
        message: "ok",
        patches: [{ op: "create_node", title, content: {} }],
      }),
    );

    const patch = parsed.patches[0];
    expect(patch?.op).toBe("create_node");
    if (patch?.op === "create_node") {
      expect(patch.nodeType).toBe(expected);
    }
  });

  it("defaults to custom when the title has no hint", () => {
    const parsed = parseAiEditResponse(
      JSON.stringify({
        message: "ok",
        patches: [{ op: "create_node", title: "Zzz", content: {} }],
      }),
    );
    const patch = parsed.patches[0];
    if (patch?.op === "create_node") {
      expect(patch.nodeType).toBe("custom");
    }
  });
});

describe("applyResumePatches item merges", () => {
  it("appends a new item that arrives without an id", () => {
    const resume = sampleResume();
    const project = resume.nodes.find((node) => node.type === "project")!;
    const before = project.content.items?.length ?? 0;

    const updated = applyResumePatches(resume, [
      {
        op: "update_node",
        nodeId: project.id,
        content: {
          items: [
            {
              title: "新项目",
              description: "- 无 id 的新条目",
            } as never,
          ],
        },
      },
    ]);

    const updatedProject = updated.nodes.find((node) => node.id === project.id);
    expect(updatedProject?.content.items?.length).toBe(before + 1);
  });
});

describe("applyResumePatches deletions", () => {
  it("removes a node and reindexes sort order", () => {
    const resume = sampleResume();
    const summary = resume.nodes.find((node) => node.type === "summary")!;
    const before = resume.nodes.length;

    const updated = applyResumePatches(resume, [
      { op: "delete_node", nodeId: summary.id },
    ]);

    expect(updated.nodes).toHaveLength(before - 1);
    expect(updated.nodes.map((node) => node.sortOrder)).toEqual(
      updated.nodes.map((_, index) => index),
    );
  });

  it("keeps the profile node even if a delete targets it", () => {
    const resume = sampleResume();
    const profile = resume.nodes.find((node) => node.type === "profile")!;

    const updated = applyResumePatches(resume, [
      { op: "delete_node", nodeId: profile.id },
    ]);

    expect(updated.nodes.some((node) => node.id === profile.id)).toBe(true);
  });
});
