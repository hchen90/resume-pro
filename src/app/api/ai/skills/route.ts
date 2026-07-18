import { NextResponse } from "next/server";

import {
  listConfiguredAgentSkills,
  resolveAgentSkillConfiguration,
} from "@/lib/ai/agentscope/skills";

export const runtime = "nodejs";

export async function GET() {
  const configuration = resolveAgentSkillConfiguration();
  const skills = listConfiguredAgentSkills(configuration).map(
    ({ name, description, source }) => ({
      name,
      description,
      source,
    }),
  );

  return NextResponse.json({
    enabled: configuration.enabled,
    skills,
  });
}
