"use client";

import { useEffect, useRef, useState } from "react";

import type { Locale } from "@/lib/i18n";
import type { ResumeWithNodes } from "@/lib/resume/types";
import { getResumeTemplate } from "@/templates/resume/registry";

import { ResumeDocument } from "./resume-document";

const paperWidth = 794;
const paperHeight = 1123;
const minScale = 0.25;
const maxScale = 1.25;
const scaleStep = 0.1;

type ResumePreviewLabels = {
  fit: string;
  zoomIn: string;
  zoomOut: string;
  actualSize: string;
};

export function ResumePreview({
  resume,
  locale,
  labels,
}: {
  resume: ResumeWithNodes;
  locale: Locale;
  labels: ResumePreviewLabels;
}) {
  const Template = getResumeTemplate(resume.templateId).component;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [isFitMode, setIsFitMode] = useState(true);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const updateFitScale = () => {
      if (!isFitMode) {
        return;
      }

      const availableWidth = container.clientWidth - 48;
      setScale(clampScale(availableWidth / paperWidth));
    };

    updateFitScale();

    const observer = new ResizeObserver(updateFitScale);
    observer.observe(container);

    return () => observer.disconnect();
  }, [isFitMode]);

  function updateManualScale(nextScale: number) {
    setIsFitMode(false);
    setScale(clampScale(nextScale));
  }

  return (
    <div className="relative rounded-xl border border-[var(--app-border)] bg-[var(--app-muted-surface)] shadow-sm">
      <div className="absolute right-4 top-4 z-10 flex items-center gap-1 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)]/95 p-1 text-xs shadow-lg backdrop-blur">
        <button
          type="button"
          onClick={() => setIsFitMode(true)}
          className={`rounded-md px-2 py-1 font-medium transition hover:bg-[var(--app-accent-soft)] ${
            isFitMode
              ? "bg-[var(--app-accent-soft)] text-[var(--app-accent)]"
              : "text-[var(--app-muted)]"
          }`}
          title={labels.fit}
        >
          {labels.fit}
        </button>
        <button
          type="button"
          onClick={() => updateManualScale(scale - scaleStep)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--app-muted)] transition hover:bg-[var(--app-accent-soft)] hover:text-[var(--app-accent)]"
          title={labels.zoomOut}
          aria-label={labels.zoomOut}
        >
          -
        </button>
        <button
          type="button"
          onClick={() => updateManualScale(1)}
          className="min-w-12 rounded-md px-2 py-1 font-medium text-[var(--app-muted)] transition hover:bg-[var(--app-accent-soft)] hover:text-[var(--app-accent)]"
          title={labels.actualSize}
        >
          {Math.round(scale * 100)}%
        </button>
        <button
          type="button"
          onClick={() => updateManualScale(scale + scaleStep)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--app-muted)] transition hover:bg-[var(--app-accent-soft)] hover:text-[var(--app-accent)]"
          title={labels.zoomIn}
          aria-label={labels.zoomIn}
        >
          +
        </button>
      </div>

      <div
        ref={containerRef}
        className="max-h-[82vh] min-h-[520px] overflow-auto rounded-xl p-6"
      >
        <div
          className="mx-auto"
          style={{
            width: paperWidth * scale,
            height: paperHeight * scale,
          }}
        >
          <div
            className="origin-top-left bg-white shadow-xl"
            style={{
              width: paperWidth,
              transform: `scale(${scale})`,
            }}
          >
            <ResumeDocument fontPreset={resume.fontPreset}>
              <Template resume={resume} />
            </ResumeDocument>
          </div>
        </div>
      </div>
    </div>
  );
}

function clampScale(scale: number) {
  return Math.min(maxScale, Math.max(minScale, scale));
}
