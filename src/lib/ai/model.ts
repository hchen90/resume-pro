import "server-only";

import { ChatOpenAI } from "@langchain/openai";

export function hasAiConfiguration() {
  return Boolean(process.env.AI_API_KEY);
}

export function createChatModel() {
  if (!process.env.AI_API_KEY) {
    throw new Error("AI_API_KEY is not configured.");
  }

  return new ChatOpenAI({
    model: process.env.AI_API_MODEL ?? "gpt-4o-mini",
    apiKey: process.env.AI_API_KEY,
    temperature: 0.3,
    configuration: process.env.AI_API_URL
      ? { baseURL: process.env.AI_API_URL }
      : undefined,
  });
}
