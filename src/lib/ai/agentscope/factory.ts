import "server-only";

import { Agent } from "@agentscope-ai/agentscope/agent";
import { Toolkit } from "@agentscope-ai/agentscope/tool";

import { createAgentScopeChatModel } from "@/lib/ai/agentscope/model";
import { resolveAgentSkillConfiguration } from "@/lib/ai/agentscope/skills";
import { createAssistantTools } from "@/lib/ai/agentscope/tools";
import type { AssistantRunContext } from "@/lib/ai/agentscope/run-context";
import { systemPromptForMode } from "@/lib/ai/prompts";

export function createResumeAssistantAgent(context: AssistantRunContext) {
  const model = createAgentScopeChatModel(true);
  const skillConfiguration = resolveAgentSkillConfiguration();
  const toolkit = new Toolkit({
    tools: createAssistantTools(context),
    skills: skillConfiguration.skills,
    skillDirs: skillConfiguration.skillDirs,
    builtInSkillTool: skillConfiguration.enabled,
  });

  return new Agent({
    name: "ResumeAssistant",
    sysPrompt: systemPromptForMode(context.mode, context.locale, context.action),
    model,
    toolkit,
    maxIters: context.mode === "chat" ? 6 : 10,
    compressionConfig: {
      enabled: false,
      triggerThreshold: Number.MAX_SAFE_INTEGER,
    },
  });
}
