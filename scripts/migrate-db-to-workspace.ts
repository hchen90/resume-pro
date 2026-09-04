/**
 * One-click migration: SQLite/Postgres resumes, JDs, and AI sessions → workspace.
 *
 * Usage:
 *   npm run workspace:migrate
 *   npm run workspace:migrate -- --force
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadEnv } from "dotenv";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");

loadEnv({ path: path.join(projectRoot, ".env") });
loadEnv({ path: path.join(projectRoot, ".env.local"), override: true });

async function main() {
  const force = process.argv.includes("--force");
  const help = process.argv.includes("--help") || process.argv.includes("-h");

  if (help) {
    console.log(`Migrate database documents into the workspace folder.

Usage:
  npm run workspace:migrate
  npm run workspace:migrate -- --force

Options:
  --force   Re-run even if .resume-pro-migrated exists (overwrite from DB)
  --help    Show this help

Env:
  WORKSPACE_PATH     Workspace root (default ./data/workspace)
  DATABASE_PROVIDER  sqlite (default) or postgres
  SQLITE_PATH / DATABASE_URL
`);
    return;
  }

  const { migrateDatabaseDocumentsToWorkspace } = await import(
    "../src/lib/workspace/migrate"
  );
  const { getWorkspaceRoot } = await import("../src/lib/workspace/paths");
  const { resetWorkspaceEnsureCache } = await import(
    "../src/lib/workspace/ensure"
  );

  resetWorkspaceEnsureCache();

  const root = getWorkspaceRoot();
  console.log(`Workspace: ${root}`);
  console.log(`Force: ${force ? "yes" : "no"}`);

  const result = await migrateDatabaseDocumentsToWorkspace({ force, root });

  if (result.skipped) {
    console.log(
      "Already migrated (marker present). Re-run with --force to overwrite from the database.",
    );
    return;
  }

  console.log(
    `Migrated: ${result.resumeCount} resumes, ${result.jdCount} JDs, ${result.sessionCount} AI sessions`,
  );
  if (result.commitSha) {
    console.log(`Commit: ${result.commitSha}`);
  }
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exitCode = 1;
});
