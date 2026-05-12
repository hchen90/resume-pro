import type { ResumeNode, ResumeNodeItem, ResumeNodeType } from "./types";

const now = () => new Date().toISOString();
const multiItemNodeTypes = ["experience", "project", "education"] as const;

export function createNode(
  resumeId: string,
  type: ResumeNodeType,
  title: string,
  sortOrder: number,
): ResumeNode {
  const timestamp = now();

  return {
    id: crypto.randomUUID(),
    resumeId,
    type,
    title,
    content:
      type === "profile"
        ? {
            name: "你的姓名",
            headline: "目标职位 / 专业方向",
            email: "email@example.com",
            phone: "138-0000-0000",
            location: "城市",
            website: "https://example.com",
          }
        : type === "skills"
          ? { skills: ["Next.js", "TypeScript", "产品设计"] }
          : isMultiItemNodeType(type)
            ? { items: [createDefaultNodeItem(type)] }
          : { body: defaultBodyForType(type) },
    sortOrder,
    enabled: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createDefaultResumeNodes(resumeId: string): ResumeNode[] {
  return [
    createNode(resumeId, "profile", "个人信息", 0),
    createNode(resumeId, "summary", "个人简介", 1),
    createNode(resumeId, "experience", "工作经历", 2),
    createNode(resumeId, "project", "项目经历", 3),
    createNode(resumeId, "education", "教育经历", 4),
    createNode(resumeId, "skills", "技能", 5),
  ];
}

export function createEmptyNodeItem(): ResumeNodeItem {
  return {
    id: crypto.randomUUID(),
    title: "",
    subtitle: "",
    startDate: "",
    endDate: "",
    location: "",
    description: "",
  };
}

export function isMultiItemNodeType(
  type: ResumeNodeType,
): type is (typeof multiItemNodeTypes)[number] {
  return multiItemNodeTypes.includes(
    type as (typeof multiItemNodeTypes)[number],
  );
}

function createDefaultNodeItem(type: ResumeNodeType): ResumeNodeItem {
  const item = createEmptyNodeItem();

  switch (type) {
    case "experience":
      return {
        ...item,
        title: "公司名称",
        subtitle: "职位名称",
        startDate: "2023-01",
        endDate: "",
        location: "城市",
        description: "- 描述关键职责与业务背景\n- 用量化结果说明你的贡献",
      };
    case "project":
      return {
        ...item,
        title: "项目名称",
        subtitle: "角色 / 技术栈",
        startDate: "2024-01",
        endDate: "2024-06",
        description: "- 项目目标和技术栈\n- 你的贡献与最终结果",
      };
    case "education":
      return {
        ...item,
        title: "学校名称",
        subtitle: "专业 / 学位",
        startDate: "2019-09",
        endDate: "2023-06",
        location: "城市",
        description: "- 相关课程、奖项或研究方向",
      };
    default:
      return item;
  }
}

function defaultBodyForType(type: ResumeNodeType) {
  switch (type) {
    case "summary":
      return "用 2-3 句话概括你的核心优势、目标岗位和代表性成果。";
    default:
      return "添加自定义内容。";
  }
}
