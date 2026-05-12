import { z } from "zod";

import { resumeNodeTypes } from "./types";

export const resumeNodeItemSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  subtitle: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
});

export const resumeNodeContentSchema = z
  .object({
    name: z.string().optional(),
    headline: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    website: z.string().optional(),
    body: z.string().optional(),
    skills: z.array(z.string()).optional(),
    items: z.array(resumeNodeItemSchema).optional(),
  })
  .passthrough();

export const resumeNodeSaveSchema = z.object({
  id: z.string().min(1),
  type: z.enum(resumeNodeTypes),
  title: z.string().min(1),
  content: resumeNodeContentSchema,
  sortOrder: z.number().int().nonnegative(),
  enabled: z.boolean(),
});

export const resumeSaveSchema = z.object({
  title: z.string().min(1).max(120),
  templateId: z.string().min(1),
  nodes: z.array(resumeNodeSaveSchema).min(1),
});
