import "server-only";

import { ChatOpenAI } from "@langchain/openai";

import {
  resolveChatModelName,
  resolveSummaryModelName,
  resolveTemperature,
} from "@/lib/ai/model-config";

export {
  defaultChatModel,
  defaultTemperature,
  resolveChatModelName,
  resolveSummaryModelName,
  resolveTemperature,
} from "@/lib/ai/model-config";

export function hasAiConfiguration() {
  return Boolean(process.env.AI_API_KEY);
}

function createConfiguredChatModel(model: string) {
  if (!process.env.AI_API_KEY) {
    throw new Error("AI_API_KEY is not configured.");
  }

  return new ChatOpenAI({
    model,
    apiKey: process.env.AI_API_KEY,
    temperature: resolveTemperature(),
    configuration: process.env.AI_API_URL
      ? { baseURL: process.env.AI_API_URL }
      : undefined,
  });
}

export function createChatModel() {
  return createConfiguredChatModel(resolveChatModelName());
}

export function createSummaryChatModel() {
  return createConfiguredChatModel(resolveSummaryModelName());
}
