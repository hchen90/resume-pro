export const resumeNodeTypes = [
  "profile",
  "summary",
  "experience",
  "education",
  "project",
  "skills",
  "custom",
] as const;

export type ResumeNodeType = (typeof resumeNodeTypes)[number];

export type ResumeNodeContent = {
  name?: string;
  headline?: string;
  email?: string;
  phone?: string;
  location?: string;
  website?: string;
  body?: string;
  skills?: string[];
  items?: ResumeNodeItem[];
};

export type ResumeNodeItem = {
  id: string;
  title: string;
  subtitle?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  description?: string;
};

export type ResumeNode = {
  id: string;
  resumeId: string;
  type: ResumeNodeType;
  title: string;
  content: ResumeNodeContent;
  sortOrder: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Resume = {
  id: string;
  title: string;
  templateId: string;
  fontPreset: string;
  createdAt: string;
  updatedAt: string;
};

export type ResumeWithNodes = Resume & {
  nodes: ResumeNode[];
};

export type ResumeSaveInput = {
  title: string;
  templateId: string;
  fontPreset: string;
  nodes: Array<{
    id: string;
    type: ResumeNodeType;
    title: string;
    content: ResumeNodeContent;
    sortOrder: number;
    enabled: boolean;
  }>;
};
