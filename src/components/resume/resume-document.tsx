import type { ReactNode } from "react";

import {
  resolveResumeFontPreset,
  type ResumeFontPreset,
} from "@/lib/resume/fonts";

export function ResumeDocument({
  fontPreset,
  className,
  children,
}: {
  fontPreset?: string | null;
  className?: string;
  children: ReactNode;
}) {
  const resolved: ResumeFontPreset = resolveResumeFontPreset(fontPreset);

  return (
    <div
      className={
        className
          ? `resume-document w-full ${className}`
          : "resume-document w-full"
      }
      data-resume-font={resolved}
    >
      {children}
    </div>
  );
}
