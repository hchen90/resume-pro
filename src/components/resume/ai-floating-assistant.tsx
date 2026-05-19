"use client";

import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

import { AiPanel } from "@/components/resume/ai-panel";
import {
  clampHeight,
  clampWidth,
  getAiPanelLayoutServerSnapshot,
  getAiPanelLayoutSnapshot,
  patchAiPanelLayout,
  subscribeAiPanelLayout,
  type AiPanelLayout,
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
  const resizeStartRef = useRef({ width: 0, height: 0, x: 0, y: 0 });

  const persistLayout = useCallback((partial: Partial<AiPanelLayout>) => {
    patchAiPanelLayout({ x: null, y: null, ...partial });
  }, []);

  const setOpen = useCallback(
    (open: boolean) => {
      persistLayout({ open });
    },
    [persistLayout],
  );

  const handleResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const current = layoutRef.current;
      resizeStartRef.current = {
        width: current.width,
        height: current.height,
        x: event.clientX,
        y: event.clientY,
      };

      const resizeHandle = event.currentTarget;
      event.currentTarget.setPointerCapture(event.pointerId);

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - resizeStartRef.current.x;
        const deltaY = moveEvent.clientY - resizeStartRef.current.y;
        persistLayout({
          width: clampWidth(resizeStartRef.current.width - deltaX),
          height: clampHeight(resizeStartRef.current.height - deltaY),
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
    [persistLayout],
  );

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    if (!layout.open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [layout.open, setOpen]);

  useEffect(() => {
    function handleResize() {
      const current = layoutRef.current;
      persistLayout({
        width: clampWidth(current.width),
        height: clampHeight(current.height),
      });
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [persistLayout]);

  if (!isClient) {
    return null;
  }

  const panelStyle: CSSProperties = {
    right: "1.5rem",
    bottom: "5.5rem",
    width: layout.width,
    height: layout.height,
  };

  return createPortal(
    <div className="no-print">
      {!layout.open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--app-primary)] text-white shadow-lg ring-2 ring-white/20 transition hover:bg-[var(--app-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-accent)]"
          title={t.expandAi}
          aria-label={t.expandAi}
        >
          <RobotIcon />
        </button>
      ) : (
        <div
          style={panelStyle}
          className="fixed z-50 flex max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-xl"
        >
          <button
            type="button"
            aria-label={t.aiResize}
            onPointerDown={handleResizePointerDown}
            className="absolute top-0 left-0 z-10 flex h-5 w-5 cursor-nw-resize items-start justify-start p-0.5 text-[var(--app-muted)] hover:text-[var(--app-text)]"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 12 12"
              className="h-3 w-3 rotate-180"
              fill="currentColor"
            >
              <path d="M12 12H8V10h2V8h2v4ZM10 6H8V4h2v2ZM6 6H4V4h2v2Z" />
            </svg>
          </button>
          <div className="relative min-h-0 flex-1">
            <AiPanel
              variant="floating"
              resume={resume}
              selectedNodeId={selectedNodeId}
              locale={locale}
              onCollapse={() => setOpen(false)}
              onResumeUpdated={onResumeUpdated}
            />
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
