export const defaultChatModel = "gpt-4o-mini";

type EnvSource = Record<string, string | undefined>;

export function resolveChatModelName(env: EnvSource = process.env) {
  return env.AI_API_MODEL ?? defaultChatModel;
}

export function resolveSummaryModelName(env: EnvSource = process.env) {
  const summaryModel = env.AI_SUMMARY_MODEL?.trim();
  return summaryModel || resolveChatModelName(env);
}
