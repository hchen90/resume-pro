import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { Toolkit } from "@agentscope-ai/agentscope/tool";
import { afterEach, describe, expect, it } from "vitest";

import {
  listConfiguredAgentSkills,
  resolveAgentSkillConfiguration,
} from "./skills";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { force: true, recursive: true });
  }
});

describe("AgentScope skill configuration", () => {
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

    const toolkit = new Toolkit({
      skillDirs: configuration.skillDirs,
      builtInSkillTool: true,
    });
    expect(toolkit.getSkillsPrompt()).toContain("achievement-bullets");
    expect(toolkit.tools.some((tool) => tool.name === "Skill")).toBe(true);
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
});
