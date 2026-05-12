import {
  contactLine,
  itemDateRange,
  nodeItems,
  nonProfileNodes,
  profileNode,
} from "@/lib/resume/format";

import { MarkdownContent } from "./markdown-content";
import type { ResumeTemplate, ResumeTemplateProps } from "./types";

function ClassicTemplate({ resume }: ResumeTemplateProps) {
  const profile = profileNode(resume);

  return (
    <article className="min-h-[1123px] bg-white p-12 text-zinc-950">
      <header className="border-b-2 border-zinc-900 pb-6">
        <h1 className="text-4xl font-bold tracking-tight">
          {profile?.content.name ?? resume.title}
        </h1>
        <p className="mt-2 text-lg text-zinc-700">{profile?.content.headline}</p>
        <p className="mt-3 text-sm text-zinc-600">{contactLine(profile)}</p>
      </header>

      <div className="mt-8 space-y-7">
        {nonProfileNodes(resume).map((node) => (
          <section key={node.id}>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-zinc-500">
              {node.title}
            </h2>
            {node.type === "skills" ? (
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm leading-7 text-zinc-800">
                {(node.content.skills ?? []).map((skill) => (
                  <span key={skill} className="inline-flex items-center gap-3">
                    <span>{skill}</span>
                    <span className="text-zinc-300 last:hidden">/</span>
                  </span>
                ))}
              </div>
            ) : nodeItems(node).length > 0 ? (
              <div className="space-y-5 text-sm text-zinc-800">
                {nodeItems(node).map((item) => (
                  <div key={item.id}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-zinc-950">
                          {item.title || node.title}
                        </h3>
                        {item.subtitle ? (
                          <p className="text-zinc-600">{item.subtitle}</p>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right text-xs text-zinc-500">
                        <p>{itemDateRange(item)}</p>
                        <p>{item.location}</p>
                      </div>
                    </div>
                    <MarkdownContent
                      value={item.description}
                      className="mt-2 space-y-1 leading-7"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <MarkdownContent
                value={node.content.body}
                className="space-y-1 text-sm leading-7 text-zinc-800"
              />
            )}
          </section>
        ))}
      </div>
    </article>
  );
}

export const classicTemplate: ResumeTemplate = {
  id: "classic",
  name: "Classic",
  description: "清晰、正式、适合传统岗位投递。",
  paper: "a4",
  component: ClassicTemplate,
};
