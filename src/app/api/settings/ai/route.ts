import { NextResponse } from "next/server";
import { z } from "zod";

import {
  isElectronRuntime,
  updateElectronAiConfig,
} from "@/lib/electron-env";

export const runtime = "nodejs";

const aiSettingsSchema = z.object({
  aiApiUrl: z
    .string()
    .trim()
    .refine((value) => value === "" || URL.canParse(value), {
      message: "AI_API_URL must be a valid URL.",
    }),
  aiApiKey: z.string(),
  aiApiModel: z.string().trim().min(1),
  aiSummaryModel: z.string(),
});

export async function PUT(request: Request) {
  if (!isElectronRuntime()) {
    return new NextResponse("AI settings can only be updated in Electron.", {
      status: 403,
    });
  }

  const input = aiSettingsSchema.parse(await request.json());
  updateElectronAiConfig(input);

  return NextResponse.json({ ok: true, restartRequired: true });
}
