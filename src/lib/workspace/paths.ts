import "server-only";

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const DEFAULT_RELATIVE = path.join("data", "workspace");

export function getWorkspaceRoot(override?: string): string {
  const configured =
    override ??
    process.env.WORKSPACE_PATH?.trim() ??
    (process.env.APP_TARGET === "electron" || process.env.ELECTRON === "1"
      ? path.join(os.homedir(), ".resume-pro", "workspace")
      : DEFAULT_RELATIVE);

  return path.resolve(configured);
}

export function resumesDir(root = getWorkspaceRoot()) {
  return path.join(root, "resumes");
}

export function jdsDir(root = getWorkspaceRoot()) {
  return path.join(root, "jds");
}

export function resumeDir(resumeId: string, root = getWorkspaceRoot()) {
  return path.join(resumesDir(root), resumeId);
}

export function jdDir(jdId: string, root = getWorkspaceRoot()) {
  return path.join(jdsDir(root), jdId);
}

export function migrationMarkerPath(root = getWorkspaceRoot()) {
  return path.join(root, ".resume-pro-migrated");
}

export function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}
