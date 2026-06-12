"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  createAiRequestController,
  isAbortError,
} from "@/lib/ai/client-request";
import {
  getAiLoadingMessages,
  loadingPhaseForMode,
  LOADING_STATUS_INTERVAL_MS,
  type AiLoadingPhase,
} from "@/lib/ai/loading-status";
import type { AiPlan } from "@/lib/ai/patch";
import type { AiMessage, AiMode, AiResponse } from "@/lib/ai/types";
import { dictionaries, type Locale } from "@/lib/i18n";
import type { ResumeWithNodes } from "@/lib/resume/types";

import { AiLoadingIndicator } from "./ai-loading-indicator";

type AiPanelProps = {
  resume: ResumeWithNodes;
  selectedNodeId: string;
  locale: Locale;
  variant?: "default" | "floating";
  onCollapse: () => void;
  onResumeUpdated: (resume: ResumeWithNodes) => void;
};

type PendingPlan = {
  originalMessage: string;
  plan: AiPlan;
};

function buildChatHistory(messages: AiMessage[], introContent: string) {
  return messages
    .filter((message, index) => {
      if (message.role === "system") {
        return false;
      }

      if (
        index === 0 &&
        message.role === "assistant" &&
        message.content === introContent
      ) {
        return false;
      }

      return message.role === "user" || message.role === "assistant";
    })
    .map((message) => ({
      role: message.role as "user" | "assistant",
      content: message.content,
    }));
}

function createModeMarker(
  mode: AiMode,
  labels: (typeof dictionaries)[Locale],
): AiMessage {
  return {
    role: "system",
    aiMode: mode,
    content: labels.aiModeSwitched(labels.aiModes[mode]),
  };
}

