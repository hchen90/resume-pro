import "server-only";

import fs from "node:fs";
import path from "node:path";

import type { JobDescription } from "@/lib/job-descriptions/types";

import {
  listSubdirNames,
  readJsonFile,
  removePathRecursive,
  writeJsonFile,
  writeTextFile,
} from "./fs-utils";
import { getWorkspaceRoot, jdDir, jdsDir } from "./paths";

type JdMeta = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

function jdPaths(id: string, root = getWorkspaceRoot()) {
  const dir = jdDir(id, root);
  return {
    dir,
    md: path.join(dir, "jd.md"),
    meta: path.join(dir, "meta.json"),
  };
}

export async function listJdDocuments(
  root = getWorkspaceRoot(),
): Promise<JobDescription[]> {
  const ids = listSubdirNames(jdsDir(root));
  const items: JobDescription[] = [];

  for (const id of ids) {
    const jd = await getJdDocument(id, root);
    if (jd) {
      items.push(jd);
    }
  }

  return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getJdDocument(
  id: string,
  root = getWorkspaceRoot(),
): Promise<JobDescription | null> {
  const paths = jdPaths(id, root);
  const meta = readJsonFile<JdMeta>(paths.meta);
  if (!meta || meta.id !== id) {
    return null;
  }

  if (!fs.existsSync(paths.md)) {
    return null;
  }

  const content = fs.readFileSync(paths.md, "utf8");
  return {
    id: meta.id,
    title: meta.title,
    content,
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt,
  };
}

export async function writeJdDocument(
  jd: JobDescription,
  root = getWorkspaceRoot(),
) {
  const paths = jdPaths(jd.id, root);
  const meta: JdMeta = {
    id: jd.id,
    title: jd.title,
    createdAt: jd.createdAt,
    updatedAt: jd.updatedAt,
  };
  writeJsonFile(paths.meta, meta);
  writeTextFile(paths.md, jd.content.endsWith("\n") ? jd.content : `${jd.content}\n`);
}

export async function createJdDocument(
  input: { title: string; content: string },
  root = getWorkspaceRoot(),
) {
  const timestamp = new Date().toISOString();
  const jd: JobDescription = {
    id: crypto.randomUUID(),
    title: input.title,
    content: input.content,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await writeJdDocument(jd, root);
  return jd.id;
}

export async function updateJdDocument(
  id: string,
  input: { title: string; content: string },
  root = getWorkspaceRoot(),
) {
  const existing = await getJdDocument(id, root);
  if (!existing) {
    throw new Error(`Job description ${id} was not found.`);
  }

  const jd: JobDescription = {
    ...existing,
    title: input.title,
    content: input.content,
    updatedAt: new Date().toISOString(),
  };
  await writeJdDocument(jd, root);
  return jd;
}

export async function deleteJdDocument(id: string, root = getWorkspaceRoot()) {
  removePathRecursive(jdDir(id, root));
}
