import { defaultLocale, dictionaries, type Locale } from "@/lib/i18n";

import type { ResumeNode, ResumeNodeItem, ResumeNodeType } from "./types";

const now = () => new Date().toISOString();
const multiItemNodeTypes = ["experience", "project", "education"] as const;

export function createNode(
  resumeId: string,
  type: ResumeNodeType,
  title: string,
  sortOrder: number,
  locale: Locale = defaultLocale,
): ResumeNode {
  const timestamp = now();
  const content = resumeDefaultContent[locale] ?? resumeDefaultContent[defaultLocale];

  return {
    id: crypto.randomUUID(),
    resumeId,
    type,
    title,
    content:
      type === "profile"
        ? content.profile
        : type === "skills"
          ? { skills: content.skills }
          : isMultiItemNodeType(type)
          ? { items: [createDefaultNodeItem(type, locale)] }
          : { body: defaultBodyForType(type, locale) },
    sortOrder,
    enabled: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createDefaultResumeNodes(
  resumeId: string,
  locale: Locale = defaultLocale,
): ResumeNode[] {
  const nodeTitles = dictionaries[locale].nodeTitles;

  return [
    createNode(resumeId, "profile", nodeTitles.profile, 0, locale),
    createNode(resumeId, "summary", nodeTitles.summary, 1, locale),
    createNode(resumeId, "experience", nodeTitles.experience, 2, locale),
    createNode(resumeId, "project", nodeTitles.project, 3, locale),
    createNode(resumeId, "education", nodeTitles.education, 4, locale),
    createNode(resumeId, "skills", nodeTitles.skills, 5, locale),
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

function createDefaultNodeItem(
  type: ResumeNodeType,
  locale: Locale,
): ResumeNodeItem {
  const item = createEmptyNodeItem();
  const content = resumeDefaultContent[locale] ?? resumeDefaultContent[defaultLocale];

  switch (type) {
    case "experience":
      return {
        ...item,
        title: content.experience.title,
        subtitle: content.experience.subtitle,
        startDate: "2023-01",
        endDate: "",
        location: content.location,
        description: content.experience.description,
      };
    case "project":
      return {
        ...item,
        title: content.project.title,
        subtitle: content.project.subtitle,
        startDate: "2024-01",
        endDate: "2024-06",
        description: content.project.description,
      };
    case "education":
      return {
        ...item,
        title: content.education.title,
        subtitle: content.education.subtitle,
        startDate: "2019-09",
        endDate: "2023-06",
        location: content.location,
        description: content.education.description,
      };
    default:
      return item;
  }
}

function defaultBodyForType(type: ResumeNodeType, locale: Locale) {
  const content = resumeDefaultContent[locale] ?? resumeDefaultContent[defaultLocale];

  switch (type) {
    case "summary":
      return content.summary;
    default:
      return content.custom;
  }
}

const resumeDefaultContent = {
  "zh-CN": {
    location: "城市",
    profile: {
      name: "你的姓名",
      headline: "目标职位 / 专业方向",
      email: "email@example.com",
      phone: "138-0000-0000",
      location: "城市",
      website: "https://example.com",
    },
    summary: "用 2-3 句话概括你的核心优势、目标岗位和代表性成果。",
    custom: "添加自定义内容。",
    skills: ["Next.js", "TypeScript", "产品设计"],
    experience: {
      title: "公司名称",
      subtitle: "职位名称",
      description: "- 描述关键职责与业务背景\n- 用量化结果说明你的贡献",
    },
    project: {
      title: "项目名称",
      subtitle: "角色 / 技术栈",
      description: "- 项目目标和技术栈\n- 你的贡献与最终结果",
    },
    education: {
      title: "学校名称",
      subtitle: "专业 / 学位",
      description: "- 相关课程、奖项或研究方向",
    },
  },
  en: {
    location: "City",
    profile: {
      name: "Your name",
      headline: "Target role / professional focus",
      email: "email@example.com",
      phone: "+1 555-0100",
      location: "City",
      website: "https://example.com",
    },
    summary: "Summarize your core strengths, target role, and representative achievements in 2-3 sentences.",
    custom: "Add custom content.",
    skills: ["Next.js", "TypeScript", "Product design"],
    experience: {
      title: "Company name",
      subtitle: "Job title",
      description: "- Describe key responsibilities and business context\n- Use measurable outcomes to show your impact",
    },
    project: {
      title: "Project name",
      subtitle: "Role / tech stack",
      description: "- Project goals and technology stack\n- Your contribution and final results",
    },
    education: {
      title: "School name",
      subtitle: "Major / degree",
      description: "- Relevant coursework, awards, or research focus",
    },
  },
  ko: {
    location: "도시",
    profile: {
      name: "이름",
      headline: "목표 직무 / 전문 분야",
      email: "email@example.com",
      phone: "010-0000-0000",
      location: "도시",
      website: "https://example.com",
    },
    summary: "핵심 강점, 목표 직무, 대표 성과를 2-3문장으로 요약하세요.",
    custom: "사용자 정의 내용을 추가하세요.",
    skills: ["Next.js", "TypeScript", "제품 디자인"],
    experience: {
      title: "회사명",
      subtitle: "직무명",
      description: "- 주요 책임과 비즈니스 맥락을 설명하세요\n- 정량적 결과로 기여를 보여주세요",
    },
    project: {
      title: "프로젝트명",
      subtitle: "역할 / 기술 스택",
      description: "- 프로젝트 목표와 기술 스택\n- 본인의 기여와 최종 결과",
    },
    education: {
      title: "학교명",
      subtitle: "전공 / 학위",
      description: "- 관련 과목, 수상 또는 연구 분야",
    },
  },
  es: {
    location: "Ciudad",
    profile: {
      name: "Tu nombre",
      headline: "Puesto objetivo / enfoque profesional",
      email: "email@example.com",
      phone: "+34 600 000 000",
      location: "Ciudad",
      website: "https://example.com",
    },
    summary: "Resume tus fortalezas clave, puesto objetivo y logros representativos en 2-3 frases.",
    custom: "Agrega contenido personalizado.",
    skills: ["Next.js", "TypeScript", "Diseño de producto"],
    experience: {
      title: "Nombre de la empresa",
      subtitle: "Puesto",
      description: "- Describe responsabilidades clave y contexto de negocio\n- Usa resultados medibles para mostrar tu impacto",
    },
    project: {
      title: "Nombre del proyecto",
      subtitle: "Rol / stack técnico",
      description: "- Objetivos del proyecto y stack técnico\n- Tu contribución y resultados finales",
    },
    education: {
      title: "Nombre de la institución",
      subtitle: "Especialidad / título",
      description: "- Cursos relevantes, premios o línea de investigación",
    },
  },
  ja: {
    location: "都市",
    profile: {
      name: "あなたの名前",
      headline: "希望職種 / 専門領域",
      email: "email@example.com",
      phone: "090-0000-0000",
      location: "都市",
      website: "https://example.com",
    },
    summary: "あなたの強み、希望職種、代表的な成果を2-3文で要約してください。",
    custom: "カスタム内容を追加してください。",
    skills: ["Next.js", "TypeScript", "プロダクトデザイン"],
    experience: {
      title: "会社名",
      subtitle: "職種名",
      description: "- 主な責任とビジネス背景を説明\n- 定量的な成果で貢献を示す",
    },
    project: {
      title: "プロジェクト名",
      subtitle: "役割 / 技術スタック",
      description: "- プロジェクトの目的と技術スタック\n- あなたの貢献と最終成果",
    },
    education: {
      title: "学校名",
      subtitle: "専攻 / 学位",
      description: "- 関連科目、受賞歴、研究テーマ",
    },
  },
  ru: {
    location: "Город",
    profile: {
      name: "Ваше имя",
      headline: "Целевая роль / профессиональный фокус",
      email: "email@example.com",
      phone: "+7 900 000-00-00",
      location: "Город",
      website: "https://example.com",
    },
    summary: "В 2-3 предложениях опишите ключевые сильные стороны, целевую роль и основные достижения.",
    custom: "Добавьте пользовательский контент.",
    skills: ["Next.js", "TypeScript", "Продуктовый дизайн"],
    experience: {
      title: "Название компании",
      subtitle: "Должность",
      description: "- Опишите ключевые обязанности и бизнес-контекст\n- Покажите вклад через измеримые результаты",
    },
    project: {
      title: "Название проекта",
      subtitle: "Роль / стек технологий",
      description: "- Цели проекта и стек технологий\n- Ваш вклад и итоговые результаты",
    },
    education: {
      title: "Название учебного заведения",
      subtitle: "Специальность / степень",
      description: "- Релевантные курсы, награды или направление исследований",
    },
  },
  de: {
    location: "Ort",
    profile: {
      name: "Ihr Name",
      headline: "Zielrolle / fachlicher Schwerpunkt",
      email: "email@example.com",
      phone: "+49 170 0000000",
      location: "Ort",
      website: "https://example.com",
    },
    summary: "Fassen Sie Ihre Kernstärken, Zielrolle und wichtigsten Erfolge in 2-3 Sätzen zusammen.",
    custom: "Eigene Inhalte hinzufügen.",
    skills: ["Next.js", "TypeScript", "Produktdesign"],
    experience: {
      title: "Unternehmensname",
      subtitle: "Position",
      description: "- Beschreiben Sie zentrale Aufgaben und Geschäftskontext\n- Zeigen Sie Ihren Beitrag mit messbaren Ergebnissen",
    },
    project: {
      title: "Projektname",
      subtitle: "Rolle / Tech-Stack",
      description: "- Projektziele und Tech-Stack\n- Ihr Beitrag und die finalen Ergebnisse",
    },
    education: {
      title: "Name der Institution",
      subtitle: "Studienfach / Abschluss",
      description: "- Relevante Kurse, Auszeichnungen oder Forschungsschwerpunkt",
    },
  },
  fr: {
    location: "Ville",
    profile: {
      name: "Votre nom",
      headline: "Poste cible / spécialité",
      email: "email@example.com",
      phone: "+33 6 00 00 00 00",
      location: "Ville",
      website: "https://example.com",
    },
    summary: "Résumez vos forces clés, le poste cible et vos réalisations principales en 2-3 phrases.",
    custom: "Ajoutez du contenu personnalisé.",
    skills: ["Next.js", "TypeScript", "Design produit"],
    experience: {
      title: "Nom de l'entreprise",
      subtitle: "Intitulé du poste",
      description: "- Décrivez les responsabilités clés et le contexte métier\n- Montrez votre impact avec des résultats mesurables",
    },
    project: {
      title: "Nom du projet",
      subtitle: "Rôle / stack technique",
      description: "- Objectifs du projet et stack technique\n- Votre contribution et les résultats obtenus",
    },
    education: {
      title: "Nom de l'établissement",
      subtitle: "Spécialité / diplôme",
      description: "- Cours pertinents, prix ou axe de recherche",
    },
  },
} satisfies Record<Locale, {
  location: string;
  profile: {
    name: string;
    headline: string;
    email: string;
    phone: string;
    location: string;
    website: string;
  };
  summary: string;
  custom: string;
  skills: string[];
  experience: {
    title: string;
    subtitle: string;
    description: string;
  };
  project: {
    title: string;
    subtitle: string;
    description: string;
  };
  education: {
    title: string;
    subtitle: string;
    description: string;
  };
}>;
