import "server-only";

import { tool } from "@langchain/core/tools";
import { z } from "zod";

import type { AssistantRunContext } from "@/lib/ai/langgraph/run-context";
import { assertNotCancelled } from "@/lib/ai/langgraph/run-context";
import {
  listConfiguredAgentSkills,
  readSkillMarkdown,
} from "@/lib/ai/skills";

export function createSkillTool(context: AssistantRunContext) {
  return tool(
    (input) => {
      assertNotCancelled(context);
      const skills = listConfiguredAgentSkills();
      const content = readSkillMarkdown(input.name, skills);
      if (!content) {
        const available = skills.map((skill) => skill.name).join(", ");
        return JSON.stringify({
          ok: false,
          error: `Unknown skill "${input.name}". Available: ${available || "(none)"}`,
        });
      }

      return JSON.stringify({
        ok: true,
        name: input.name,
        content,
      });
    },
    {
      name: "Skill",
      description:
        "Load the full SKILL.md instructions for a named resume skill when its description matches the user request.",
      schema: z.object({
        name: z.string().min(1).describe("Skill name from the available skills catalog"),
      }),
    },
  );
}
