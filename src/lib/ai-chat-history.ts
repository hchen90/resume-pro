import {
  createDefaultAiChatSession,
  normalizeAiChatSession,
  type AiChatSession,
  type AiPendingPlan,
} from "@/lib/ai/chat-session";
import type { Locale } from "@/lib/i18n";

export type { AiChatSession, AiPendingPlan };

export {
  createDefaultAiChatSession,
  normalizeAiChatSession,
};

const LEGACY_STORAGE_KEY_PREFIX = "resume-pro.ai-chat.v1";

function legacyStorageKey(resumeId: string) {
  return `${LEGACY_STORAGE_KEY_PREFIX}:${resumeId}`;
}

function readLegacySession(
  resumeId: string,
  introContent: string,
): AiChatSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(legacyStorageKey(resumeId));
    if (!raw) {
      return null;
    }

    return normalizeAiChatSession(
      JSON.parse(raw) as Partial<AiChatSession>,
      introContent,
    );
  } catch {
    return null;
  }
}

function clearLegacySession(resumeId: string) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(legacyStorageKey(resumeId));
}

function isDefaultSession(session: AiChatSession, introContent: string) {
  return (
    session.messages.length === 1 &&
    session.messages[0]?.role === "assistant" &&
    session.messages[0]?.content === introContent &&
    session.mode === "chat" &&
    !session.pendingPlan &&
    session.selectedPlanStepIds.length === 0 &&
    !session.summary
  );
}

export async function fetchAiChatSession(
  resumeId: string,
  locale: Locale,
  introContent: string,
): Promise<AiChatSession> {
  const response = await fetch(
    `/api/ai/chat?resumeId=${encodeURIComponent(resumeId)}&locale=${encodeURIComponent(locale)}`,
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const payload = (await response.json()) as { session: AiChatSession };
  let session = normalizeAiChatSession(payload.session, introContent);

  const legacy = readLegacySession(resumeId, introContent);
  if (legacy && isDefaultSession(session, introContent) && !isDefaultSession(legacy, introContent)) {
    session = await saveAiChatSession(resumeId, legacy, locale, introContent);
    clearLegacySession(resumeId);
  }

  return session;
}

export async function saveAiChatSession(
  resumeId: string,
  session: Omit<AiChatSession, "summary">,
  locale: Locale,
  introContent: string,
): Promise<AiChatSession> {
  const response = await fetch("/api/ai/chat", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resumeId,
      locale,
      mode: session.mode,
      messages: session.messages,
      pendingPlan: session.pendingPlan,
      selectedPlanStepIds: session.selectedPlanStepIds,
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const payload = (await response.json()) as { session: AiChatSession };
  return normalizeAiChatSession(payload.session, introContent);
}
