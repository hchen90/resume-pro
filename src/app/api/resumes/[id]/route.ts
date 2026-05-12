import { NextResponse } from "next/server";

import { saveResume } from "@/lib/db/resume-repository";
import { resumeSaveSchema } from "@/lib/resume/validation";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const payload = resumeSaveSchema.parse(await request.json());
  const resume = await saveResume(id, payload);

  return NextResponse.json(resume);
}
