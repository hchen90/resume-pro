import { index, integer, pgTable, text } from "drizzle-orm/pg-core";

export const resumes = pgTable("resumes", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  templateId: text("template_id").notNull().default("classic"),
  fontPreset: text("font_preset").notNull().default("sans"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const resumeNodes = pgTable("resume_nodes", {
  id: text("id").primaryKey(),
  resumeId: text("resume_id")
    .notNull()
    .references(() => resumes.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  sortOrder: integer("sort_order").notNull(),
  enabled: integer("enabled").notNull().default(1),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const jobDescriptions = pgTable(
  "job_descriptions",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("job_descriptions_updated_idx").on(table.updatedAt)],
);

export const aiChatSessions = pgTable("ai_chat_sessions", {
  resumeId: text("resume_id")
    .primaryKey()
    .references(() => resumes.id, { onDelete: "cascade" }),
  mode: text("mode").notNull().default("chat"),
  messages: text("messages").notNull(),
  summary: text("summary"),
  pendingPlan: text("pending_plan"),
  selectedPlanStepIds: text("selected_plan_step_ids").notNull(),
  pendingProposal: text("pending_proposal"),
  sessionVersion: integer("session_version").notNull().default(0),
  lastRunId: text("last_run_id"),
  agentContext: text("agent_context"),
  agentState: text("agent_state"),
  updatedAt: text("updated_at").notNull(),
});
