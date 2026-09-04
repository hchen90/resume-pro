import "server-only";

import fs from "node:fs";
import path from "node:path";

import {
  ensureDir,
  getWorkspaceRoot,
  jdsDir,
  resumesDir,
} from "./paths";

const WORKSPACE_README = `# Resume Pro workspace

This folder is the local source of truth for your documents.

- \`resumes/<id>/\` — each resume (\`resume.json\` canonical, optional \`resume.md\`)
- \`resumes/<id>/ai/session.json\` — AI chat session for that resume
- \`jds/<id>/\` — each job description (\`jd.md\` + \`meta.json\`)

Changes to resumes/JDs are versioned with Git (isomorphic-git) inside this folder.
AI session files update frequently and do not alone mark the workspace dirty in the UI.

Migrate from a legacy database with: \`npm run workspace:migrate\`
`;

export function ensureWorkspaceLayout(root = getWorkspaceRoot()) {
  ensureDir(root);
  ensureDir(resumesDir(root));
  ensureDir(jdsDir(root));

  const readmePath = path.join(root, "README.md");
  if (!fs.existsSync(readmePath)) {
    fs.writeFileSync(readmePath, WORKSPACE_README, "utf8");
  }

  return root;
}
