export const defaultChatModel = "gpt-4o-mini";
export const defaultTemperature = 0.3;

type EnvSource = Record<string, string | undefined>;

export function resolveChatModelName(env: EnvSource = process.env) {
  return env.AI_API_MODEL ?? defaultChatModel;
}

export function resolveSummaryModelName(env: EnvSource = process.env) {
  const summaryModel = env.AI_SUMMARY_MODEL?.trim();
  return summaryModel || resolveChatModelName(env);
}

/**
 * Resolves sampling temperature from `AI_TEMPERATURE`.
 * Some providers (e.g. certain reasoning models) only accept `1`.
 * Invalid or empty values fall back to {@link defaultTemperature}.
 */
export function resolveTemperature(env: EnvSource = process.env) {
  const raw = env.AI_TEMPERATURE?.trim();
  if (!raw) {
    return defaultTemperature;
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return defaultTemperature;
  }

  return value;
}
