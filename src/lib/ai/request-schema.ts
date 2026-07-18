import { z } from "zod";

import { aiPlanSchema } from "@/lib/ai/patch";
import { aiModes } from "@/lib/ai/types";
import { locales } from "@/lib/i18n";
import { resumeFontPresets } from "@/lib/resume/fonts";
import { resumeNodeTypes } from "@/lib/resume/types";
import { resumeNodeContentSchema } from "@/lib/resume/validation";

export const resumeSnapshotSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  templateId: z.string().min(1),
  fontPreset: z.enum(resumeFontPresets),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  nodes: z
    .array(
      z.object({
        id: z.string().min(1),
        resumeId: z.string().min(1),
        type: z.enum(resumeNodeTypes),
        title: z.string().min(1),
        content: resumeNodeContentSchema,
        sortOrder: z.number().int().nonnegative(),
        enabled: z.boolean(),
        createdAt: z.string().min(1),
        updatedAt: z.string().min(1),
      }),
    )
    .min(1),
});

export const aiMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export const aiRunRequestSchema = z.object({
  resumeId: z.string().min(1),
  selectedNodeId: z.string().optional(),
  mode: z.enum(aiModes),
  action: z.enum(["send", "execute_plan"]).default("send"),
  locale: z.enum(locales).optional(),
  message: z.string().min(1),
  messages: z.array(aiMessageSchema).optional(),
  plan: aiPlanSchema.optional(),
  resumeSnapshot: resumeSnapshotSchema,
});

export const aiConfirmRequestSchema = z.object({
  resumeId: z.string().min(1),
  proposalId: z.string().min(1),
  decision: z.enum(["confirm", "reject"]),
  locale: z.enum(locales).optional(),
  resumeSnapshot: resumeSnapshotSchema,
});
