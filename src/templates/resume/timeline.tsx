import {
  contactLine,
  itemDateRange,
  nodeItems,
  nonProfileNodes,
  profileNode,
  splitLines,
} from "@/lib/resume/format";

import type { ResumeTemplate, ResumeTemplateProps } from "./types";

function TimelineTemplate({ resume }: ResumeTemplateProps) {
  const profile = profileNode(resume);

  return (
    <article className="min-h-[1123px] bg-white text-slate-950">
      <header className="bg-slate-900 px-12 py-10 text-white">
        <div className="flex items-end justify-between gap-8">
          <div>
            <h1 className="text-5xl font-bold tracking-tight">
              {profile?.content.name ?? resume.title}
            </h1>
            {profile?.content.headline ? (
              <p className="mt-3 text-lg text-slate-200">
                {profile.content.headline}
              </p>
            ) : null}
          </div>
          <p className="max-w-[300px] text-right text-xs leading-6 text-slate-300">
            {contactLine(profile)}
          </p>
        </div>
      </header>

      <div className="space-y-8 p-12">
        {nonProfileNodes(resume).map((node) => (
          <section key={node.id}>
            <h2 className="mb-5 text-sm font-bold uppercase tracking-[0.28em] text-slate-500">
              {node.title}
            </h2>
            {node.type === "skills" ? (
              <div className="grid grid-cols-3 gap-2 text-sm text-slate-700">
                {(node.content.skills ?? []).map((skill) => (
                  <span
                    key={skill}
                    className="rounded-md bg-slate-100 px-3 py-2 font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : nodeItems(node).length > 0 ? (
              <div className="space-y-6">
                {nodeItems(node).map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[150px_1fr] gap-6 text-sm"
                  >
                    <div className="text-right text-xs uppercase tracking-[0.12em] text-slate-500">
                      <p>{itemDateRange(item)}</p>
                      <p>{item.location}</p>
                    </div>
                    <div className="relative border-l-2 border-slate-200 pl-6">
                      <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-slate-900 ring-4 ring-white" />
                      <h3 className="font-semibold text-slate-950">
                        {item.title || node.title}
                      </h3>
                      {item.subtitle ? (
                        <p className="mt-1 text-slate-600">{item.subtitle}</p>
                      ) : null}
                      <div className="mt-3 space-y-2 leading-7 text-slate-700">
                        {splitLines(item.description).map((line) => (
                          <p key={line}>{line}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2 text-sm leading-7 text-slate-700">
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

export const timelineTemplate: ResumeTemplate = {
  id: "timeline",
  name: "Timeline",
  description: "用时间线突出经历顺序，适合经历跨度清晰的候选人。",
  paper: "a4",
  component: TimelineTemplate,
};
