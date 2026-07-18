import "server-only";

import { OpenAIChatModel } from "@agentscope-ai/agentscope/model";

import {
  resolveChatModelName,
  resolveSummaryModelName,
  resolveTemperature,
} from "@/lib/ai/model-config";
import { hasAiConfiguration } from "@/lib/ai/model";

export { hasAiConfiguration };

function createOpenAIChatModel(modelName: string, stream = true) {
  if (!process.env.AI_API_KEY) {
    throw new Error("AI_API_KEY is not configured.");
  }

  return new OpenAIChatModel({
    modelName,
    apiKey: process.env.AI_API_KEY,
    stream,
    baseURL: process.env.AI_API_URL || undefined,
    presetGenParams: {
      temperature: resolveTemperature(),
    },
  });
}

export function createAgentScopeChatModel(stream = true) {
  return createOpenAIChatModel(resolveChatModelName(), stream);
}

export function createAgentScopeSummaryModel() {
  return createOpenAIChatModel(resolveSummaryModelName(), false);
}
