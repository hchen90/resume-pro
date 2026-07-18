"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  createAiRequestController,
  isAbortError,
} from "@/lib/ai/client-request";
import {
  assistantMessageFromUiState,
  createInitialAssistantUiState,
  reduceAssistantStreamEvent,
  type AssistantUiState,
} from "@/lib/ai/client/reducer";
import { readAssistantNdjsonStream } from "@/lib/ai/client/stream";
import {
  getAiLoadingMessages,
  loadingPhaseForMode,
  LOADING_STATUS_INTERVAL_MS,
  type AiLoadingPhase,
} from "@/lib/ai/loading-status";
import type { PendingPatchProposal } from "@/lib/ai/protocol";
import {
  createDefaultAiChatSession,
  fetchAiChatSession,
  patchAiChatSession,
  type AiPendingPlan,
} from "@/lib/ai-chat-history";
import type { AiMessage, AiMode } from "@/lib/ai/types";
import { dictionaries, type Locale } from "@/lib/i18n";
import type { ResumeWithNodes } from "@/lib/resume/types";

import { AiLoadingIndicator } from "./ai-loading-indicator";
import { AiProposalReview } from "./ai-proposal-review";

const assistantMarkdownComponents: Components = {
  p: ({ children }) => <p className="my-1 first:mt-0 last:mb-0">{children}</p>,
  h1: ({ children }) => (
    <h1 className="mb-2 mt-3 text-base font-semibold first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-1 mt-3 text-sm font-semibold first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1 mt-2 text-sm font-semibold first:mt-0">{children}</h3>
  ),
  ul: ({ children }) => (
    <ul className="my-1 list-disc space-y-0.5 pl-5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-1 list-decimal space-y-0.5 pl-5">{children}</ol>
  ),
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-[var(--app-border)] pl-3 text-[var(--app-muted)]">
      {children}
    </blockquote>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="font-medium text-[var(--app-accent)] underline underline-offset-2"
    >
      {children}
    </a>
  ),
  code: ({ children, className }) =>
    className ? (
      <code className={className}>{children}</code>
    ) : (
      <code className="rounded bg-[var(--app-muted-surface)] px-1 py-0.5 font-mono text-[0.85em]">
        {children}
      </code>
    ),
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-md bg-[var(--app-muted-surface)] p-3 font-mono text-xs leading-5">
      {children}
    </pre>
  ),
  hr: () => <hr className="my-3 border-[var(--app-border)]" />,
};

function AssistantMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={assistantMarkdownComponents}
    >
      {children}
    </ReactMarkdown>
  );
}

