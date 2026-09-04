import "server-only";

import path from "node:path";

import {
  defaultResumeFontPreset,
  resolveResumeFontPreset,
} from "@/lib/resume/fonts";
import type {
  Resume,
  ResumeSaveInput,
  ResumeWithNodes,
} from "@/lib/resume/types";

import {
  listSubdirNames,
  readJsonFile,
  removePathRecursive,
  resumeToMarkdown,
  writeJsonFile,
  writeTextFile,
} from "./fs-utils";
import { getWorkspaceRoot, resumeDir, resumesDir } from "./paths";

type ResumeMeta = {
  id: string;
  title: string;
  templateId: string;
  fontPreset: string;
  createdAt: string;
  updatedAt: string;
};

export class ResumeVersionConflictError extends Error {
  constructor(message = "Resume version conflict.") {
    super(message);
    this.name = "ResumeVersionConflictError";
  }
}

function resumePaths(id: string, root = getWorkspaceRoot()) {
  const dir = resumeDir(id, root);
  return {
    dir,
    json: path.join(dir, "resume.json"),
    meta: path.join(dir, "meta.json"),
    md: path.join(dir, "resume.md"),
  };
}

export async function listResumeDocuments(
  root = getWorkspaceRoot(),
): Promise<Resume[]> {
  const ids = listSubdirNames(resumesDir(root));
  const resumes: Resume[] = [];

  for (const id of ids) {
    const resume = await getResumeDocument(id, root);
    if (resume) {
      resumes.push({
        id: resume.id,
        title: resume.title,
        templateId: resume.templateId,
        fontPreset: resume.fontPreset,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt,
      });
    }
  }

  return resumes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getResumeDocument(
  id: string,
  root = getWorkspaceRoot(),
): Promise<ResumeWithNodes | null> {
  const paths = resumePaths(id, root);
  const data = readJsonFile<ResumeWithNodes>(paths.json);
  if (!data || data.id !== id) {
    return null;
  }

  return {
    ...data,
    fontPreset: resolveResumeFontPreset(data.fontPreset),
    nodes: [...data.nodes].sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

export async function writeResumeDocument(
  resume: ResumeWithNodes,
  root = getWorkspaceRoot(),
) {
  const paths = resumePaths(resume.id, root);
  const meta: ResumeMeta = {
    id: resume.id,
    title: resume.title,
    templateId: resume.templateId,
    fontPreset: resume.fontPreset,
    createdAt: resume.createdAt,
    updatedAt: resume.updatedAt,
  };

  writeJsonFile(paths.json, resume);
  writeJsonFile(paths.meta, meta);
  writeTextFile(paths.md, resumeToMarkdown(resume));
}

export async function createResumeDocument(
  resume: ResumeWithNodes,
  root = getWorkspaceRoot(),
) {
  await writeResumeDocument(resume, root);
  return resume.id;
}

export async function saveResumeDocument(
  id: string,
  input: ResumeSaveInput,
  options?: {
    expectedUpdatedAt?: string;
  },
  root = getWorkspaceRoot(),
): Promise<ResumeWithNodes> {
  const existing = await getResumeDocument(id, root);
  if (!existing) {
    throw new Error(`Resume ${id} was not found.`);
  }

  if (
    options?.expectedUpdatedAt &&
    existing.updatedAt !== options.expectedUpdatedAt
  ) {
    throw new ResumeVersionConflictError();
  }

  const timestamp = new Date().toISOString();
  const nodes = input.nodes.map((node, index) => ({
    ...node,
    resumeId: id,
    sortOrder: index,
    createdAt: existing.nodes.find((n) => n.id === node.id)?.createdAt ?? timestamp,
    updatedAt: timestamp,
  }));

  const saved: ResumeWithNodes = {
    id,
    title: input.title,
    templateId: input.templateId,
    fontPreset: input.fontPreset || defaultResumeFontPreset,
    createdAt: existing.createdAt,
    updatedAt: timestamp,
    nodes,
  };

  await writeResumeDocument(saved, root);
  return saved;
}

export async function deleteResumeDocument(
  id: string,
  root = getWorkspaceRoot(),
) {
  removePathRecursive(resumeDir(id, root));
}
