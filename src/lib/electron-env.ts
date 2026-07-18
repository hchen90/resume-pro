import "server-only";

import { parse } from "dotenv";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type ElectronAiConfig = {
  aiApiUrl: string;
  aiApiKey: string;
  aiApiModel: string;
  aiSummaryModel: string;
};

const aiEnvKeys = {
  aiApiUrl: "AI_API_URL",
  aiApiKey: "AI_API_KEY",
  aiApiModel: "AI_API_MODEL",
  aiSummaryModel: "AI_SUMMARY_MODEL",
} as const;

export function isElectronRuntime() {
  return process.env.APP_TARGET === "electron" || process.env.ELECTRON === "1";
}

export function readElectronAiConfig(): ElectronAiConfig {
  const env = ensureElectronEnvFile();
  const values = parse(fs.readFileSync(env, "utf8"));

  return {
    aiApiUrl: values.AI_API_URL ?? process.env.AI_API_URL ?? "https://api.openai.com/v1",
    aiApiKey: values.AI_API_KEY ?? process.env.AI_API_KEY ?? "",
    aiApiModel: values.AI_API_MODEL ?? process.env.AI_API_MODEL ?? "gpt-4o-mini",
    aiSummaryModel:
      values.AI_SUMMARY_MODEL ?? process.env.AI_SUMMARY_MODEL ?? "",
  };
}

export function updateElectronAiConfig(config: ElectronAiConfig) {
  const envPath = ensureElectronEnvFile();
  const current = fs.readFileSync(envPath, "utf8");
  const updated = upsertEnvValues(current, {
    [aiEnvKeys.aiApiUrl]: config.aiApiUrl,
    [aiEnvKeys.aiApiKey]: config.aiApiKey,
    [aiEnvKeys.aiApiModel]: config.aiApiModel,
    [aiEnvKeys.aiSummaryModel]: config.aiSummaryModel,
  });

  fs.writeFileSync(envPath, updated, { mode: 0o600 });
}

function ensureElectronEnvFile() {
  const configDir = path.join(os.homedir(), ".resume-pro");
  const envPath = path.join(configDir, ".env");

  fs.mkdirSync(configDir, { recursive: true });

  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, defaultElectronEnv(configDir), { mode: 0o600 });
  }

  return envPath;
}

function defaultElectronEnv(configDir: string) {
  return `# Resume Pro Electron runtime configuration

# Database
DATABASE_PROVIDER=sqlite
SQLITE_PATH=${path.join(configDir, "resume-pro.sqlite")}

# To use Postgres instead:
# DATABASE_PROVIDER=postgres
# DATABASE_URL=postgres://user:password@localhost:5432/resume_pro

# AI - OpenAI-compatible configuration
AI_API_URL=https://api.openai.com/v1
AI_API_KEY=
AI_API_MODEL=gpt-4o-mini
AI_TEMPERATURE=0.3
AI_SUMMARY_MODEL=

# AgentScope skills
AI_SKILLS_ENABLED=true
AI_SKILL_DIRS=
AI_SKILLS=

# AI chat history
AI_HISTORY_MAX_MESSAGES=50
AI_HISTORY_SUMMARIZE_ABOVE=30
AI_HISTORY_CONTEXT_MESSAGES=20

# Runtime target
APP_TARGET=electron
`;
}

function upsertEnvValues(content: string, values: Record<string, string>) {
  const remaining = new Set(Object.keys(values));
  const lines = content.split(/\r?\n/).map((line) => {
    const match = line.match(/^([A-Z0-9_]+)=/);

    if (!match || !remaining.has(match[1])) {
      return line;
    }

    const key = match[1];
    remaining.delete(key);
    return `${key}=${serializeEnvValue(values[key] ?? "")}`;
  });

  if (remaining.size > 0) {
    if (lines.at(-1) !== "") {
      lines.push("");
    }

    for (const key of remaining) {
      lines.push(`${key}=${serializeEnvValue(values[key] ?? "")}`);
    }
  }

  return lines.join("\n");
}

function serializeEnvValue(value: string) {
  if (!/[#\s"'\\]/.test(value)) {
    return value;
  }

  return JSON.stringify(value);
}
