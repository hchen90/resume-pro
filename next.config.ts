import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Keep AgentScope out of the Next/Turbopack bundle. Its `./event` export
  // has a broken `development` → `.ts` condition; we load the compiled entry
  // via `src/lib/ai/agentscope/event.ts` instead.
  serverExternalPackages: ["@agentscope-ai/agentscope"],
};

export default nextConfig;
