import "server-only";

import fs from "node:fs";
import path from "node:path";

import type { ResumeWithNodes } from "@/lib/resume/types";

export function readJsonFile<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

export function writeJsonFile(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(`${filePath}.tmp`, filePath);
}

export function writeTextFile(filePath: string, content: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(`${filePath}.tmp`, content, "utf8");
  fs.renameSync(`${filePath}.tmp`, filePath);
}

export function removePathRecursive(target: string) {
  fs.rmSync(target, { recursive: true, force: true });
}

export function listSubdirNames(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

export function resumeToMarkdown(resume: ResumeWithNodes): string {
  const lines: string[] = [`# ${resume.title}`, ""];

  for (const node of resume.nodes) {
    if (!node.enabled) {
      continue;
    }

    lines.push(`## ${node.title}`, "");

    if (node.type === "profile") {
      const c = node.content;
      if (c.name) lines.push(`**${c.name}**`);
      if (c.headline) lines.push(c.headline);
      const contacts = [c.email, c.phone, c.location, c.website].filter(Boolean);
      if (contacts.length) lines.push(contacts.join(" · "));
      lines.push("");
      continue;
    }

    if (node.type === "summary" && node.content.body) {
      lines.push(node.content.body, "");
      continue;
    }

    if (node.type === "skills" && node.content.skills?.length) {
      lines.push(node.content.skills.map((s) => `- ${s}`).join("\n"), "");
      continue;
    }

    for (const item of node.content.items ?? []) {
      const when = [item.startDate, item.endDate].filter(Boolean).join(" – ");
      const head = [item.title, item.subtitle, when].filter(Boolean).join(" · ");
      lines.push(`### ${head || "Item"}`);
      if (item.location) lines.push(item.location);
      if (item.description) lines.push("", item.description);
      lines.push("");
    }
  }

  return `${lines.join("\n").trim()}\n`;
}
