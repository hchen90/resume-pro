import "server-only";

import { buildCommitMessage } from "./commit-message";
import {
  commitWorkspace,
  ensureWorkspaceGit,
  getWorkspaceGitStatus,
  type WorkspaceGitStatus,
} from "./git";
import { ensureWorkspaceLayout } from "./layout";
import { migrateDatabaseDocumentsToWorkspace } from "./migrate";
import { getWorkspaceRoot } from "./paths";

const ensureByRoot = new Map<string, Promise<string>>();

export async function ensureWorkspace(root = getWorkspaceRoot()): Promise<string> {
  let promise = ensureByRoot.get(root);
  if (!promise) {
    promise = (async () => {
      ensureWorkspaceLayout(root);
      await ensureWorkspaceGit(root);
      await migrateDatabaseDocumentsToWorkspace({ root });
      return root;
    })().catch((error) => {
      ensureByRoot.delete(root);
      throw error;
    });
    ensureByRoot.set(root, promise);
  }
  return promise;
}

/** Test helper: reset memoized ensure for a fresh workspace root. */
export function resetWorkspaceEnsureCache() {
  ensureByRoot.clear();
}

export async function commitWorkspaceChanges(options?: {
  hint?: string;
  root?: string;
  useAi?: boolean;
}): Promise<{ sha: string | null; status: WorkspaceGitStatus }> {
  const root = options?.root ?? getWorkspaceRoot();
  await ensureWorkspace(root);
  const message = await buildCommitMessage({
    hint: options?.hint,
    root,
    useAi: options?.useAi,
  });
  const sha = await commitWorkspace(message, root);
  const status = await getWorkspaceGitStatus(root);
  return { sha, status };
}

export async function readWorkspaceStatus(
  root = getWorkspaceRoot(),
): Promise<WorkspaceGitStatus> {
  await ensureWorkspace(root);
  return getWorkspaceGitStatus(root);
}
