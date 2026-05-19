import {
  contactLine,
  itemDateRange,
  nodeItems,
  nonProfileNodes,
  profileNode,
} from "@/lib/resume/format";

import { MarkdownContent } from "./markdown-content";
import type { ResumeTemplate, ResumeTemplateProps } from "./types";

const labelColumnClass = "w-[168px] shrink-0 pr-8";

function AcademicTemplate({ resume }: ResumeTemplateProps) {
  const profile = profileNode(resume);

  return (
    <article className="min-h-[1123px] bg-white p-12 font-serif text-zinc-950">
      <header className="grid grid-cols-[72px_1fr] gap-10 border-b border-zinc-200 pb-8">
        <div className="flex items-start justify-center pt-1">
          <span
            className="select-none text-[5.5rem] font-light leading-none text-zinc-300"
            aria-hidden
          >
            &
          </span>
        </div>
        <div>
          <h1 className="text-[2rem] font-bold uppercase leading-tight tracking-[0.06em]">
            {profile?.content.name ?? resume.title}
          </h1>
          {profile?.content.headline ? (
            <p className="mt-2 text-base text-zinc-700">{profile.content.headline}</p>
          ) : null}
          <p className="mt-3 text-sm text-zinc-600">{contactLine(profile)}</p>
        </div>
      </header>

      <div className="mt-9 space-y-9">
        {nonProfileNodes(resume).map((node) => {
          const items = nodeItems(node);

          if (node.type === "skills") {
            return (
              <section
                key={node.id}
                className="flex gap-0 text-sm leading-7 text-zinc-800"
              >
                <h2
                  className={`${labelColumnClass} text-sm font-normal text-zinc-700`}
                >
                  {node.title}
                </h2>
                <p className="min-w-0 flex-1">
                  {(node.content.skills ?? []).join(" · ")}
                </p>
              </section>
            );
          }

          if (items.length > 0) {
            return (
              <section key={node.id} className="space-y-5">
                {items.map((item, index) => (
                  <div key={item.id} className="flex gap-0 text-sm">
                    <aside className={labelColumnClass}>
                      {index === 0 ? (
                        <h2 className="mb-4 text-left text-sm font-normal text-zinc-700">
                          {node.title}
                        </h2>
                      ) : null}
                      <div className="text-xs leading-5 text-zinc-500">
                        <p>{itemDateRange(item)}</p>
                        {item.location ? (
                          <p className="mt-1">{item.location}</p>
                        ) : null}
                      </div>
                    </aside>
                    <div className="min-w-0 flex-1 text-zinc-800">
                      <h3 className="font-bold text-zinc-950">
                        {item.title || node.title}
                      </h3>
                      {item.subtitle ? (
                        <p className="mt-0.5 text-zinc-700">{item.subtitle}</p>
                      ) : null}
                      <MarkdownContent
                        value={item.description}
                        className="mt-2 space-y-1.5 leading-7"
                      />
                    </div>
                  </div>
                ))}
              </section>
            );
          }

          return (
            <section
              key={node.id}
              className="flex gap-0 text-sm leading-7 text-zinc-800"
            >
              <h2
                className={`${labelColumnClass} text-sm font-normal text-zinc-700`}
              >
                {node.title}
              </h2>
              <MarkdownContent
                value={node.content.body}
                className="min-w-0 flex-1 space-y-1.5"
              />
            </section>
          );
        })}
      </div>
    </article>
  );
}

export const academicTemplate: ResumeTemplate = {
  id: "academic",
  name: "Academic",
  description:
    "左栏标题与日期、右栏正文的经典学术/欧式 CV 版式，衬线字体、黑白极简。",
  paper: "a4",
  component: AcademicTemplate,
};
