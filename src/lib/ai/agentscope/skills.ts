import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type AgentSkillInfo = {
  name: string;
  description: string;
  path: string;
  source: "bundled" | "configured";
};

export type AgentSkillConfiguration = {
  enabled: boolean;
  skills: string[];
  skillDirs: string[];
};

type SkillEnvironment = {
  AI_SKILLS_ENABLED?: string;
  AI_SKILLS?: string;
  AI_SKILL_DIRS?: string;
  RESUME_PRO_APP_ROOT?: string;
};

function parsePathList(value: string | undefined) {
  if (!value?.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item): item is string => typeof item === "string" && Boolean(item.trim()),
      );
    }
  } catch {
    // Fall back to a comma/newline-delimited list.
  }

  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveConfiguredPath(value: string, cwd: string) {
  const expanded =
    value === "~"
      ? os.homedir()
      : value.startsWith("~/")
        ? path.join(os.homedir(), value.slice(2))
        : value;

  return path.resolve(cwd, expanded);
}

function uniqueExistingDirectories(paths: string[]) {
  return [...new Set(paths)].filter((candidate) => {
    try {
      return fs.statSync(candidate).isDirectory();
    } catch {
      return false;
    }
  });
}

export function resolveAgentSkillConfiguration(
  env: SkillEnvironment = process.env as SkillEnvironment,
  cwd = process.cwd(),
): AgentSkillConfiguration {
  const enabled = env.AI_SKILLS_ENABLED?.trim().toLowerCase() !== "false";
  if (!enabled) {
    return { enabled: false, skills: [], skillDirs: [] };
  }

  const appRoot = env.RESUME_PRO_APP_ROOT
    ? resolveConfiguredPath(env.RESUME_PRO_APP_ROOT, cwd)
    : cwd;
  const bundledDir = path.resolve(appRoot, "skills/resume-assistant");
  const configuredSkills = parsePathList(env.AI_SKILLS).map((entry) =>
    resolveConfiguredPath(entry, cwd),
  );
  const configuredDirs = parsePathList(env.AI_SKILL_DIRS).map((entry) =>
    resolveConfiguredPath(entry, cwd),
  );

  return {
    enabled: true,
    skills: uniqueExistingDirectories(configuredSkills),
    skillDirs: uniqueExistingDirectories([bundledDir, ...configuredDirs]),
  };
}

function readFrontmatter(skillPath: string) {
  const filePath = path.join(skillPath, "SKILL.md");
  const content = fs.readFileSync(filePath, "utf8");
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fields = new Map<string, string>();

  for (const line of frontmatter?.[1]?.split(/\r?\n/) ?? []) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*?)\s*$/);
    if (match) {
      fields.set(match[1], match[2].replace(/^["']|["']$/g, ""));
    }
  }

  return {
    name: fields.get("name") || path.basename(skillPath),
    description: fields.get("description") || "No description provided",
  };
}

export function listConfiguredAgentSkills(
  config = resolveAgentSkillConfiguration(),
  cwd = process.cwd(),
): AgentSkillInfo[] {
  if (!config.enabled) {
    return [];
  }

  const bundledDir = path.resolve(
    process.env.RESUME_PRO_APP_ROOT || cwd,
    "skills/resume-assistant",
  );
  const candidates = [...config.skills];

  for (const skillDir of config.skillDirs) {
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(skillDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        candidates.push(path.join(skillDir, entry.name));
      }
    }
  }

  const skills = new Map<string, AgentSkillInfo>();
  for (const candidate of candidates) {
    if (!fs.existsSync(path.join(candidate, "SKILL.md"))) {
      continue;
    }

    try {
      const metadata = readFrontmatter(candidate);
      skills.set(metadata.name, {
        ...metadata,
        path: candidate,
        source: candidate.startsWith(`${bundledDir}${path.sep}`)
          ? "bundled"
          : "configured",
      });
    } catch {
      // AgentScope also ignores unreadable skill files.
    }
  }

  return [...skills.values()].sort((a, b) => a.name.localeCompare(b.name));
}
