import { describe, expect, it } from "vitest";

import { createAssistantTools } from "./tools";
import { createAssistantRunContext } from "./run-context";
import type { ResumeWithNodes } from "@/lib/resume/types";

const resume = {
  id: "resume-1",
  title: "Test",
  templateId: "classic",
  updatedAt: "2026-01-01T00:00:00.000Z",
  nodes: [
    {
      id: "summary-1",
      type: "summary",
      title: "Summary",
      enabled: true,
      content: { body: "Hello" },
    },
  ],
} as unknown as ResumeWithNodes;

function makeContext(
  mode: "chat" | "edit" | "plan",
  action: "send" | "execute_plan" = "send",
) {
  return createAssistantRunContext({
    runId: "run-1",
    resumeId: resume.id,
    resume,
    mode,
    action,
    locale: "zh-CN",
    snapshotHash: "hash",
    baseUpdatedAt: resume.updatedAt,
    signal: new AbortController().signal,
  });
}

describe("createAssistantTools", () => {
  it("exposes read-only tools in chat mode", () => {
    const tools = createAssistantTools(makeContext("chat"));
    expect(tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining(["get_resume_context", "get_selected_node"]),
    );
    expect(tools.map((tool) => tool.name)).not.toContain("propose_resume_patch");
    expect(tools.map((tool) => tool.name)).not.toContain("draft_resume_plan");
  });

  it("exposes draft_resume_plan in plan send mode", () => {
    const tools = createAssistantTools(makeContext("plan", "send"));
    expect(tools.map((tool) => tool.name)).toContain("draft_resume_plan");
    expect(tools.map((tool) => tool.name)).not.toContain("propose_resume_patch");
  });

  it("records a proposal from propose_resume_patch", async () => {
    const context = makeContext("edit");
    const tools = createAssistantTools(context);
    const propose = tools.find((tool) => tool.name === "propose_resume_patch");
    expect(propose).toBeDefined();

    const result = await propose!.invoke({
      message: "Update the summary body",
      patches: [
        {
          op: "update_node",
          nodeId: "summary-1",
          content: { body: "Updated" },
        },
      ],
    });

    expect(JSON.parse(String(result))).toMatchObject({ ok: true });
    expect(context.proposal?.patches).toHaveLength(1);
  });
});
