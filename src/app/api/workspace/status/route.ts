import { NextResponse } from "next/server";

import { readWorkspaceStatus } from "@/lib/workspace/ensure";

export const runtime = "nodejs";

export async function GET() {
  const status = await readWorkspaceStatus();
  return NextResponse.json({
    clean: status.clean,
    headSha: status.headSha,
    shortHash: status.shortHash,
    dirtyFileCount: status.fileCount,
  });
}
