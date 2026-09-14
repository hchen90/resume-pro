import "server-only";

import { SystemMessage } from "@langchain/core/messages";
import { MessagesAnnotation, START, StateGraph } from "@langchain/langgraph";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";

import type { AssistantRunContext } from "@/lib/ai/langgraph/run-context";
import {
  createAssistantTools,
  skillsSystemPromptSuffix,
} from "@/lib/ai/langgraph/tools";
import { createChatModel } from "@/lib/ai/model";
import { systemPromptForMode } from "@/lib/ai/prompts";

export function resolveAssistantRecursionLimit(context: AssistantRunContext) {
  return context.mode === "chat" ? 6 : 10;
}

export function buildAssistantSystemPrompt(context: AssistantRunContext) {
  const base = systemPromptForMode(context.mode, context.locale, context.action);
  const skillsSuffix = skillsSystemPromptSuffix();
  return skillsSuffix ? `${base}\n\n${skillsSuffix}` : base;
}

export function createResumeAssistantGraph(context: AssistantRunContext) {
  const tools = createAssistantTools(context);
  const model = createChatModel().bindTools(tools);
  const toolNode = new ToolNode(tools);
  const systemPrompt = buildAssistantSystemPrompt(context);

  const callModel = async (state: typeof MessagesAnnotation.State) => {
    const response = await model.invoke([
      new SystemMessage(systemPrompt),
      ...state.messages,
    ]);
    return { messages: [response] };
  };

  return new StateGraph(MessagesAnnotation)
    .addNode("agent", callModel)
    .addNode("tools", toolNode)
    .addEdge(START, "agent")
    .addConditionalEdges("agent", toolsCondition)
    .addEdge("tools", "agent")
    .compile();
}
