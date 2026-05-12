import {
  contactLine,
  itemDateRange,
  nodeItems,
  nonProfileNodes,
  profileNode,
} from "@/lib/resume/format";

import { MarkdownContent } from "./markdown-content";
import type { ResumeTemplate, ResumeTemplateProps } from "./types";

function CompactTemplate({ resume }: ResumeTemplateProps) {
  const profile = profileNode(resume);

  return (
    <article className="min-h-[1123px] bg-white px-10 py-9 text-zinc-950">
      <header className="border-b border-zinc-300 pb-4">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">
              {profile?.content.name ?? resume.title}
            </h1>
            {profile?.content.headline ? (
              <p className="mt-1 text-sm font-medium uppercase tracking-[0.18em] text-zinc-500">
                {profile.content.headline}
              </p>
            ) : null}
          </div>
          <p className="max-w-[280px] text-right text-xs leading-5 text-zinc-600">
            {contactLine(profile)}
          </p>
        </div>
      </header>

      <div className="mt-5 space-y-5">
        {nonProfileNodes(resume).map((node) => (
          <section
            key={node.id}
            className="grid grid-cols-[120px_1fr] gap-5 border-b border-zinc-100 pb-5 last:border-b-0"
          >
            <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">
              {node.title}
            </h2>
            {node.type === "skills" ? (
              <p className="text-sm leading-7 text-zinc-800">
                {(node.content.skills ?? []).join(" / ")}
              </p>
            ) : nodeItems(node).length > 0 ? (
              <div className="space-y-4 text-sm text-zinc-800">
                {nodeItems(node).map((item) => (
                  <div key={item.id}>
                    <div className="flex items-baseline justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-zinc-950">
                          {item.title || node.title}
                        </h3>
                        {item.subtitle ? (
                          <p className="text-zinc-600">{item.subtitle}</p>
                        ) : null}
                      </div>
                      <p className="shrink-0 text-xs text-zinc-500">
                        {[itemDateRange(item), item.location]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <MarkdownContent
                      value={item.description}
                      className="mt-1 space-y-1 leading-6"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <MarkdownContent
                value={node.content.body}
                className="space-y-1 text-sm leading-6 text-zinc-800"
              />
            )}
          </section>
        ))}
      </div>
    </article>
  );
}

export const compactTemplate: ResumeTemplate = {
  id: "compact",
  name: "Compact",
  description: "信息密度高，适合内容较多但希望控制在单页的简历。",
  paper: "a4",
  component: CompactTemplate,
};
