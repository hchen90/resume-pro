import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  formatSkillsCatalogPrompt,
  listConfiguredAgentSkills,
  readSkillMarkdown,
  resolveAgentSkillConfiguration,
} from "./skills";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { force: true, recursive: true });
  }
});

describe("assistant skill configuration", () => {
  it("discovers bundled resume skills", () => {
    const configuration = resolveAgentSkillConfiguration({}, process.cwd());
    const skills = listConfiguredAgentSkills(configuration, process.cwd());

    expect(skills.map((skill) => skill.name)).toEqual(
      expect.arrayContaining([
        "achievement-bullets",
        "ats-optimization",
        "resume-review",
      ]),
    );
    expect(skills.every((skill) => skill.source === "bundled")).toBe(true);

    const catalog = formatSkillsCatalogPrompt(skills);
    expect(catalog).toContain("achievement-bullets");
    expect(readSkillMarkdown("achievement-bullets", skills)).toContain(
      "achievement-bullets",
    );
  });

  it("can disable all skills", () => {
    const configuration = resolveAgentSkillConfiguration(
      { AI_SKILLS_ENABLED: "false" },
      process.cwd(),
    );

    expect(configuration).toEqual({
      enabled: false,
      skills: [],
      skillDirs: [],
    });
  });

  it("loads custom skill directories from JSON configuration", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "resume-pro-skills-"));
    temporaryDirectories.push(root);
    const skillDir = path.join(root, "custom-review");
    fs.mkdirSync(skillDir);
    fs.writeFileSync(
      path.join(skillDir, "SKILL.md"),
      `---
name: custom-review
description: Custom review workflow
---

# Custom Review
`,
    );

    const configuration = resolveAgentSkillConfiguration(
      { AI_SKILL_DIRS: JSON.stringify([root]) },
      process.cwd(),
    );
    const skills = listConfiguredAgentSkills(configuration, process.cwd());

    expect(skills).toContainEqual(
      expect.objectContaining({
        name: "custom-review",
        description: "Custom review workflow",
        source: "configured",
      }),
    );
  });

  it("returns null for unknown skill markdown", () => {
    expect(readSkillMarkdown("does-not-exist", [])).toBeNull();
  });

  it("formats an empty skills catalog as empty string", () => {
    expect(formatSkillsCatalogPrompt([])).toBe("");
  });

  it("parses comma-delimited skill dirs and expands ~ paths", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "resume-pro-skills-"));
    temporaryDirectories.push(root);
    const skillDir = path.join(root, "tilde-skill");
    fs.mkdirSync(skillDir);
    fs.writeFileSync(
      path.join(skillDir, "SKILL.md"),
      `---
name: tilde-skill
description: From tilde path
---

# Body
`,
    );

    const configuration = resolveAgentSkillConfiguration(
      { AI_SKILL_DIRS: root },
      process.cwd(),
    );
    expect(configuration.skillDirs).toContain(root);

    const homeSkillRoot = fs.mkdtempSync(
      path.join(os.homedir(), "resume-pro-skills-home-"),
    );
    temporaryDirectories.push(homeSkillRoot);
    const homeSkill = path.join(homeSkillRoot, "home-skill");
    fs.mkdirSync(homeSkill);
    fs.writeFileSync(
      path.join(homeSkill, "SKILL.md"),
      `---
name: home-skill
description: Home skill
---

# Home
`,
    );

    const relativeToHome = `~/${path.relative(os.homedir(), homeSkillRoot)}`;
    const homeConfig = resolveAgentSkillConfiguration(
      { AI_SKILL_DIRS: relativeToHome },
      process.cwd(),
    );
    expect(homeConfig.skillDirs.some((dir) => dir.includes("resume-pro-skills-home-"))).toBe(
      true,
    );
  });

  it("returns null when skill markdown cannot be read", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "resume-pro-skills-"));
    temporaryDirectories.push(root);
    const skillDir = path.join(root, "broken-skill");
    fs.mkdirSync(skillDir);
    fs.writeFileSync(
      path.join(skillDir, "SKILL.md"),
      `---
name: broken-skill
description: Will be unreadable
---

# Body
`,
    );

    const skills = [
      {
        name: "broken-skill",
        description: "Will be unreadable",
        path: skillDir,
        source: "configured" as const,
      },
    ];
    fs.rmSync(path.join(skillDir, "SKILL.md"));
    expect(readSkillMarkdown("broken-skill", skills)).toBeNull();
  });

  it("ignores skill directories without SKILL.md and unreadable metadata", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "resume-pro-skills-"));
    temporaryDirectories.push(root);
    const emptyDir = path.join(root, "empty-skill");
    fs.mkdirSync(emptyDir);
    const badDir = path.join(root, "bad-skill");
    fs.mkdirSync(badDir);
    fs.writeFileSync(path.join(badDir, "SKILL.md"), "not-frontmatter");

    const configuration = resolveAgentSkillConfiguration(
      { AI_SKILL_DIRS: JSON.stringify([root]) },
      process.cwd(),
    );
    const skills = listConfiguredAgentSkills(configuration, process.cwd());
    expect(skills.find((skill) => skill.name === "empty-skill")).toBeUndefined();
    expect(skills.find((skill) => skill.path === badDir)?.name).toBe("bad-skill");
  });
});
