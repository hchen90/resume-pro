"use client";

import {
  createEmptyNodeItem,
  isMultiItemNodeType,
} from "@/lib/resume/defaults";
import type {
  ResumeNode,
  ResumeNodeContent,
  ResumeNodeItem,
} from "@/lib/resume/types";

type NodeEditorProps = {
  node: ResumeNode;
  onChange: (node: ResumeNode) => void;
  labels: {
    sectionTitle: string;
    content: string;
    markdownHelp: string;
    addItem: string;
    deleteItem: string;
    itemTitle: string;
    itemSubtitle: string;
    itemStartDate: string;
    itemEndDate: string;
    itemLocation: string;
    itemDescription: string;
    skillsHelp: string;
    profileFields: Record<
      "name" | "headline" | "email" | "phone" | "location" | "website",
      string
    >;
  };
};

export function NodeEditor({ node, onChange, labels }: NodeEditorProps) {
  const updateContent = (content: ResumeNodeContent) => {
    onChange({ ...node, content: { ...node.content, ...content } });
  };

  return (
    <div className="space-y-4 rounded-xl bg-[var(--app-surface)] p-5 shadow-sm ring-1 ring-[var(--app-border)]">
      <div>
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--app-muted)]">
          {labels.sectionTitle}
        </label>
        <input
          value={node.title}
          onChange={(event) => onChange({ ...node, title: event.target.value })}
          className="mt-2 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 outline-none focus:border-[var(--app-accent)]"
        />
      </div>

      {node.type === "profile" ? (
        <ProfileFields
          node={node}
          updateContent={updateContent}
          labels={labels.profileFields}
        />
      ) : node.type === "skills" ? (
        <SkillsField
          node={node}
          updateContent={updateContent}
          label={labels.skillsHelp}
        />
      ) : isMultiItemNodeType(node.type) ? (
        <ItemsField node={node} updateContent={updateContent} labels={labels} />
      ) : (
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--app-muted)]">
            {labels.content}
          </label>
          <textarea
            value={node.content.body ?? ""}
            onChange={(event) => updateContent({ body: event.target.value })}
            rows={14}
            className="mt-2 w-full resize-y rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 leading-7 outline-none focus:border-[var(--app-accent)]"
          />
          <p className="mt-2 text-xs text-[var(--app-muted)]">
            {labels.markdownHelp}
          </p>
        </div>
      )}
    </div>
  );
}

function ItemsField({
  node,
  updateContent,
  labels,
}: {
  node: ResumeNode;
  updateContent: (content: ResumeNodeContent) => void;
  labels: NodeEditorProps["labels"];
}) {
  const items = node.content.items?.length
    ? node.content.items
    : [createEmptyNodeItem()];
  const dateInputType = isMultiItemNodeType(node.type) ? "month" : "text";

  function updateItem(itemId: string, patch: Partial<ResumeNodeItem>) {
    updateContent({
      items: items.map((item) =>
        item.id === itemId ? { ...item, ...patch } : item,
      ),
      body: "",
    });
  }

  function addItem() {
    updateContent({ items: [...items, createEmptyNodeItem()], body: "" });
  }

  function deleteItem(itemId: string) {
    updateContent({
      items:
        items.length > 1
          ? items.filter((item) => item.id !== itemId)
          : [createEmptyNodeItem()],
      body: "",
    });
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div
          key={item.id}
          className="space-y-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-muted-surface)] p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--app-muted)]">
              {labels.content} {index + 1}
            </p>
            <button
              type="button"
              onClick={() => deleteItem(item.id)}
              className="rounded-md border border-red-200 bg-white px-2 py-1 text-xs text-red-600 hover:bg-red-50"
            >
              {labels.deleteItem}
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <ItemInput
              label={labels.itemTitle}
              value={item.title}
              onChange={(value) => updateItem(item.id, { title: value })}
            />
            <ItemInput
              label={labels.itemSubtitle}
              value={item.subtitle}
              onChange={(value) => updateItem(item.id, { subtitle: value })}
            />
            <ItemInput
              label={labels.itemStartDate}
              value={item.startDate}
              type={dateInputType}
              onChange={(value) => updateItem(item.id, { startDate: value })}
            />
            <ItemInput
              label={labels.itemEndDate}
              value={item.endDate}
              type={dateInputType}
              onChange={(value) => updateItem(item.id, { endDate: value })}
            />
            <ItemInput
              label={labels.itemLocation}
              value={item.location}
              onChange={(value) => updateItem(item.id, { location: value })}
            />
          </div>

          <label className="block text-sm text-[var(--app-muted)]">
            {labels.itemDescription}
            <textarea
              value={item.description ?? ""}
              onChange={(event) =>
                updateItem(item.id, { description: event.target.value })
              }
              rows={6}
              className="mt-1 w-full resize-y rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
            />
            <span className="mt-2 block text-xs text-[var(--app-muted)]">
              {labels.markdownHelp}
            </span>
          </label>
        </div>
      ))}

      <button
        type="button"
        onClick={addItem}
        className="rounded-lg bg-[var(--app-muted-surface)] px-4 py-2 text-sm font-medium text-[var(--app-text)] hover:bg-[var(--app-accent-soft)]"
      >
        + {labels.addItem}
      </button>
    </div>
  );
}

function ItemInput({
  label,
  value,
  type = "text",
  onChange,
}: {
  label: string;
  value?: string;
  type?: "text" | "month";
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm text-[var(--app-muted)]">
      {label}
      <input
        type={type}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
      />
    </label>
  );
}

function ProfileFields({
  node,
  updateContent,
  labels,
}: {
  node: ResumeNode;
  updateContent: (content: ResumeNodeContent) => void;
  labels: NodeEditorProps["labels"]["profileFields"];
}) {
  const fields: Array<keyof typeof labels> = [
    "name",
    "headline",
    "email",
    "phone",
    "location",
    "website",
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {fields.map((field) => (
        <label key={field} className="text-sm text-[var(--app-muted)]">
          {labels[field]}
          <input
            value={String(node.content[field] ?? "")}
            onChange={(event) => updateContent({ [field]: event.target.value })}
            className="mt-1 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
          />
        </label>
      ))}
    </div>
  );
}

function SkillsField({
  node,
  updateContent,
  label,
}: {
  node: ResumeNode;
  updateContent: (content: ResumeNodeContent) => void;
  label: string;
}) {
  return (
    <label className="block text-sm text-[var(--app-muted)]">
      {label}
      <textarea
        value={(node.content.skills ?? []).join(", ")}
        onChange={(event) =>
          updateContent({
            skills: event.target.value
              .split(",")
              .map((skill) => skill.trim())
              .filter(Boolean),
          })
        }
        rows={6}
        className="mt-2 w-full resize-y rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
      />
    </label>
  );
}
