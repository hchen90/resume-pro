"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { SystemSettings } from "@/components/system-settings";
import { resumeTemplates } from "@/templates/resume/registry";
import { dictionaries, type Locale } from "@/lib/i18n";
import { createNode } from "@/lib/resume/defaults";
import type {
  ResumeNode,
  ResumeNodeType,
  ResumeWithNodes,
} from "@/lib/resume/types";
import { settingsQuery, type UiStyle } from "@/lib/settings";

import { AiPanel } from "./ai-panel";
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
  const [selectedNodeId, setSelectedNodeId] = useState(
    initialResume.nodes[0]?.id ?? "",
  );
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");
  const [isPending, startTransition] = useTransition();
  const [isNodesCollapsed, setIsNodesCollapsed] = useState(false);
  const [isAiCollapsed, setIsAiCollapsed] = useState(false);

  const selectedNode = useMemo(
    () => resume.nodes.find((node) => node.id === selectedNodeId) ?? resume.nodes[0],
    [resume.nodes, selectedNodeId],
  );

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
    const node = createNode(resume.id, type, defaultTitle(type, locale), resume.nodes.length);
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

  function saveResume() {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/resumes/${resume.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: resume.title,
            templateId: resume.templateId,
            nodes: resume.nodes,
          }),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const saved = (await response.json()) as ResumeWithNodes;
        setResume(saved);
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    });
  }

  return (
    <main
      className={`mx-auto grid w-full max-w-[1600px] flex-1 gap-4 px-4 py-5 xl:gap-5 xl:px-5 ${workspaceGridClass(
        isNodesCollapsed,
        isAiCollapsed,
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
              {resume.nodes
                .slice()
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((node) => (
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
            <div className="mt-4">
              <SystemSettings
                currentLocale={locale}
                currentUiStyle={uiStyle}
                labels={{
                  settings: t.settings,
                  language: t.language,
                  interfaceStyle: t.interfaceStyle,
                  uiStyles: t.uiStyles,
                }}
              />
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

            <div className="mt-6 space-y-2">
              <p className="px-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--app-muted)]">
                {t.nodesPanel}
              </p>
              {resume.nodes
                .slice()
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((node) => (
                  <button
                    type="button"
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`w-full rounded-lg px-4 py-3 text-left text-sm transition ${
                      selectedNode?.id === node.id
                        ? "bg-[var(--app-accent-soft)] text-[var(--app-accent)] ring-1 ring-[var(--app-accent-border)]"
                        : "bg-[var(--app-muted-surface)] text-[var(--app-muted)] hover:bg-[var(--app-accent-soft)]"
                    }`}
                  >
                    <span className="block font-medium">{node.title}</span>
                    <span className="text-xs opacity-70">
                      {t.nodeTitles[node.type]}
                    </span>
                  </button>
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
              disabled={isPending}
              className="mt-6 w-full rounded-lg bg-[var(--app-primary)] px-4 py-3 font-semibold text-white transition hover:bg-[var(--app-primary-hover)] disabled:opacity-60"
            >
              {isPending ? t.saving : t.save}
            </button>
            <Link
              href={`/resumes/${resume.id}/download?template=${resume.templateId}&${settingsQuery({ lang: locale, style: uiStyle })}`}
              className="mt-3 block rounded-lg border border-[var(--app-border)] px-4 py-3 text-center font-semibold text-[var(--app-text)] hover:bg-[var(--app-muted-surface)]"
            >
              {t.downloadPrint}
            </Link>
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
                addItem: t.addItem,
                deleteItem: t.deleteItem,
                itemTitle: t.itemTitle,
                itemSubtitle: t.itemSubtitle,
                itemStartDate: t.itemStartDate,
                itemEndDate: t.itemEndDate,
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
        <ResumePreview resume={resume} />
      </section>

      <div className="no-print min-w-0">
        {isAiCollapsed ? (
          <button
            type="button"
            onClick={() => setIsAiCollapsed(false)}
            className="flex min-h-[620px] w-full flex-col items-center justify-center gap-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 text-[var(--app-muted)] shadow-sm transition hover:bg-[var(--app-muted-surface)]"
            title={t.expandAi}
            aria-label={t.expandAi}
          >
            <span className="rounded-md bg-[var(--app-accent-soft)] px-2 py-1 text-xs font-semibold text-[var(--app-accent)] ring-1 ring-[var(--app-accent-border)]">
              AI
            </span>
            <span className="[writing-mode:vertical-rl] text-xs font-semibold uppercase tracking-[0.24em] text-[var(--app-muted)]">
              {t.aiAssistant}
            </span>
            <RightSidebarIcon action="expand" />
          </button>
        ) : (
          <AiPanel
            resume={resume}
            selectedNodeId={selectedNode?.id ?? ""}
            locale={locale}
            onCollapse={() => setIsAiCollapsed(true)}
            onResumeUpdated={(updatedResume) => {
              setResume(updatedResume);
              setSaveState("saved");
            }}
          />
        )}
      </div>
    </main>
  );
}

function defaultTitle(type: ResumeNodeType, locale: Locale) {
  return dictionaries[locale].nodeTitles[type];
}

function workspaceGridClass(nodesCollapsed: boolean, aiCollapsed: boolean) {
  if (nodesCollapsed && aiCollapsed) {
    return "xl:grid-cols-[64px_minmax(0,1fr)_56px] 2xl:grid-cols-[72px_minmax(0,1fr)_64px]";
  }

  if (nodesCollapsed) {
    return "xl:grid-cols-[64px_minmax(0,1fr)_minmax(280px,320px)] 2xl:grid-cols-[72px_minmax(0,1fr)_380px]";
  }

  if (aiCollapsed) {
    return "xl:grid-cols-[minmax(220px,260px)_minmax(0,1fr)_56px] 2xl:grid-cols-[280px_minmax(0,1fr)_64px]";
  }

  return "xl:grid-cols-[minmax(220px,260px)_minmax(0,1fr)_minmax(280px,320px)] 2xl:grid-cols-[280px_minmax(0,1fr)_380px]";
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

function RightSidebarIcon({ action }: { action: "expand" | "collapse" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="currentColor"
    >
      <path d="M2.75 3A1.75 1.75 0 0 1 4.5 1.25h7A1.75 1.75 0 0 1 13.25 3v10a1.75 1.75 0 0 1-1.75 1.75h-7A1.75 1.75 0 0 1 2.75 13V3Zm1.75-.25A.25.25 0 0 0 4.25 3v10c0 .14.11.25.25.25h4.75V2.75H4.5Zm6.25 10.5h.75c.14 0 .25-.11.25-.25V3a.25.25 0 0 0-.25-.25h-.75v10.5Z" />
      <path
        d={
          action === "expand"
            ? "M5.22 5.47a.75.75 0 0 1 1.06 0l2 2a.75.75 0 0 1 0 1.06l-2 2a.75.75 0 1 1-1.06-1.06L6.69 8 5.22 6.53a.75.75 0 0 1 0-1.06Z"
            : "M7.78 5.47a.75.75 0 0 1 0 1.06L6.31 8l1.47 1.47a.75.75 0 0 1-1.06 1.06L4.72 8.53a.75.75 0 0 1 0-1.06l2-2a.75.75 0 0 1 1.06 0Z"
        }
      />
    </svg>
  );
}
