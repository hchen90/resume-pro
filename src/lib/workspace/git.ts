import "server-only";

import fs from "node:fs";
import path from "node:path";

import git from "isomorphic-git";

import { getWorkspaceRoot } from "./paths";

const AUTHOR = {
  name: "Resume Pro",
  email: "resume-pro@local",
};

export type WorkspaceGitStatus = {
  clean: boolean;
  headSha: string | null;
  shortHash: string | null;
  fileCount: number;
};

async function ensureGitDir(dir: string) {
  const gitDir = path.join(dir, ".git");
  if (!fs.existsSync(gitDir)) {
    await git.init({ fs, dir });
  }
}

export async function ensureWorkspaceGit(root = getWorkspaceRoot()) {
  await ensureGitDir(root);
  return root;
}

function isDirtyEntry(head: number, workdir: number, stage: number) {
  // Clean tracked file: [1, 1, 1]
  return !(head === 1 && workdir === 1 && stage === 1);
}

/** AI session files update often; ignore them for dirty/clean save UI. */
export function isAiSessionPath(filepath: string) {
  return (
    filepath === "ai/session.json" ||
    filepath.endsWith("/ai/session.json") ||
    /(^|\/)ai\//.test(filepath)
  );
}

export async function getWorkspaceGitStatus(
  root = getWorkspaceRoot(),
): Promise<WorkspaceGitStatus> {
  await ensureGitDir(root);

  let headSha: string | null = null;
  try {
    headSha = await git.resolveRef({ fs, dir: root, ref: "HEAD" });
  } catch {
    headSha = null;
  }

  const matrix = await git.statusMatrix({ fs, dir: root });
  const dirty = matrix.filter(([filepath, head, workdir, stage]) => {
    if (isAiSessionPath(filepath)) {
      return false;
    }
    return isDirtyEntry(head, workdir, stage);
  });

  return {
    clean: headSha != null && dirty.length === 0,
    headSha,
    shortHash: headSha ? headSha.slice(0, 7) : null,
    fileCount: dirty.length,
  };
}

export async function stageAllChanges(root = getWorkspaceRoot()) {
  await ensureGitDir(root);
  const matrix = await git.statusMatrix({ fs, dir: root });

  for (const [filepath, head, workdir] of matrix) {
    if (workdir === 0) {
      if (head === 1) {
        await git.remove({ fs, dir: root, filepath });
      }
      continue;
    }

    // New or modified (workdir 2) or present
    await git.add({ fs, dir: root, filepath });
  }
}

/** True when any path (including `ai/`) differs from HEAD. */
export async function hasWorkspaceWorktreeChanges(
  root = getWorkspaceRoot(),
): Promise<boolean> {
  await ensureGitDir(root);
  const matrix = await git.statusMatrix({ fs, dir: root });
  return matrix.some(([, head, workdir, stage]) =>
    isDirtyEntry(head, workdir, stage),
  );
}

export async function commitWorkspace(
  message: string,
  root = getWorkspaceRoot(),
): Promise<string | null> {
  await ensureGitDir(root);
  await stageAllChanges(root);

  let headSha: string | null = null;
  try {
    headSha = await git.resolveRef({ fs, dir: root, ref: "HEAD" });
  } catch {
    headSha = null;
  }

  // UI dirty status ignores `ai/`, but commits must still pick up AI artifacts /
  // session writes when they are the only pending changes.
  if (!(await hasWorkspaceWorktreeChanges(root)) && headSha) {
    return headSha;
  }

  try {
    return await git.commit({
      fs,
      dir: root,
      message,
      author: AUTHOR,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      /No changes|nothing to commit|empty/i.test(error.message)
    ) {
      return headSha;
    }
    if (!(await hasWorkspaceWorktreeChanges(root))) {
      try {
        return await git.resolveRef({ fs, dir: root, ref: "HEAD" });
      } catch {
        return headSha;
      }
    }
    throw error;
  }
}

export async function getWorkspaceDiffSummary(
  root = getWorkspaceRoot(),
  maxChars = 6000,
): Promise<string> {
  await ensureGitDir(root);
  const matrix = await git.statusMatrix({ fs, dir: root });
  const lines: string[] = [];

  for (const [filepath, head, workdir] of matrix) {
    if (head === 1 && workdir === 1) {
      continue;
    }
    if (workdir === 0) {
      lines.push(`deleted: ${filepath}`);
      continue;
    }
    if (head === 0) {
      lines.push(`added: ${filepath}`);
      continue;
    }
    lines.push(`modified: ${filepath}`);
  }

  if (lines.length === 0) {
    return "(no changes)";
  }

  const summary = lines.join("\n");
  return summary.length > maxChars
    ? `${summary.slice(0, maxChars)}\n…`
    : summary;
}
