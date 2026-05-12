import {
  contactLine,
  itemDateRange,
  nodeItems,
  nonProfileNodes,
  profileNode,
  splitLines,
} from "@/lib/resume/format";

import type { ResumeTemplate, ResumeTemplateProps } from "./types";

function ModernTemplate({ resume }: ResumeTemplateProps) {
  const profile = profileNode(resume);
  const skills = resume.nodes.find((node) => node.enabled && node.type === "skills");
  const sections = nonProfileNodes(resume).filter((node) => node.type !== "skills");

  return (
    <article className="grid min-h-[1123px] grid-cols-[240px_1fr] bg-white text-zinc-950">
      <aside className="bg-zinc-950 p-8 text-white">
        <h1 className="text-3xl font-semibold leading-tight">
          {profile?.content.name ?? resume.title}
        </h1>
        <p className="mt-4 text-sm leading-6 text-amber-100">
          {profile?.content.headline}
        </p>
        <p className="mt-8 whitespace-pre-line text-xs leading-6 text-zinc-300">
          {contactLine(profile).replaceAll(" | ", "\n")}
        </p>

        {skills ? (
          <section className="mt-10">
            <h2 className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-400">
              {skills.title}
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {(skills.content.skills ?? []).map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-100"
                >
                  {skill}
                </span>
              ))}
            </div>
          </section>
        ) : null}
      </aside>

      <div className="space-y-8 p-10">
        {sections.map((node) => (
          <section key={node.id}>
            <h2 className="border-b border-zinc-200 pb-2 text-lg font-semibold">
              {node.title}
            </h2>
            {nodeItems(node).length > 0 ? (
              <div className="mt-4 space-y-5 text-sm text-zinc-700">
                {nodeItems(node).map((item) => (
                  <div key={item.id}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-zinc-950">
                          {item.title || node.title}
                        </h3>
                        {item.subtitle ? <p>{item.subtitle}</p> : null}
                      </div>
                      <div className="shrink-0 text-right text-xs text-zinc-500">
                        <p>{itemDateRange(item)}</p>
                        <p>{item.location}</p>
                      </div>
                    </div>
                    <div className="mt-2 space-y-2 leading-7">
                      {splitLines(item.description).map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 space-y-2 text-sm leading-7 text-zinc-700">
                {splitLines(node.content.body).map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </article>
  );
}

export const modernTemplate: ResumeTemplate = {
  id: "modern",
  name: "Modern",
  description: "侧栏式现代布局，突出联系方式和技能。",
  paper: "a4",
  component: ModernTemplate,
};
