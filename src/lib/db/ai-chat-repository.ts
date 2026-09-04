import "server-only";

import {
  normalizeAiChatSession,
  type AiChatSession,
} from "@/lib/ai/chat-session";

import { ensureWorkspace } from "@/lib/workspace/ensure";
import {
  getAiSessionDocument,
  saveAiSessionDocument,
  SessionVersionConflictError,
} from "@/lib/workspace/ai-session-store";

export { SessionVersionConflictError };

export async function getAiChatSession(
  resumeId: string,
  introContent: string,
): Promise<AiChatSession | null> {
  await ensureWorkspace();
  return getAiSessionDocument(resumeId, introContent);
}

export async function saveAiChatSession(
  resumeId: string,
  session: AiChatSession,
  introContent: string,
  options?: {
    expectedSessionVersion?: number;
  },
): Promise<AiChatSession> {
  await ensureWorkspace();
  const saved = await saveAiSessionDocument(
    resumeId,
    session,
    introContent,
    options,
  );
  return normalizeAiChatSession(saved, introContent);
}
