import "server-only";

import type { ChatOpenAI } from "@langchain/openai";

import type { AssistantHistoryConfig } from "@/lib/ai/assistant-history-config";
import {
  enforceConversationalCap,
  selectMessagesToCompact,
  type AiChatSession,
} from "@/lib/ai/chat-session";
import type { AiMessage } from "@/lib/ai/types";
import { invokeChatModel } from "@/lib/ai/invoke";
import { chatHistorySummarizationPrompt } from "@/lib/ai/prompts";
import type { Locale } from "@/lib/i18n";

export { selectMessagesToCompact } from "@/lib/ai/chat-session";

export function truncateWithoutSummary(
  messages: AiMessage[],
  introContent: string,
  config: Pick<AssistantHistoryConfig, "summarizeAbove" | "contextMessages">,
) {
  const selected = selectMessagesToCompact(
    messages,
    introContent,
    config.summarizeAbove,
    config.contextMessages,
  );

  if (!selected) {
    return messages;
  }

  return selected.remaining;
}

export async function summarizeChatMessages(input: {
  model: ChatOpenAI;
  existingSummary: string | null;
  messages: AiMessage[];
  locale: Locale;
  resumeId: string;
}) {
  const transcript = input.messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n\n");

  const result = await invokeChatModel(
    input.model,
    [
      {
        role: "system",
        content: chatHistorySummarizationPrompt({
          existingSummary: input.existingSummary,
          locale: input.locale,
        }),
      },
      { role: "user", content: transcript },
    ],
    {
      label: "chat:summarize",
      resumeId: input.resumeId,
      mode: "chat",
    },
  );

  const summary = stringifyModelContent(result.content).trim();
  if (!summary) {
    throw new Error("Chat summarization returned empty content.");
  }

  return summary;
}

export async function compactChatSessionIfNeeded(input: {
  session: AiChatSession;
  introContent: string;
  locale: Locale;
  resumeId: string;
  model: ChatOpenAI | null;
  historyConfig: AssistantHistoryConfig;
}) {
  let session = input.session;
  const { summarizeAbove, contextMessages, maxMessages } = input.historyConfig;

  while (true) {
    const selected = selectMessagesToCompact(
      session.messages,
      input.introContent,
      summarizeAbove,
      contextMessages,
    );

    if (!selected) {
      break;
    }

    if (!input.model) {
      session = {
        ...session,
        messages: selected.remaining,
      };
      break;
    }

    const summary = await summarizeChatMessages({
      model: input.model,
      existingSummary: session.summary,
      messages: selected.toSummarize,
      locale: input.locale,
      resumeId: input.resumeId,
    });

    session = {
      ...session,
      messages: selected.remaining,
      summary,
    };
  }

  return {
    ...session,
    messages: enforceConversationalCap(
      session.messages,
      input.introContent,
      maxMessages,
    ),
  };
}

function stringifyModelContent(content: unknown) {
  if (typeof content === "string") {
    return content;
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
      .join("\n");
  }

  return String(content ?? "");
}
