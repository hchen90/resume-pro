"use client";

import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

import { AiPanel } from "@/components/resume/ai-panel";
import {
  clampWidth,
  getAiPanelLayoutServerSnapshot,
  getAiPanelLayoutSnapshot,
  patchAiPanelLayout,
  subscribeAiPanelLayout,
} from "@/lib/ai-panel-layout";
import { dictionaries, type Locale } from "@/lib/i18n";
import type { ResumeWithNodes } from "@/lib/resume/types";

type AiFloatingAssistantProps = {
  resume: ResumeWithNodes;
  selectedNodeId: string;
  locale: Locale;
  onResumeUpdated: (resume: ResumeWithNodes) => void;
};

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function useAiPanelLayout() {
  return useSyncExternalStore(
    subscribeAiPanelLayout,
    getAiPanelLayoutSnapshot,
    getAiPanelLayoutServerSnapshot,
  );
}

function RobotIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="currentColor"
    >
      <path d="M12 2a1.5 1.5 0 0 1 1.5 1.5V5h3A2.5 2.5 0 0 1 19 7.5V9h1a1 1 0 1 1 0 2h-1v6a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 17V11H4a1 1 0 1 1 0-2h1V7.5A2.5 2.5 0 0 1 7.5 5h3V3.5A1.5 1.5 0 0 1 12 2ZM9 9.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm6 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM8.5 15h7v1.25c0 .69-.56 1.25-1.25 1.25h-4.5c-.69 0-1.25-.56-1.25-1.25V15Z" />
    </svg>
  );
}

export function AiFloatingAssistant({
  resume,
  selectedNodeId,
  locale,
  onResumeUpdated,
}: AiFloatingAssistantProps) {
  const t = dictionaries[locale];
  const isClient = useIsClient();
  const layout = useAiPanelLayout();
  const layoutRef = useRef(layout);
  const resizeStartRef = useRef({ width: 0, x: 0 });

  const setOpen = useCallback((open: boolean) => {
    patchAiPanelLayout({ open });
  }, []);

  const handleResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      resizeStartRef.current = {
        width: layoutRef.current.width,
        x: event.clientX,
      };

      const resizeHandle = event.currentTarget;
      event.currentTarget.setPointerCapture(event.pointerId);

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const deltaX = resizeStartRef.current.x - moveEvent.clientX;
        patchAiPanelLayout({
          width: clampWidth(resizeStartRef.current.width + deltaX),
        });
      };

      const handlePointerUp = (upEvent: PointerEvent) => {
        resizeHandle.releasePointerCapture(upEvent.pointerId);
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    },
    [],
  );

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    if (!layout.open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [layout.open, setOpen]);

  useEffect(() => {
    function handleResize() {
      patchAiPanelLayout({
        width: clampWidth(layoutRef.current.width),
      });
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!isClient) {
    return null;
  }

  return createPortal(
    <div className="no-print">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--app-primary)] text-white shadow-lg ring-2 ring-white/20 transition hover:bg-[var(--app-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-accent)] ${
          layout.open
            ? "pointer-events-none scale-90 opacity-0"
            : "opacity-100"
        }`}
        title={t.expandAi}
        aria-label={t.expandAi}
        aria-hidden={layout.open}
        tabIndex={layout.open ? -1 : 0}
      >
        <RobotIcon />
      </button>

      <div
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-300 ${
          layout.open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
        aria-hidden={!layout.open}
      />

      <aside
        role="dialog"
        aria-modal={layout.open}
        aria-label={t.aiAssistant}
        aria-hidden={!layout.open}
        style={{ width: layout.width }}
        className={`fixed inset-y-0 right-0 z-50 flex max-w-[min(100vw,640px)] flex-col border-l border-[var(--app-border)] bg-[var(--app-surface)] shadow-2xl transition-transform duration-300 ease-out ${
          layout.open ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <button
          type="button"
          aria-label={t.aiResize}
          onPointerDown={handleResizePointerDown}
          className="absolute top-0 left-0 z-10 h-full w-1.5 cursor-ew-resize bg-transparent hover:bg-[var(--app-accent-soft)]"
        />
        <div className="relative min-h-0 flex-1">
          <AiPanel
            key={resume.id}
            variant="drawer"
            resume={resume}
            selectedNodeId={selectedNodeId}
            locale={locale}
            onCollapse={() => setOpen(false)}
            onResumeUpdated={onResumeUpdated}
          />
        </div>
      </aside>
    </div>,
    document.body,
  );
}