type AiPanelProps = {
  resume: ResumeWithNodes;
  selectedNodeId: string;
  locale: Locale;
  variant?: "default" | "drawer";
  onCollapse: () => void;
  onResumeUpdated: (resume: ResumeWithNodes) => void;
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
  const intro = t.aiIntro;
  const defaultSession = createDefaultAiChatSession(intro);
  const [mode, setMode] = useState<AiMode>(defaultSession.mode);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AiMessage[]>(defaultSession.messages);
  const [chatSummary, setChatSummary] = useState<string | null>(null);
  const [sessionVersion, setSessionVersion] = useState(0);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<AiLoadingPhase>("chat");
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [pendingPlan, setPendingPlan] = useState<AiPendingPlan | null>(null);
  const [selectedPlanStepIds, setSelectedPlanStepIds] = useState<string[]>([]);
  const [pendingProposal, setPendingProposal] =
    useState<PendingPatchProposal | null>(null);
  const [streamState, setStreamState] = useState<AssistantUiState>(
    createInitialAssistantUiState(),
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const requestControllerRef = useRef<ReturnType<
    typeof createAiRequestController
  > | null>(null);
  const requestCancelledRef = useRef(false);
  const sessionVersionRef = useRef(0);
  const uiStateSyncRef = useRef(0);

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
  }, [messages.length, isLoading, loadingStatus, streamState.streamingText]);

  useEffect(() => {
    let cancelled = false;
    const version = sessionVersionRef.current + 1;
    sessionVersionRef.current = version;
    setIsSessionLoading(true);

    void fetchAiChatSession(resume.id, locale, intro)
      .then((session) => {
        if (cancelled || sessionVersionRef.current !== version) {
          return;
        }

        setMode(session.mode);
        setMessages(session.messages);
        setPendingPlan(session.pendingPlan);
        setSelectedPlanStepIds(session.selectedPlanStepIds);
        setPendingProposal(session.pendingProposal);
        setChatSummary(session.summary);
        setSessionVersion(session.sessionVersion);
      })
      .catch(() => {
        if (cancelled || sessionVersionRef.current !== version) {
          return;
        }

        const fallback = createDefaultAiChatSession(intro);
        setMode(fallback.mode);
        setMessages(fallback.messages);
        setPendingPlan(fallback.pendingPlan);
        setSelectedPlanStepIds(fallback.selectedPlanStepIds);
        setPendingProposal(fallback.pendingProposal);
        setChatSummary(fallback.summary);
        setSessionVersion(fallback.sessionVersion);
      })
      .finally(() => {
        if (!cancelled && sessionVersionRef.current === version) {
          setIsSessionLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [resume.id, locale, intro]);

  useEffect(() => {
    if (isSessionLoading || isLoading) {
      return;
    }

    const syncId = uiStateSyncRef.current + 1;
    uiStateSyncRef.current = syncId;
    const timer = window.setTimeout(() => {
      void patchAiChatSession(
        resume.id,
        {
          mode,
          pendingPlan,
          selectedPlanStepIds,
          sessionVersion,
        },
        locale,
        intro,
      )
        .then((session) => {
          if (uiStateSyncRef.current !== syncId) {
            return;
          }
          setSessionVersion(session.sessionVersion);
          setChatSummary(session.summary);
          setPendingProposal(session.pendingProposal);
        })
        .catch(() => {
          /* keep local UI state */
        });
    }, 400);

    return () => window.clearTimeout(timer);
    // sessionVersion is intentionally omitted to avoid a sync loop after PUT.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    resume.id,
    locale,
    intro,
    isSessionLoading,
    isLoading,
    mode,
    pendingPlan,
    selectedPlanStepIds,
  ]);

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
    setStreamState((current) => ({
      ...current,
      cancelled: true,
      finished: true,
      activeToolName: null,
    }));
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
    setPendingProposal(null);
  }

  async function consumeAssistantResponse(input: {
    body: Record<string, unknown>;
    requestMode: AiMode;
    originalMessage: string;
    appendUserMessage: boolean;
  }) {
    const controller = beginAiRequest(input.requestMode);
    let nextState = createInitialAssistantUiState({
      pendingPlan,
      selectedPlanStepIds,
      pendingProposal,
    });
    setStreamState(nextState);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify(input.body),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("ndjson") && !contentType.includes("json")) {
        throw new Error(await response.text());
      }

      if (contentType.includes("application/json") && !contentType.includes("ndjson")) {
        const payload = (await response.json()) as {
          message?: string;
          error?: boolean;
        };
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content: payload.message ?? t.aiError,
            isError: Boolean(payload.error),
          },
        ]);
        return;
      }

      for await (const event of readAssistantNdjsonStream(response)) {
        if (event.type === "tool_started") {
          setLoadingPhase("tool");
        }
        nextState = reduceAssistantStreamEvent(
          nextState,
          event,
          input.originalMessage,
        );
        setStreamState(nextState);
      }

      if (requestCancelledRef.current || nextState.cancelled) {
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content: t.aiRequestCancelled,
            isError: true,
          },
        ]);
        return;
      }

      if (nextState.pendingPlan) {
        setPendingPlan(nextState.pendingPlan);
        setSelectedPlanStepIds(nextState.selectedPlanStepIds);
      } else if (input.requestMode === "plan" && input.body.action === "execute_plan") {
        setPendingPlan(null);
        setSelectedPlanStepIds([]);
      }

      if (nextState.pendingProposal) {
        setPendingProposal(nextState.pendingProposal);
      }

      // Prefer authoritative session after server-side persistence.
      try {
        const session = await fetchAiChatSession(resume.id, locale, intro);
        const assistantMessage = assistantMessageFromUiState(
          nextState,
          t.aiError,
        );
        const serverHasAssistant =
          !assistantMessage ||
          session.messages.some(
            (message) =>
              message.role === "assistant" &&
              message.content === assistantMessage.content,
          );

        if (serverHasAssistant || session.lastRunId === nextState.runId) {
          setMessages(session.messages);
          setPendingPlan(session.pendingPlan);
          setSelectedPlanStepIds(session.selectedPlanStepIds);
          setPendingProposal(session.pendingProposal);
          setChatSummary(session.summary);
          setSessionVersion(session.sessionVersion);
          setMode(session.mode);
        } else if (assistantMessage) {
          setMessages((current) => [...current, assistantMessage]);
          if (nextState.pendingPlan) {
            setPendingPlan(nextState.pendingPlan);
            setSelectedPlanStepIds(nextState.selectedPlanStepIds);
          }
          if (nextState.pendingProposal) {
            setPendingProposal(nextState.pendingProposal);
          }
        }
      } catch {
        const assistantMessage = assistantMessageFromUiState(
          nextState,
          t.aiError,
        );
        if (assistantMessage) {
          setMessages((current) => [...current, assistantMessage]);
        }
      }
    } catch (error) {
      if (!requestCancelledRef.current) {
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content: formatRequestError(error),
            isError: true,
          },
        ]);
      }
    } finally {
      finishAiRequest();
      setIsLoading(false);
      setStreamState((current) => ({
        ...current,
        finished: true,
        activeToolName: null,
      }));
    }
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

    await consumeAssistantResponse({
      requestMode: mode,
      originalMessage: userMessage.content,
      appendUserMessage: true,
      body: {
        resumeId: resume.id,
        selectedNodeId,
        mode,
        locale,
        message: userMessage.content,
        resumeSnapshot: resume,
        messages:
          mode === "chat" ? buildChatHistory(messages, t.aiIntro) : undefined,
      },
    });
  }

  async function executePendingPlan() {
    if (!pendingPlan || isLoading || selectedPlanStepIds.length === 0) {
      return;
    }

    setLoadingPhase(loadingPhaseForMode("plan", "execute_plan"));
    setLoadingMessageIndex(0);
    setIsLoading(true);

    const planToExecute = {
      ...pendingPlan.plan,
      steps: pendingPlan.plan.steps.filter((step) =>
        selectedPlanStepIds.includes(step.id),
      ),
    };

    await consumeAssistantResponse({
      requestMode: "plan",
      originalMessage: pendingPlan.originalMessage,
      appendUserMessage: false,
      body: {
        resumeId: resume.id,
        selectedNodeId,
        mode: "plan",
        action: "execute_plan",
        locale,
        message: pendingPlan.originalMessage,
        plan: planToExecute,
        resumeSnapshot: resume,
      },
    });
  }

  async function decideProposal(decision: "confirm" | "reject") {
    if (!pendingProposal || isLoading) {
      return;
    }

    setIsLoading(true);
    setLoadingPhase("edit");
    const controller = beginAiRequest("edit");

    try {
      const response = await fetch("/api/ai/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          resumeId: resume.id,
          proposalId: pendingProposal.proposalId,
          decision,
          locale,
          resumeSnapshot: resume,
        }),
      });

      const payload = (await response.json()) as {
        message?: string;
        error?: boolean;
        resume?: ResumeWithNodes;
        session?: {
          messages: AiMessage[];
          pendingPlan: AiPendingPlan | null;
          selectedPlanStepIds: string[];
          pendingProposal: PendingPatchProposal | null;
          summary: string | null;
          sessionVersion: number;
          mode: AiMode;
        };
      };

      if (!response.ok) {
        throw new Error(payload.message ?? t.aiError);
      }

      if (payload.session) {
        setMessages(payload.session.messages);
        setPendingPlan(payload.session.pendingPlan);
        setSelectedPlanStepIds(payload.session.selectedPlanStepIds);
        setPendingProposal(payload.session.pendingProposal);
        setChatSummary(payload.session.summary);
        setSessionVersion(payload.session.sessionVersion);
        setMode(payload.session.mode);
      } else {
        setPendingProposal(null);
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
          isError: true,
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

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    void sendMessage();
  }

  const rootClassName =
    variant === "drawer"
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
                {streamState.activeToolName
                  ? `${t.aiLoadingTool} (${streamState.activeToolName})`
                  : loadingStatus}
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
              {variant === "drawer" ? (
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
        {chatSummary ? (
          <div className="flex justify-center py-1">
            <div className="max-w-full rounded-lg bg-[var(--app-surface)] px-3 py-2 text-xs leading-5 text-[var(--app-muted)] ring-1 ring-[var(--app-border)]">
              <p className="font-semibold text-[var(--app-text)]">
                {t.aiChatEarlierSummary}
              </p>
              <p className="mt-1 whitespace-pre-wrap">{chatSummary}</p>
            </div>
          </div>
        ) : null}
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

          const isErrorMessage =
            message.role === "assistant" && message.isError === true;

          return (
            <div
              key={`${message.role}-${index}`}
              className={`rounded-lg px-3 py-2 text-sm leading-6 ${
                message.role === "user"
                  ? "ml-8 bg-[var(--app-accent-soft)] text-[var(--app-text)] ring-1 ring-[var(--app-accent-border)]"
                  : isErrorMessage
                    ? "mr-8 bg-red-50 text-red-800 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-900/60"
                    : "mr-8 bg-[var(--app-surface)] text-[var(--app-text)] ring-1 ring-[var(--app-border)]"
              }`}
            >
              {message.role === "assistant" ? (
                <AssistantMarkdown>{message.content}</AssistantMarkdown>
              ) : (
                <span className="whitespace-pre-wrap">{message.content}</span>
              )}
            </div>
          );
        })}
        {isLoading && streamState.streamingText ? (
          <div className="mr-8 rounded-lg bg-[var(--app-surface)] px-3 py-2 text-sm leading-6 text-[var(--app-text)] ring-1 ring-[var(--app-border)]">
            <AssistantMarkdown>{streamState.streamingText}</AssistantMarkdown>
            <span className="ml-0.5 inline-block animate-pulse">▍</span>
          </div>
        ) : null}
        {isLoading && !streamState.streamingText ? (
          <AiLoadingIndicator label={loadingStatus} />
        ) : null}
        <div ref={messagesEndRef} />
      </div>

      {pendingProposal ? (
        <AiProposalReview
          proposal={pendingProposal}
          labels={t}
          isLoading={isLoading}
          onConfirm={() => void decideProposal("confirm")}
          onReject={() => void decideProposal("reject")}
        />
      ) : null}

      {pendingPlan && !pendingProposal ? (
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
          onKeyDown={handleInputKeyDown}
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
