"use client";

import { useState } from "react";

import type { AiMessage, AiMode, AiResponse } from "@/lib/ai/types";
import { dictionaries, type Locale } from "@/lib/i18n";
import type { ResumeWithNodes } from "@/lib/resume/types";

type AiPanelProps = {
  resume: ResumeWithNodes;
  selectedNodeId: string;
  locale: Locale;
  onCollapse: () => void;
  onResumeUpdated: (resume: ResumeWithNodes) => void;
};

export function AiPanel({
  resume,
  selectedNodeId,
  locale,
  onCollapse,
  onResumeUpdated,
}: AiPanelProps) {
  const t = dictionaries[locale];
  const [mode, setMode] = useState<AiMode>("chat");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AiMessage[]>([
    {
      role: "assistant",
      content: t.aiIntro,
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  async function sendMessage() {
    if (!input.trim() || isLoading) {
      return;
    }

    const userMessage: AiMessage = { role: "user", content: input.trim() };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId: resume.id,
          selectedNodeId,
          mode,
          locale,
          message: userMessage.content,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const payload = (await response.json()) as AiResponse;
      setMessages((current) => [
        ...current,
        { role: "assistant", content: payload.message },
      ]);
      if (payload.resume) {
        onResumeUpdated(payload.resume);
      }
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? `${t.aiError}：${error.message}`
              : `${t.aiError}。`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  return (
    <aside className="flex min-h-[620px] min-w-0 flex-col rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 text-[var(--app-text)] shadow-sm">
      <div>
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--app-accent)]">
            {t.aiAssistant}
          </p>
          <button
            type="button"
            onClick={onCollapse}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--app-border)] bg-[var(--app-muted-surface)] text-[var(--app-muted)] transition hover:bg-[var(--app-accent-soft)]"
            title={t.collapseAi}
            aria-label={t.collapseAi}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="h-4 w-4"
              fill="currentColor"
            >
              <path d="M2.75 3A1.75 1.75 0 0 1 4.5 1.25h7A1.75 1.75 0 0 1 13.25 3v10a1.75 1.75 0 0 1-1.75 1.75h-7A1.75 1.75 0 0 1 2.75 13V3Zm1.75-.25A.25.25 0 0 0 4.25 3v10c0 .14.11.25.25.25h4.75V2.75H4.5Zm6.25 10.5h.75c.14 0 .25-.11.25-.25V3a.25.25 0 0 0-.25-.25h-.75v10.5Z" />
              <path d="M7.78 5.47a.75.75 0 0 1 0 1.06L6.31 8l1.47 1.47a.75.75 0 0 1-1.06 1.06L4.72 8.53a.75.75 0 0 1 0-1.06l2-2a.75.75 0 0 1 1.06 0Z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-4 flex-1 space-y-3 overflow-y-auto rounded-lg border border-[var(--app-border)] bg-[var(--app-muted-surface)] p-3">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`rounded-lg px-3 py-2 text-sm leading-6 ${
              message.role === "user"
                ? "ml-8 bg-[var(--app-accent-soft)] text-[var(--app-text)] ring-1 ring-[var(--app-accent-border)]"
                : "mr-8 bg-[var(--app-surface)] text-[var(--app-text)] ring-1 ring-[var(--app-border)]"
            }`}
          >
            {message.content}
          </div>
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-4 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-2 focus-within:border-[var(--app-accent)]"
      >
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          rows={4}
          placeholder={t.aiPlaceholder}
          className="w-full resize-none bg-transparent px-2 py-2 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]"
        />
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-[var(--app-border)] pt-2">
          <label className="sr-only" htmlFor="ai-mode">
            {t.aiAssistant}
          </label>
          <select
            id="ai-mode"
            value={mode}
            onChange={(event) => setMode(event.target.value as AiMode)}
            className="max-w-[180px] rounded-md border border-[var(--app-border)] bg-[var(--app-muted-surface)] px-2 py-1.5 text-xs font-medium text-[var(--app-muted)] outline-none transition hover:bg-[var(--app-accent-soft)] focus:border-[var(--app-accent)]"
          >
            {Object.entries(t.aiModes).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            title={isLoading ? t.aiSending : t.aiSend}
            aria-label={isLoading ? t.aiSending : t.aiSend}
            className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--app-primary)] text-white transition hover:bg-[var(--app-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className="h-4 w-4"
              fill="currentColor"
            >
              <path d="M3.5 10.8 15.2 4.7c.7-.4 1.5.3 1.2 1.1l-4.2 10.6c-.3.7-1.2.8-1.6.2L8.3 13l-3.9-.7c-.8-.1-1-1.1-.3-1.5h-.6Zm5.4.9 2.1 3.1 3.2-8-8.9 4.6 3.6.3Z" />
            </svg>
          </button>
        </div>
      </form>
    </aside>
  );
}
