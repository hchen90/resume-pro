import type { AiMode } from "@/lib/ai/types";

const DEFAULT_CHAT_CLIENT_TIMEOUT_MS = 120_000;
const DEFAULT_AGENT_CLIENT_TIMEOUT_MS = 300_000;

function readClientTimeoutMs() {
  const fromEnv = Number(process.env.NEXT_PUBLIC_AI_CLIENT_TIMEOUT_MS);
  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    return Math.floor(fromEnv);
  }

  return undefined;
}

export function getAiClientTimeoutMs(mode: AiMode) {
  const configured = readClientTimeoutMs();
  if (configured) {
    return configured;
  }

  return mode === "chat"
    ? DEFAULT_CHAT_CLIENT_TIMEOUT_MS
    : DEFAULT_AGENT_CLIENT_TIMEOUT_MS;
}

export function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

export function createAiRequestController(input: {
  mode: AiMode;
  onTimeout?: () => void;
}) {
  const timeoutMs = getAiClientTimeoutMs(input.mode);
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    input.onTimeout?.();
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    timeoutMs,
    abort: () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    },
    dispose: () => {
      window.clearTimeout(timeoutId);
    },
  };
}
