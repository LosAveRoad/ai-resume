export type LayoutData = {
  fontSize: number;
  lineHeight: number;
  marginX: number;
  marginY: number;
  sectionGap: number;
};

export const TEMPLATE_IDS = ["numbered-rail", "classic-burgundy", "campus-navy"] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export type ResumeTemplate = {
  id: TemplateId;
  name: string;
  description: string;
  eyebrow: string;
  accent: string;
  defaultLayout: LayoutData;
};

export const RESUME_TEMPLATES: Record<TemplateId, ResumeTemplate> = {
  "numbered-rail": {
    id: "numbered-rail",
    name: "现代编号",
    description: "大标题、章节编号与清晰侧栏",
    eyebrow: "EDITORIAL",
    accent: "#f0442d",
    defaultLayout: { fontSize: 9.25, lineHeight: 1.45, marginX: 11, marginY: 10, sectionGap: 6 },
  },
  "classic-burgundy": {
    id: "classic-burgundy",
    name: "经典酒红",
    description: "中文衬线标题与克制横线",
    eyebrow: "CLASSIC",
    accent: "#7e1528",
    defaultLayout: { fontSize: 8.5, lineHeight: 1.38, marginX: 15, marginY: 8, sectionGap: 3 },
  },
  "campus-navy": {
    id: "campus-navy",
    name: "校园深蓝",
    description: "高信息密度、图标章节与应届生布局",
    eyebrow: "CAMPUS",
    accent: "#082d67",
    defaultLayout: { fontSize: 8.5, lineHeight: 1.32, marginX: 10, marginY: 8, sectionGap: 3 },
  },
};

export const DEFAULT_TEMPLATE_ID: TemplateId = "numbered-rail";

export function isTemplateId(value: unknown): value is TemplateId {
  return typeof value === "string" && TEMPLATE_IDS.includes(value as TemplateId);
}