export function AiPanel({
  resume,
  selectedNodeId,
  locale,
  variant = "default",
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
  const [loadingPhase, setLoadingPhase] = useState<AiLoadingPhase>("chat");
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [pendingPlan, setPendingPlan] = useState<PendingPlan | null>(null);
  const [selectedPlanStepIds, setSelectedPlanStepIds] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const requestControllerRef = useRef<ReturnType<
    typeof createAiRequestController
  > | null>(null);
  const requestCancelledRef = useRef(false);

  const loadingMessages = useMemo(
    () => getAiLoadingMessages(loadingPhase, t),
    [loadingPhase, t],
  );
  const loadingStatus =
    loadingMessages[loadingMessageIndex % loadingMessages.length] ??
    t.aiSending;

  useEffect(() => {
    if (!isLoading) {
      setLoadingMessageIndex(0);
      return;
    }

    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });

    if (loadingMessages.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setLoadingMessageIndex((current) => (current + 1) % loadingMessages.length);
    }, LOADING_STATUS_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [isLoading, loadingMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isLoading, loadingStatus]);

  function beginAiRequest(requestMode: AiMode) {
    requestControllerRef.current?.dispose();
    requestCancelledRef.current = false;
    const controller = createAiRequestController({ mode: requestMode });
    requestControllerRef.current = controller;
    return controller;
  }

  function finishAiRequest() {
    requestControllerRef.current?.dispose();
    requestControllerRef.current = null;
  }

  function cancelAiRequest() {
    requestCancelledRef.current = true;
    requestControllerRef.current?.abort();
    finishAiRequest();
    setIsLoading(false);
  }

  function formatRequestError(error: unknown) {
    if (isAbortError(error)) {
      return requestCancelledRef.current
        ? t.aiRequestCancelled
        : t.aiRequestTimeout;
    }

    return error instanceof Error
      ? `${t.aiError}：${error.message}`
      : `${t.aiError}。`;
  }

  function handleModeChange(nextMode: AiMode) {
    if (nextMode === mode || isLoading) {
      return;
    }

    setMessages((current) => [...current, createModeMarker(nextMode, t)]);
    setMode(nextMode);
    setPendingPlan(null);
    setSelectedPlanStepIds([]);
  }

  async function sendMessage() {
    if (!input.trim() || isLoading) {
      return;
    }

    const userMessage: AiMessage = { role: "user", content: input.trim() };
    const phase = loadingPhaseForMode(mode);
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setLoadingPhase(phase);
    setLoadingMessageIndex(0);
    setIsLoading(true);
    const controller = beginAiRequest(mode);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          resumeId: resume.id,
          selectedNodeId,
          mode,
          locale,
          message: userMessage.content,
          messages:
            mode === "chat"
              ? buildChatHistory(messages, t.aiIntro)
              : undefined,
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
      if (payload.plan) {
        setPendingPlan({
          originalMessage: userMessage.content,
          plan: payload.plan,
        });
        setSelectedPlanStepIds(payload.plan.steps.map((step) => step.id));
      } else if (mode !== "plan") {
        setPendingPlan(null);
        setSelectedPlanStepIds([]);
      }
      if (payload.resume) {
        onResumeUpdated(payload.resume);
      }
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: formatRequestError(error),
        },
      ]);
    } finally {
      finishAiRequest();
      setIsLoading(false);
    }
  }

  async function executePendingPlan() {
    if (!pendingPlan || isLoading || selectedPlanStepIds.length === 0) {
      return;
    }

    setLoadingPhase(loadingPhaseForMode("plan", "execute_plan"));
    setLoadingMessageIndex(0);
    setIsLoading(true);
    const controller = beginAiRequest("plan");

    try {
      const planToExecute = {
        ...pendingPlan.plan,
        steps: pendingPlan.plan.steps.filter((step) =>
          selectedPlanStepIds.includes(step.id),
        ),
      };
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          resumeId: resume.id,
          selectedNodeId,
          mode: "plan",
          action: "execute_plan",
          locale,
          message: pendingPlan.originalMessage,
          plan: planToExecute,
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
      setPendingPlan(null);
      setSelectedPlanStepIds([]);

      if (payload.resume) {
        onResumeUpdated(payload.resume);
      }
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: formatRequestError(error),
        },
      ]);
    } finally {
      finishAiRequest();
      setIsLoading(false);
    }
  }

  function togglePlanStep(stepId: string) {
    setSelectedPlanStepIds((current) =>
      current.includes(stepId)
        ? current.filter((id) => id !== stepId)
        : [...current, stepId],
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  const rootClassName =
    variant === "floating"
      ? "flex h-full min-h-0 min-w-0 flex-col p-4 text-[var(--app-text)]"
      : "flex min-h-[620px] min-w-0 flex-col rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 text-[var(--app-text)] shadow-sm";

  return (
    <aside className={rootClassName}>
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--app-accent)]">
              {t.aiAssistant}
            </p>
            {isLoading ? (
              <p className="mt-1 truncate text-xs text-[var(--app-muted)]">
                {loadingStatus}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {isLoading ? (
              <button
                type="button"
                onClick={cancelAiRequest}
                className="rounded-md border border-[var(--app-border)] bg-[var(--app-muted-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--app-muted)] transition hover:bg-[var(--app-surface)]"
              >
                {t.aiCancelRequest}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onCollapse}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--app-border)] bg-[var(--app-muted-surface)] text-[var(--app-muted)] transition hover:bg-[var(--app-accent-soft)]"
              title={t.collapseAi}
              aria-label={t.collapseAi}
            >
              {variant === "floating" ? (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  className="h-4 w-4"
                  fill="currentColor"
                >
                  <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 1 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
                </svg>
              ) : (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  className="h-4 w-4"
                  fill="currentColor"
                >
                  <path d="M2.75 3A1.75 1.75 0 0 1 4.5 1.25h7A1.75 1.75 0 0 1 13.25 3v10a1.75 1.75 0 0 1-1.75 1.75h-7A1.75 1.75 0 0 1 2.75 13V3Zm1.75-.25A.25.25 0 0 0 4.25 3v10c0 .14.11.25.25.25h4.75V2.75H4.5Zm6.25 10.5h.75c.14 0 .25-.11.25-.25V3a.25.25 0 0 0-.25-.25h-.75v10.5Z" />
                  <path d="M7.78 5.47a.75.75 0 0 1 0 1.06L6.31 8l1.47 1.47a.75.75 0 0 1-1.06 1.06L4.72 8.53a.75.75 0 0 1 0-1.06l2-2a.75.75 0 0 1 1.06 0Z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 flex-1 space-y-3 overflow-y-auto rounded-lg border border-[var(--app-border)] bg-[var(--app-muted-surface)] p-3">
        {messages.map((message, index) => {
          if (message.role === "system") {
            return (
              <div key={`system-${index}`} className="flex justify-center py-1">
                <span className="rounded-full bg-[var(--app-surface)] px-3 py-1 text-xs text-[var(--app-muted)] ring-1 ring-[var(--app-border)]">
                  {message.content}
                </span>
              </div>
            );
          }

          return (
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
          );
        })}
        {isLoading ? <AiLoadingIndicator label={loadingStatus} /> : null}
        <div ref={messagesEndRef} />
      </div>

      {pendingPlan ? (
        <div className="mt-4 rounded-lg border border-[var(--app-accent-border)] bg-[var(--app-accent-soft)] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--app-accent)]">
            {t.aiPlanReview}
          </p>
          <p className="mt-2 text-sm font-medium text-[var(--app-text)]">
            {pendingPlan.plan.summary}
          </p>
          <div className="mt-3 space-y-2">
            {pendingPlan.plan.steps.map((step) => (
              <label
                key={step.id}
                className="flex cursor-pointer gap-2 rounded-md bg-[var(--app-surface)] p-3 text-sm ring-1 ring-[var(--app-border)]"
              >
                <input
                  type="checkbox"
                  checked={selectedPlanStepIds.includes(step.id)}
                  onChange={() => togglePlanStep(step.id)}
                  className="mt-1"
                  disabled={isLoading}
                />
                <span>
                  <span className="block font-semibold text-[var(--app-text)]">
                    {step.title}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[var(--app-muted)]">
                    {step.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => void executePendingPlan()}
              disabled={isLoading || selectedPlanStepIds.length === 0}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-[var(--app-primary)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--app-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  className="h-3.5 w-3.5 animate-spin"
                  fill="none"
                >
                  <circle
                    cx="10"
                    cy="10"
                    r="7"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="opacity-25"
                  />
                  <path
                    d="M17 10a7 7 0 0 0-7-7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="opacity-90"
                  />
                </svg>
              ) : null}
              {isLoading ? loadingStatus : t.aiExecutePlan}
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingPlan(null);
                setSelectedPlanStepIds([]);
              }}
              disabled={isLoading}
              className="rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-xs font-semibold text-[var(--app-muted)] transition hover:bg-[var(--app-muted-surface)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t.aiCancelPlan}
            </button>
          </div>
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="mt-4 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-2 focus-within:border-[var(--app-accent)]"
      >
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          rows={4}
          placeholder={t.aiPlaceholder}
          disabled={isLoading}
          className="w-full resize-none bg-transparent px-2 py-2 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)] disabled:opacity-60"
        />
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-[var(--app-border)] pt-2">
          <label className="sr-only" htmlFor="ai-mode">
            {t.aiAssistant}
          </label>
          <select
            id="ai-mode"
            value={mode}
            onChange={(event) =>
              handleModeChange(event.target.value as AiMode)
            }
            disabled={isLoading}
            className="max-w-[180px] rounded-md border border-[var(--app-border)] bg-[var(--app-muted-surface)] px-2 py-1.5 text-xs font-medium text-[var(--app-muted)] outline-none transition hover:bg-[var(--app-accent-soft)] focus:border-[var(--app-accent)] disabled:opacity-60"
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
            title={isLoading ? loadingStatus : t.aiSend}
            aria-label={isLoading ? loadingStatus : t.aiSend}
            className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--app-primary)] text-white transition hover:bg-[var(--app-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="h-4 w-4 animate-spin"
                fill="none"
              >
                <circle
                  cx="10"
                  cy="10"
                  r="7"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="opacity-25"
                />
                <path
                  d="M17 10a7 7 0 0 0-7-7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="opacity-90"
                />
              </svg>
            ) : (
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="h-4 w-4"
                fill="currentColor"
              >
                <path d="M3.5 10.8 15.2 4.7c.7-.4 1.5.3 1.2 1.1l-4.2 10.6c-.3.7-1.2.8-1.6.2L8.3 13l-3.9-.7c-.8-.1-1-1.1-.3-1.5h-.6Zm5.4.9 2.1 3.1 3.2-8-8.9 4.6 3.6.3Z" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </aside>
  );
}
