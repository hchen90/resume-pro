export type AssistantHistoryConfig = {
  maxMessages: number;
  summarizeAbove: number;
  contextMessages: number;
};

const defaults: AssistantHistoryConfig = {
  maxMessages: 50,
  summarizeAbove: 30,
  contextMessages: 20,
};

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value?.trim()) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

type EnvSource = Record<string, string | undefined>;

export function resolveAssistantHistoryConfig(
  env: EnvSource = process.env,
): AssistantHistoryConfig {
  const contextMessages = parsePositiveInt(
    env.AI_HISTORY_CONTEXT_MESSAGES,
    defaults.contextMessages,
  );
  const summarizeAbove = parsePositiveInt(
    env.AI_HISTORY_SUMMARIZE_ABOVE,
    defaults.summarizeAbove,
  );
  const maxMessages = Math.max(
    parsePositiveInt(env.AI_HISTORY_MAX_MESSAGES, defaults.maxMessages),
    summarizeAbove,
  );

  return {
    maxMessages,
    summarizeAbove,
    contextMessages: Math.min(contextMessages, summarizeAbove),
  };
}
