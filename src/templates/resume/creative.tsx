import {
  contactLine,
  itemDateRange,
  nodeItems,
  nonProfileNodes,
  profileNode,
} from "@/lib/resume/format";

import { MarkdownContent } from "./markdown-content";
import type { ResumeTemplate, ResumeTemplateProps } from "./types";

function CreativeTemplate({ resume }: ResumeTemplateProps) {
  const profile = profileNode(resume);
  const skills = resume.nodes.find((node) => node.enabled && node.type === "skills");
  const sections = nonProfileNodes(resume).filter((node) => node.type !== "skills");

  return (
    <article className="min-h-[1123px] bg-[#f6f8fb] p-10 text-zinc-950">
      <header className="rounded-[28px] bg-gradient-to-br from-indigo-600 to-cyan-500 p-8 text-white">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-white/75">
          {profile?.content.headline}
        </p>
        <h1 className="mt-4 text-5xl font-black tracking-tight">
          {profile?.content.name ?? resume.title}
        </h1>
        <p className="mt-6 max-w-3xl text-sm leading-7 text-white/90">
          {contactLine(profile)}
        </p>
      </header>

      <div className="mt-8 grid grid-cols-[1fr_220px] gap-6">
        <div className="space-y-5">
          {sections.map((node) => (
            <section
              key={node.id}
              className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200"
            >
              <h2 className="text-sm font-black uppercase tracking-[0.24em] text-indigo-600">
                {node.title}
              </h2>
              {nodeItems(node).length > 0 ? (
                <div className="mt-5 space-y-5 text-sm text-zinc-700">
                  {nodeItems(node).map((item) => (
                    <div key={item.id}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-base font-bold text-zinc-950">
                            {item.title || node.title}
                          </h3>
                          {item.subtitle ? <p>{item.subtitle}</p> : null}
                        </div>
                        <div className="shrink-0 rounded-full bg-indigo-50 px-3 py-1 text-right text-xs font-medium text-indigo-700">
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
                  className="mt-4 space-y-2 text-sm leading-7 text-zinc-700"
                />
              )}
            </section>
          ))}
        </div>

        {skills ? (
          <aside className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
            <h2 className="text-sm font-black uppercase tracking-[0.24em] text-indigo-600">
              {skills.title}
            </h2>
            <div className="mt-4 space-y-2">
              {(skills.content.skills ?? []).map((skill) => (
                <p
                  key={skill}
                  className="border-b border-zinc-200 pb-2 text-sm font-medium text-zinc-700 last:border-b-0"
                >
                  {skill}
                </p>
              ))}
            </div>
          </aside>
        ) : null}
      </div>
    </article>
  );
}

export const creativeTemplate: ResumeTemplate = {
  id: "creative",
  name: "Creative",
  description: "强调色和卡片式布局，适合作品集、设计、增长等更有展示感的岗位。",
  paper: "a4",
  component: CreativeTemplate,
};
