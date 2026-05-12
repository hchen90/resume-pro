import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const resumes = sqliteTable("resumes", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  templateId: text("template_id").notNull().default("classic"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const resumeNodes = sqliteTable("resume_nodes", {
  id: text("id").primaryKey(),
  resumeId: text("resume_id")
    .notNull()
    .references(() => resumes.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  content: text("content", { mode: "json" }).notNull(),
  sortOrder: integer("sort_order").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const jobDescriptions = sqliteTable(
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
