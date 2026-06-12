import "server-only";

import type { BaseLanguageModelInput } from "@langchain/core/language_models/base";
import type { AIMessageChunk } from "@langchain/core/messages";
import type { ChatOpenAI } from "@langchain/openai";

import { AiInvokeError, formatAiInvokeError } from "./invoke-error";

export type AiInvokeContext = {
  label: string;
  resumeId?: string;
  mode?: string;
  action?: string;
};

export { AiInvokeError, formatAiInvokeError } from "./invoke-error";

export async function invokeChatModel(
  model: ChatOpenAI,
  messages: BaseLanguageModelInput,
  context: AiInvokeContext,
): Promise<AIMessageChunk> {
  const modelName = resolveModelName(model);
  const messageCount = countMessages(messages);
  const startedAt = Date.now();

  console.log(
    "[ai:invoke:start]",
    JSON.stringify({
      label: context.label,
      model: modelName,
      mode: context.mode,
      action: context.action,
      resumeId: context.resumeId,
      messageCount,
    }),
  );

  try {
    const result = await model.invoke(messages);
    const responseLength = stringifyContentLength(result.content);

    console.log(
      "[ai:invoke:ok]",
      JSON.stringify({
        label: context.label,
        model: modelName,
        durationMs: Date.now() - startedAt,
        responseLength,
      }),
    );

    return result;
  } catch (error) {
    const formatted = formatAiInvokeError(error);

    console.error(
      "[ai:invoke:error]",
      JSON.stringify({
        label: context.label,
        model: modelName,
        durationMs: Date.now() - startedAt,
        status: formatted.status,
        code: formatted.code,
        message: formatted.message,
      }),
    );

    throw new AiInvokeError(formatted.message, {
      status: formatted.status,
      code: formatted.code,
    });
  }
}

function resolveModelName(model: ChatOpenAI) {
  if ("model" in model && typeof model.model === "string") {
    return model.model;
  }

  return process.env.AI_API_MODEL ?? "gpt-4o-mini";
}

function countMessages(messages: BaseLanguageModelInput) {
  return Array.isArray(messages) ? messages.length : 1;
}

function stringifyContentLength(content: unknown) {
  if (typeof content === "string") {
    return content.length;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        if (
          part &&
          typeof part === "object" &&
          "text" in part &&
          typeof part.text === "string"
        ) {
          return part.text;
        }

        return JSON.stringify(part);
      })
      .join("\n").length;
  }

  return String(content ?? "").length;
}
