import "server-only";

import { createDefaultResumeNodes } from "@/lib/resume/defaults";
import { defaultResumeFontPreset } from "@/lib/resume/fonts";
import { defaultLocale, type Locale } from "@/lib/i18n";
import type {
  Resume,
  ResumeSaveInput,
  ResumeWithNodes,
} from "@/lib/resume/types";

import { commitWorkspaceChanges, ensureWorkspace } from "@/lib/workspace/ensure";
import {
  createResumeDocument,
  deleteResumeDocument,
  getResumeDocument,
  listResumeDocuments,
  ResumeVersionConflictError,
  saveResumeDocument,
} from "@/lib/workspace/resume-store";

export { ResumeVersionConflictError };

export async function listResumes(): Promise<Resume[]> {
  await ensureWorkspace();
  return listResumeDocuments();
}

export async function getResume(id: string): Promise<ResumeWithNodes | null> {
  await ensureWorkspace();
  return getResumeDocument(id);
}

export async function createResume(
  title = "我的简历",
  locale: Locale = defaultLocale,
) {
  await ensureWorkspace();
  const timestamp = new Date().toISOString();
  const id = crypto.randomUUID();
  const resume: ResumeWithNodes = {
    id,
    title,
    templateId: "classic",
    fontPreset: defaultResumeFontPreset,
    createdAt: timestamp,
    updatedAt: timestamp,
    nodes: createDefaultResumeNodes(id, locale),
  };
  await createResumeDocument(resume);
  await commitWorkspaceChanges({
    hint: `Create resume ${title}`,
  });
  return resume.id;
}

export async function deleteResume(id: string) {
  await ensureWorkspace();
  await deleteResumeDocument(id);
  await commitWorkspaceChanges({
    hint: `Delete resume ${id}`,
  });
}

export async function saveResume(
  id: string,
  input: ResumeSaveInput,
  options?: {
    expectedUpdatedAt?: string;
  },
): Promise<ResumeWithNodes> {
  await ensureWorkspace();
  const saved = await saveResumeDocument(id, input, options);
  await commitWorkspaceChanges({
    hint: `Update resume ${saved.title}`,
  });
  return saved;
}
