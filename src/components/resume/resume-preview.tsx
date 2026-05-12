import type { ResumeWithNodes } from "@/lib/resume/types";
import { getResumeTemplate } from "@/templates/resume/registry";

export function ResumePreview({ resume }: { resume: ResumeWithNodes }) {
  const Template = getResumeTemplate(resume.templateId).component;

  return (
    <div className="max-w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="origin-top-left scale-[0.42] md:scale-[0.48] lg:scale-[0.38]">
        <div className="w-[794px]">
          <Template resume={resume} />
        </div>
      </div>
      <div className="h-[470px] md:h-[540px] lg:h-[430px]" />
    </div>
  );
}
