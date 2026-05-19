import {
  contactLine,
  itemDateRange,
  nodeItems,
  nonProfileNodes,
  profileNode,
} from "@/lib/resume/format";

import { MarkdownContent } from "./markdown-content";
import type { ResumeTemplate, ResumeTemplateProps } from "./types";

function ElegantTemplate({ resume }: ResumeTemplateProps) {
  const profile = profileNode(resume);

  return (
    <article className="resume-template-elegant min-h-[1123px] bg-[#fbfaf7] p-12 text-stone-950">
      <header className="text-center">
        <p className="text-xs uppercase tracking-[0.5em] text-stone-500">
          {profile?.content.headline}
        </p>
        <h1 className="mt-4 text-5xl tracking-tight">
          {profile?.content.name ?? resume.title}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl border-y border-stone-300 py-3 text-xs uppercase tracking-[0.16em] text-stone-600">
          {contactLine(profile)}
        </p>
      </header>

      <div className="mt-10 space-y-9">
        {nonProfileNodes(resume).map((node) => (
          <section key={node.id}>
            <h2 className="mb-4 flex items-center gap-4 text-2xl text-stone-900">
              <span>{node.title}</span>
              <span className="h-px flex-1 bg-stone-300" />
            </h2>
            {node.type === "skills" ? (
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm leading-7 text-stone-700">
                {(node.content.skills ?? []).map((skill) => (
                  <span key={skill} className="inline-flex items-center gap-3">
                    <span>{skill}</span>
                    <span className="text-stone-300 last:hidden">·</span>
                  </span>
                ))}
              </div>
            ) : nodeItems(node).length > 0 ? (
              <div className="space-y-6 text-sm text-stone-800">
                {nodeItems(node).map((item) => (
                  <div key={item.id}>
                    <div className="flex items-start justify-between gap-5">
                      <div>
                        <h3 className="text-xl text-stone-950">
                          {item.title || node.title}
                        </h3>
                        {item.subtitle ? (
                          <p className="mt-1 italic text-stone-600">
                            {item.subtitle}
                          </p>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right text-xs uppercase tracking-[0.12em] text-stone-500">
                        <p>{itemDateRange(item)}</p>
                        <p>{item.location}</p>
                      </div>
                    </div>
                    <MarkdownContent
                      value={item.description}
                      className="mt-3 space-y-2 leading-7"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <MarkdownContent
                value={node.content.body}
                className="space-y-2 text-sm leading-7 text-stone-800"
              />
            )}
          </section>
        ))}
      </div>
    </article>
  );
}

export const elegantTemplate: ResumeTemplate = {
  id: "elegant",
  name: "Elegant",
  description: "优雅留白和衬线标题，适合产品、运营、咨询等岗位。",
  paper: "a4",
  component: ElegantTemplate,
};
