import fs from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { fallbackCommitMessage } from "@/lib/workspace/commit-message";
import { resetWorkspaceEnsureCache } from "@/lib/workspace/ensure";
import {
  commitWorkspace,
  ensureWorkspaceGit,
  getWorkspaceGitStatus,
  isAiSessionPath,
} from "@/lib/workspace/git";
import { ensureWorkspaceLayout } from "@/lib/workspace/layout";
import {
  createJdDocument,
  getJdDocument,
  listJdDocuments,
  updateJdDocument,
} from "@/lib/workspace/jd-store";
import { getWorkspaceRoot } from "@/lib/workspace/paths";
import {
  createResumeDocument,
  getResumeDocument,
  listResumeDocuments,
  saveResumeDocument,
} from "@/lib/workspace/resume-store";
import {
  getAiSessionDocument,
  saveAiSessionDocument,
} from "@/lib/workspace/ai-session-store";
import { createDefaultAiChatSession } from "@/lib/ai/chat-session";
import type { ResumeWithNodes } from "@/lib/resume/types";

function makeTempRoot(prefix: string) {
  const base = path.join(process.cwd(), ".tmp-test");
  fs.mkdirSync(base, { recursive: true });
  return fs.mkdtempSync(path.join(base, prefix));
}

function makeResume(id = "resume-1"): ResumeWithNodes {
  const timestamp = "2026-01-01T00:00:00.000Z";
  return {
    id,
    title: "Test Resume",
    templateId: "classic",
    fontPreset: "sans",
    createdAt: timestamp,
    updatedAt: timestamp,
    nodes: [
      {
        id: "node-1",
        resumeId: id,
        type: "profile",
        title: "Profile",
        content: { name: "Ada" },
        sortOrder: 0,
        enabled: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
  };
}

describe("workspace layout and documents", () => {
  let root: string;
  let previousWorkspace: string | undefined;

  beforeEach(() => {
    root = makeTempRoot("ws-");
    previousWorkspace = process.env.WORKSPACE_PATH;
    process.env.WORKSPACE_PATH = root;
    resetWorkspaceEnsureCache();
  });

  afterEach(() => {
    if (previousWorkspace === undefined) {
      delete process.env.WORKSPACE_PATH;
    } else {
      process.env.WORKSPACE_PATH = previousWorkspace;
    }
    resetWorkspaceEnsureCache();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("bootstraps resumes/ and jds/ with README", () => {
    ensureWorkspaceLayout(root);
    expect(fs.existsSync(path.join(root, "resumes"))).toBe(true);
    expect(fs.existsSync(path.join(root, "jds"))).toBe(true);
    expect(fs.existsSync(path.join(root, "README.md"))).toBe(true);
    expect(getWorkspaceRoot()).toBe(path.resolve(root));
  });

  it("round-trips resume json documents", async () => {
    ensureWorkspaceLayout(root);
    const resume = makeResume();
    await createResumeDocument(resume, root);
    const loaded = await getResumeDocument(resume.id, root);
    expect(loaded).toEqual(resume);
    expect(fs.existsSync(path.join(root, "resumes", resume.id, "resume.md"))).toBe(
      true,
    );

    const saved = await saveResumeDocument(
      resume.id,
      {
        title: "Updated",
        templateId: "classic",
        fontPreset: resume.fontPreset,
        nodes: resume.nodes.map(({ id, type, title, content, sortOrder, enabled }) => ({
          id,
          type,
          title,
          content,
          sortOrder,
          enabled,
        })),
      },
      undefined,
      root,
    );
    expect(saved.title).toBe("Updated");
    expect((await listResumeDocuments(root))[0]?.title).toBe("Updated");
  });

  it("round-trips JD markdown documents", async () => {
    ensureWorkspaceLayout(root);
    const id = await createJdDocument(
      { title: "FE", content: "Build UI\n" },
      root,
    );
    const loaded = await getJdDocument(id, root);
    expect(loaded?.title).toBe("FE");
    expect(loaded?.content).toContain("Build UI");
    await updateJdDocument(id, { title: "FE2", content: "Ship UI\n" }, root);
    expect((await listJdDocuments(root))[0]?.title).toBe("FE2");
  });

  it("round-trips AI session documents", async () => {
    ensureWorkspaceLayout(root);
    const resume = makeResume();
    await createResumeDocument(resume, root);
    const intro = "Hello";
    const session = createDefaultAiChatSession(intro);
    session.messages.push({ role: "user", content: "Improve summary" });
    const saved = await saveAiSessionDocument(
      resume.id,
      session,
      intro,
      undefined,
      root,
    );
    expect(saved.sessionVersion).toBe(1);
    const loaded = await getAiSessionDocument(resume.id, intro, root);
    expect(loaded?.messages.at(-1)?.content).toBe("Improve summary");
    expect(isAiSessionPath(`resumes/${resume.id}/ai/session.json`)).toBe(true);
  });
});

describe("workspace isomorphic-git", () => {
  let root: string;

  beforeEach(() => {
    root = makeTempRoot("git-");
    ensureWorkspaceLayout(root);
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("inits and commits workspace files", async () => {
    await ensureWorkspaceGit(root);
    fs.writeFileSync(path.join(root, "resumes", "note.txt"), "hi\n");
    const sha = await commitWorkspace("Add note", root);
    expect(sha).toBeTruthy();
    const status = await getWorkspaceGitStatus(root);
    expect(status.clean).toBe(true);
    expect(status.shortHash).toBe(sha!.slice(0, 7));

    fs.writeFileSync(path.join(root, "resumes", "note.txt"), "bye\n");
    const dirty = await getWorkspaceGitStatus(root);
    expect(dirty.clean).toBe(false);
  });

  it("ignores ai/session.json when reporting dirty status", async () => {
    await ensureWorkspaceGit(root);
    const sha = await commitWorkspace("Init", root);
    expect(sha).toBeTruthy();

    fs.mkdirSync(path.join(root, "resumes", "r1", "ai"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "resumes", "r1", "ai", "session.json"),
      '{"sessionVersion":1}\n',
    );
    const status = await getWorkspaceGitStatus(root);
    expect(status.clean).toBe(true);
  });
});

describe("commit message fallback", () => {
  it("uses hint when AI is disabled", () => {
    expect(fallbackCommitMessage("Update resume X")).toBe("Update resume X");
    expect(fallbackCommitMessage()).toBe("Update workspace documents");
  });
});
