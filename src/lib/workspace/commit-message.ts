import "server-only";

import { ChatOpenAI } from "@langchain/openai";

import { getWorkspaceDiffSummary } from "./git";
import { getWorkspaceRoot } from "./paths";

export function fallbackCommitMessage(hint?: string) {
  const trimmed = hint?.trim();
  if (trimmed) {
    return trimmed.slice(0, 72);
  }
  return "Update workspace documents";
}

export async function buildCommitMessage(options?: {
  hint?: string;
  root?: string;
  useAi?: boolean;
}): Promise<string> {
  const root = options?.root ?? getWorkspaceRoot();
  const fallback = fallbackCommitMessage(options?.hint);

  if (options?.useAi === false) {
    return fallback;
  }

  const apiKey = process.env.AI_API_KEY?.trim();
  if (!apiKey) {
    return fallback;
  }

  try {
    const diff = await getWorkspaceDiffSummary(root);
    const model = new ChatOpenAI({
      apiKey,
      model: process.env.AI_API_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0.2,
      configuration: {
        baseURL: process.env.AI_API_URL?.trim() || undefined,
      },
      timeout: 8_000,
    });

    const response = await model.invoke([
      {
        role: "system",
        content:
          "Write a single short git commit message (max 72 chars) for a resume workspace. No quotes or explanation.",
      },
      {
        role: "user",
        content: `Hint: ${fallback}\n\nChanged files:\n${diff}`,
      },
    ]);

    const text =
      typeof response.content === "string"
        ? response.content
        : Array.isArray(response.content)
          ? response.content
              .map((part) => ("text" in part ? part.text : ""))
              .join("")
          : "";

    const message = text.trim().split("\n")[0]?.replace(/^["']|["']$/g, "");
    if (message) {
      return message.slice(0, 72);
    }
  } catch {
    // fall through
  }

  return fallback;
}
