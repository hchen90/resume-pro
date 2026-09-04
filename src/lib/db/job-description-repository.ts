import "server-only";

import type { JobDescription } from "@/lib/job-descriptions/types";

import { commitWorkspaceChanges, ensureWorkspace } from "@/lib/workspace/ensure";
import {
  createJdDocument,
  getJdDocument,
  listJdDocuments,
  updateJdDocument,
} from "@/lib/workspace/jd-store";

export async function listJobDescriptions(): Promise<JobDescription[]> {
  await ensureWorkspace();
  return listJdDocuments();
}

export async function getJobDescription(id: string) {
  await ensureWorkspace();
  return getJdDocument(id);
}

export async function createJobDescription(input: {
  title: string;
  content: string;
}) {
  await ensureWorkspace();
  const id = await createJdDocument(input);
  await commitWorkspaceChanges({
    hint: `Create JD ${input.title}`,
  });
  return id;
}

export async function updateJobDescription(
  id: string,
  input: {
    title: string;
    content: string;
  },
) {
  await ensureWorkspace();
  await updateJdDocument(id, input);
  await commitWorkspaceChanges({
    hint: `Update JD ${input.title}`,
  });
}
