"use client";

import Link from "next/link";
import {
  type DragEvent,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import { resumeTemplates } from "@/templates/resume/registry";
import { dictionaries, type Locale } from "@/lib/i18n";
import { createNode } from "@/lib/resume/defaults";
import {
  getFontPresets,
  resolveResumeFontPreset,
  resumeFontPresetLabel,
  type ResumeFontPreset,
} from "@/lib/resume/fonts";
import type {
  ResumeNode,
  ResumeNodeType,
  ResumeWithNodes,
} from "@/lib/resume/types";
import { settingsQuery, type UiStyle } from "@/lib/settings";

import { AiFloatingAssistant } from "./ai-floating-assistant";
import { NodeEditor } from "./node-editor";
import { ResumePreview } from "./resume-preview";

type AddableNodeType = Exclude<ResumeNodeType, "profile">;

const addableTypes: AddableNodeType[] = [
  "summary",
  "experience",
  "project",
  "education",
  "skills",
  "custom",
];

type WorkspaceStatus = {
  clean: boolean;
  shortHash: string | null;
};

function resumeFingerprint(value: ResumeWithNodes) {
  return JSON.stringify({
    title: value.title,
    templateId: value.templateId,
    fontPreset: value.fontPreset,
    nodes: value.nodes,
  });
}

export function ResumeWorkspace({
  initialResume,
  locale,
  uiStyle,
}: {
  initialResume: ResumeWithNodes;
  locale: Locale;
  uiStyle: UiStyle;
}) {
  const t = dictionaries[locale];
  const [resume, setResume] = useState(initialResume);
  const [savedFingerprint, setSavedFingerprint] = useState(() =>
    resumeFingerprint(initialResume),
  );
  const [workspaceStatus, setWorkspaceStatus] = useState<WorkspaceStatus>({
    clean: true,
    shortHash: null,
  });
  const [selectedNodeId, setSelectedNodeId] = useState(
    initialResume.nodes[0]?.id ?? "",
  );
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");
  const [isPending, startTransition] = useTransition();
  const [isNodesCollapsed, setIsNodesCollapsed] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const selectedNode = useMemo(
    () => resume.nodes.find((node) => node.id === selectedNodeId) ?? resume.nodes[0],
    [resume.nodes, selectedNodeId],
  );
  const orderedNodes = useMemo(
    () => resume.nodes.slice().sort((a, b) => a.sortOrder - b.sortOrder),
    [resume.nodes],
  );
  const isDirty = resumeFingerprint(resume) !== savedFingerprint;
  const canSave = isDirty || !workspaceStatus.clean;

  useEffect(() => {
    let cancelled = false;

    async function refreshWorkspaceStatus() {
      try {
        const response = await fetch("/api/workspace/status");
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as {
          clean: boolean;
          shortHash: string | null;
        };
        if (!cancelled) {
          setWorkspaceStatus({
            clean: payload.clean,
            shortHash: payload.shortHash,
          });
        }
      } catch {
        // ignore status fetch errors
      }
    }

    void refreshWorkspaceStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  function applySavedResume(saved: ResumeWithNodes) {
    setResume(saved);
    setSavedFingerprint(resumeFingerprint(saved));
    setSaveState("saved");
  }

  function updateNode(updatedNode: ResumeNode) {
    setResume((current) => ({
      ...current,
      nodes: current.nodes.map((node) =>
        node.id === updatedNode.id ? updatedNode : node,
      ),
    }));
    setSaveState("idle");
  }

  function addNode(type: ResumeNodeType) {
    const node = createNode(
      resume.id,
      type,
      defaultTitle(type, locale),
      resume.nodes.length,
      locale,
    );
    setResume((current) => ({
      ...current,
      nodes: [...current.nodes, node],
    }));
    setSelectedNodeId(node.id);
    setSaveState("idle");
  }

  function removeSelectedNode() {
    if (!selectedNode || selectedNode.type === "profile") {
      return;
    }

    setResume((current) => {
      const nodes = current.nodes.filter((node) => node.id !== selectedNode.id);
      setSelectedNodeId(nodes[0]?.id ?? "");
      return { ...current, nodes };
    });
    setSaveState("idle");
  }

  function reorderNodes(sourceNodeId: string, targetNodeId: string) {
    if (sourceNodeId === targetNodeId) {
      return;
    }

    setResume((current) => {
      const ordered = current.nodes
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const sourceIndex = ordered.findIndex((node) => node.id === sourceNodeId);
      const targetIndex = ordered.findIndex((node) => node.id === targetNodeId);

      if (sourceIndex < 0 || targetIndex < 0) {
        return current;
      }

      const [sourceNode] = ordered.splice(sourceIndex, 1);
      ordered.splice(targetIndex, 0, sourceNode);

      return {
        ...current,
        nodes: ordered.map((node, index) => ({
          ...node,
          sortOrder: index,
        })),
      };
    });
    setSaveState("idle");
  }

  function handleNodeDrop(event: DragEvent, targetNodeId: string) {
    event.preventDefault();

    if (draggedNodeId) {
      reorderNodes(draggedNodeId, targetNodeId);
    }

    setDraggedNodeId(null);
  }

  function saveResume() {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/resumes/${resume.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: resume.title,
            templateId: resume.templateId,
            fontPreset: resume.fontPreset,
            nodes: resume.nodes,
          }),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const saved = (await response.json()) as ResumeWithNodes;
        applySavedResume(saved);
        try {
          const statusResponse = await fetch("/api/workspace/status");
          if (statusResponse.ok) {
            const payload = (await statusResponse.json()) as {
              clean: boolean;
              shortHash: string | null;
            };
            setWorkspaceStatus({
              clean: payload.clean,
              shortHash: payload.shortHash,
            });
          }
        } catch {
          // ignore
        }
      } catch {
        setSaveState("error");
      }
    });
  }

  async function deleteCurrentResume() {
    if (isDeleting || !window.confirm(t.deleteResumeConfirm)) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/resumes/${resume.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      window.location.href = `/?${settingsQuery({ lang: locale, style: uiStyle })}`;
    } catch {
      setSaveState("error");
      setIsDeleting(false);
    }
  }

  return (
    <main
      className={`mx-auto grid w-full max-w-[1600px] flex-1 gap-4 px-4 py-5 xl:gap-5 xl:px-5 ${workspaceGridClass(
        isNodesCollapsed,
      )}`}
    >
      <nav
        className={`no-print min-w-0 rounded-xl bg-[var(--app-surface)] p-4 shadow-sm ring-1 ring-[var(--app-border)] ${
          isNodesCollapsed ? "flex flex-col items-center gap-3" : ""
        }`}
      >
        {isNodesCollapsed ? (
          <>
            <button
              type="button"
              onClick={() => setIsNodesCollapsed(false)}
              className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--app-accent)] text-sm font-semibold text-white transition hover:bg-[var(--app-accent-hover)]"
              title={t.expandNodes}
              aria-label={t.expandNodes}
            >
              <PanelIcon direction="right" />
            </button>
            <Link
              href={`/?${settingsQuery({ lang: locale, style: uiStyle })}`}
              className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--app-muted-surface)] text-xs font-semibold text-[var(--app-muted)] transition hover:bg-[var(--app-accent-soft)]"
              title={t.backToList}
              aria-label={t.backToList}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="h-4 w-4"
                fill="currentColor"
              >
                <path d="M7.47 1.84a.75.75 0 0 1 1.06 0l5.25 5.25a.75.75 0 0 1-1.06 1.06l-.47-.47V13A1.25 1.25 0 0 1 11 14.25H9.75a.75.75 0 0 1-.75-.75V10H7v3.5a.75.75 0 0 1-.75.75H5A1.25 1.25 0 0 1 3.75 13V7.68l-.47.47a.75.75 0 0 1-1.06-1.06l5.25-5.25ZM5.25 6.18v6.57h.25V9.5A1.5 1.5 0 0 1 7 8h2a1.5 1.5 0 0 1 1.5 1.5v3.25h.25V6.18L8 3.43 5.25 6.18Z" />
              </svg>
            </Link>
            <div className="mt-2 flex w-full flex-col items-center gap-2">
              {orderedNodes.map((node) => (
                <button
                  type="button"
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg text-xs font-semibold transition ${
                    selectedNode?.id === node.id
                      ? "bg-[var(--app-accent-soft)] text-[var(--app-accent)] ring-1 ring-[var(--app-accent-border)]"
                      : "bg-[var(--app-muted-surface)] text-[var(--app-muted)] hover:bg-[var(--app-accent-soft)]"
                  }`}
                  title={node.title}
                >
                  {node.title.slice(0, 1).toUpperCase()}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <Link
                href={`/?${settingsQuery({ lang: locale, style: uiStyle })}`}
                className="text-sm text-[var(--app-muted)] hover:text-[var(--app-text)]"
              >
                {t.backToList}
              </Link>
              <button
                type="button"
                onClick={() => setIsNodesCollapsed(true)}
                className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--app-muted-surface)] text-[var(--app-muted)] transition hover:bg-[var(--app-accent-soft)]"
                title={t.collapseNodes}
                aria-label={t.collapseNodes}
              >
                <PanelIcon direction="left" />
              </button>
            </div>
            <input
              value={resume.title}
              onChange={(event) => {
                setResume({ ...resume, title: event.target.value });
                setSaveState("idle");
              }}
              className="mt-5 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-xl font-semibold outline-none focus:border-[var(--app-accent)]"
            />

            <label className="mt-4 block text-sm text-[var(--app-muted)]">
              {t.defaultDownloadStyle}
              <select
                value={resume.templateId}
                onChange={(event) => {
                  setResume({ ...resume, templateId: event.target.value });
                  setSaveState("idle");
                }}
                className="mt-2 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 outline-none focus:border-[var(--app-accent)]"
              >
                {resumeTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 block text-sm text-[var(--app-muted)]">
              {t.resumeFont}
              <select
                value={resolveResumeFontPreset(resume.fontPreset)}
                onChange={(event) => {
                  setResume({
                    ...resume,
                    fontPreset: event.target.value as ResumeFontPreset,
                  });
                  setSaveState("idle");
                }}
                className="mt-2 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 outline-none focus:border-[var(--app-accent)]"
              >
                {getFontPresets().map((preset) => (
                  <option key={preset} value={preset}>
                    {resumeFontPresetLabel(preset)}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-6 space-y-2">
              <p className="px-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--app-muted)]">
                {t.nodesPanel}
              </p>
              <p className="px-1 text-xs text-[var(--app-muted)]">
                {t.reorderNodesHelp}
              </p>
              {orderedNodes.map((node) => (
                <div
                  key={node.id}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", node.id);
                    setDraggedNodeId(node.id);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleNodeDrop(event, node.id)}
                  onDragEnd={() => setDraggedNodeId(null)}
                  className={`rounded-lg transition ${
                    draggedNodeId === node.id ? "opacity-50" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition ${
                      selectedNode?.id === node.id
                        ? "bg-[var(--app-accent-soft)] text-[var(--app-accent)] ring-1 ring-[var(--app-accent-border)]"
                        : "bg-[var(--app-muted-surface)] text-[var(--app-muted)] hover:bg-[var(--app-accent-soft)]"
                    }`}
                  >
                    <span
                      className="flex h-8 w-5 shrink-0 cursor-grab items-center justify-center text-[var(--app-muted)] active:cursor-grabbing"
                      title={t.dragNode}
                      aria-label={t.dragNode}
                    >
                      <DragHandleIcon />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {node.title}
                      </span>
                      <span className="text-xs opacity-70">
                        {t.nodeTitles[node.type]}
                      </span>
                    </span>
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2">
              {addableTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => addNode(type)}
                  className="rounded-lg bg-[var(--app-muted-surface)] px-3 py-2 text-sm text-[var(--app-text)] hover:bg-[var(--app-accent-soft)]"
                >
                  + {t.addNodeLabels[type]}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={saveResume}
              disabled={isPending || isDeleting || !canSave}
              className="mt-6 w-full rounded-lg bg-[var(--app-primary)] px-4 py-3 font-semibold text-white transition hover:bg-[var(--app-primary-hover)] disabled:opacity-60"
            >
              {isPending ? t.saving : canSave ? t.save : t.workspaceClean}
            </button>
            <p className="mt-2 text-center text-xs text-[var(--app-muted)]">
              {canSave ? t.workspaceCanSave : t.workspaceClean}
              {workspaceStatus.shortHash
                ? ` · ${t.workspaceHashLabel(workspaceStatus.shortHash)}`
                : null}
            </p>
            <Link
              href={`/resumes/${resume.id}/download?template=${encodeURIComponent(resume.templateId)}&font=${encodeURIComponent(resolveResumeFontPreset(resume.fontPreset))}&${settingsQuery({ lang: locale, style: uiStyle })}`}
              className="mt-3 block rounded-lg border border-[var(--app-border)] px-4 py-3 text-center font-semibold text-[var(--app-text)] hover:bg-[var(--app-muted-surface)]"
            >
              {t.downloadPrint}
            </Link>
            <button
              type="button"
              onClick={() => void deleteCurrentResume()}
              disabled={isDeleting}
              className="mt-3 w-full rounded-lg border border-red-200 px-4 py-3 font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t.deleteResume}
            </button>
            {saveState === "saved" ? (
              <p className="mt-3 text-center text-sm text-emerald-600">
                {t.saved}
              </p>
            ) : null}
            {saveState === "error" ? (
              <p className="mt-3 text-center text-sm text-red-600">
                {t.saveFailed}
              </p>
            ) : null}
          </>
        )}
      </nav>

      <section className="min-w-0 space-y-5">
        {selectedNode ? (
          <>
            <NodeEditor
              node={selectedNode}
              onChange={updateNode}
              labels={{
                sectionTitle: t.sectionTitle,
                content: t.content,
                markdownHelp: t.markdownHelp,
                addItem: t.addItem,
                deleteItem: t.deleteItem,
                itemTitle: t.itemTitle,
                itemSubtitle: t.itemSubtitle,
                itemStartDate: t.itemStartDate,
                itemEndDate: t.itemEndDate,
                itemDatePlaceholder: t.itemDatePlaceholder,
                itemLocation: t.itemLocation,
                itemDescription: t.itemDescription,
                skillsHelp: t.skillsHelp,
                profileFields: t.profileFields,
              }}
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={removeSelectedNode}
                disabled={selectedNode.type === "profile"}
                className="no-print rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t.deleteCurrentNode}
              </button>
            </div>
          </>
        ) : null}
        <ResumePreview
          resume={resume}
          locale={locale}
          labels={{
            fit: t.previewFit,
            zoomIn: t.previewZoomIn,
            zoomOut: t.previewZoomOut,
            actualSize: t.previewActualSize,
          }}
        />
      </section>

      <AiFloatingAssistant
        resume={resume}
        selectedNodeId={selectedNode?.id ?? ""}
        locale={locale}
        onResumeUpdated={(updatedResume) => {
          applySavedResume(updatedResume);
          void fetch("/api/workspace/status")
            .then((response) => (response.ok ? response.json() : null))
            .then((payload: { clean: boolean; shortHash: string | null } | null) => {
              if (payload) {
                setWorkspaceStatus({
                  clean: payload.clean,
                  shortHash: payload.shortHash,
                });
              }
            })
            .catch(() => undefined);
        }}
      />
    </main>
  );
}

function defaultTitle(type: ResumeNodeType, locale: Locale) {
  return dictionaries[locale].nodeTitles[type];
}

function workspaceGridClass(nodesCollapsed: boolean) {
  if (nodesCollapsed) {
    return "xl:grid-cols-[64px_minmax(0,1fr)] 2xl:grid-cols-[72px_minmax(0,1fr)]";
  }

  return "xl:grid-cols-[minmax(220px,260px)_minmax(0,1fr)] 2xl:grid-cols-[280px_minmax(0,1fr)]";
}

function PanelIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="currentColor"
    >
      <path
        d={
          direction === "left"
            ? "M10.78 12.53a.75.75 0 0 1-1.06 0L5.19 8l4.53-4.53a.75.75 0 1 1 1.06 1.06L7.31 8l3.47 3.47a.75.75 0 0 1 0 1.06Z"
            : "M5.22 3.47a.75.75 0 0 1 1.06 0L10.81 8l-4.53 4.53a.75.75 0 1 1-1.06-1.06L8.69 8 5.22 4.53a.75.75 0 0 1 0-1.06Z"
        }
      />
    </svg>
  );
}

function DragHandleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="currentColor"
    >
      <path d="M5 3.25A1.25 1.25 0 1 1 2.5 3.25 1.25 1.25 0 0 1 5 3.25Zm0 4.75A1.25 1.25 0 1 1 2.5 8 1.25 1.25 0 0 1 5 8Zm-1.25 6A1.25 1.25 0 1 0 3.75 11.5 1.25 1.25 0 0 0 3.75 14ZM13.5 3.25A1.25 1.25 0 1 1 11 3.25a1.25 1.25 0 0 1 2.5 0ZM12.25 9.25A1.25 1.25 0 1 0 12.25 6.75a1.25 1.25 0 0 0 0 2.5Zm1.25 3.5A1.25 1.25 0 1 1 11 12.75a1.25 1.25 0 0 1 2.5 0Z" />
    </svg>
  );
}

