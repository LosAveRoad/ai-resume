"use client";

import {
  Fragment,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  DEFAULT_TEMPLATE_ID,
  RESUME_TEMPLATES,
  TEMPLATE_IDS,
  isTemplateId,
  type LayoutData,
  type TemplateId,
} from "./templates";

const STRUCTURED_KEY = "ai-resume.structured.v3";
const LEGACY_STRUCTURED_KEY = "ai-resume.structured.v2";
const LEGACY_DOCUMENT_KEY = "ai-resume.document.v1";
const LEGACY_MARKDOWN_KEY = "ai-resume.markdown.v1";
const LEGACY_LAYOUT_KEY = "ai-resume.layout.v1";
const HEADER_BLOCK_ID = "__header";
const ADD_MODULE_ID = "__add-module";

type PhotoData = {
  src: string;
  positionX: number;
  positionY: number;
  zoom: number;
};

type HeaderData = {
  name: string;
  role: string;
  phone: string;
  email: string;
  location: string;
  website: string;
  photo: PhotoData | null;
};

type HeaderTextKey = Exclude<keyof HeaderData, "photo">;

type ResumeEntry = {
  id: string;
  title: string;
  subtitle: string;
  startDate: string;
  endDate: string;
  location: string;
  details: string;
};

type ResumeSection = {
  id: string;
  title: string;
  kind: "text" | "entries";
  visible: boolean;
  fixed: boolean;
  text: string;
  entries: ResumeEntry[];
};

type ResumeDocument = {
  version: 3;
  header: HeaderData;
  presentation: {
    activeTemplate: TemplateId;
    layouts: Record<TemplateId, LayoutData>;
  };
  sections: ResumeSection[];
};

declare global {
  interface Window {
    __RESUME_READY__?: boolean;
  }
}

const DEFAULT_LAYOUT: LayoutData = RESUME_TEMPLATES[DEFAULT_TEMPLATE_ID].defaultLayout;

const DEFAULT_LAYOUTS = Object.fromEntries(
  TEMPLATE_IDS.map((templateId) => [templateId, { ...RESUME_TEMPLATES[templateId].defaultLayout }]),
) as Record<TemplateId, LayoutData>;

const FIXED_SECTION_IDS: Record<string, string> = {
  "教育背景": "education",
  "专业技能": "skills",
  "工作经历": "work",
  "实习经历": "internship",
  "项目经历": "projects",
  "荣誉证书": "honors",
  "自我评价": "summary",
};

const DEFAULT_RESUME: ResumeDocument = {
  version: 3,
  header: {
    name: "林晓然",
    role: "AI AGENT ENGINEER · BACKEND ENGINEER",
    phone: "+86 138 0000 0000",
    email: "xiaoran@example.com",
    location: "上海",
    website: "github.com/xiaoran-lin",
    photo: null,
  },
  presentation: {
    activeTemplate: DEFAULT_TEMPLATE_ID,
    layouts: DEFAULT_LAYOUTS,
  },
  sections: [
    {
      id: "summary",
      title: "自我评价",
      kind: "text",
      visible: true,
      fixed: true,
      text: "专注 **AI Agent 工程化** 与可靠后端，擅长把模糊需求拆成可验证的状态、工具和接口；重视可观测性、自动化测试与清晰表达。",
      entries: [],
    },
    {
      id: "skills",
      title: "专业技能",
      kind: "text",
      visible: true,
      fixed: true,
      text: "- **编程语言：** Python、TypeScript、Go\n- **AI 工程：** LLM Agent、RAG、MCP、评测与可观测性\n- **后端系统：** FastAPI、PostgreSQL、Redis、Docker\n- **工程效率：** GitHub Actions、自动化测试、性能分析与故障演练",
      entries: [],
    },
    {
      id: "work",
      title: "工作经历",
      kind: "entries",
      visible: true,
      fixed: true,
      text: "",
      entries: [
        {
          id: "work-example",
          title: "示例科技",
          subtitle: "AI 工程师",
          startDate: "2024.07",
          endDate: "至今",
          location: "上海",
          details: "1. 设计企业知识助手的状态化 Agent 流程，拆分规划、工具调用和结果校验节点。\n2. 建立 **工具轨迹** 和错误分类，使复杂问题能够被复现和定位。\n3. 编写离线评测集和回归脚本，将版本验收从 2 天缩短到 3 小时。",
        },
        {
          id: "work-platform",
          title: "云启智能",
          subtitle: "后端工程师",
          startDate: "2022.07",
          endDate: "2024.06",
          location: "杭州",
          details: "- 负责异步任务平台的 API、队列与状态机设计，支撑日均 120 万次任务调度。\n- 建立 OpenTelemetry 追踪与分级告警，将核心故障平均定位时间缩短 **45%**。\n- 推进幂等键、重试预算与灰度发布规范，连续两个季度无重大生产事故。",
        },
      ],
    },
    {
      id: "internship",
      title: "实习经历",
      kind: "entries",
      visible: true,
      fixed: true,
      text: "",
      entries: [
        {
          id: "internship-example",
          title: "星河实验室",
          subtitle: "研发实习生",
          startDate: "2021.07",
          endDate: "2021.12",
          location: "上海",
          details: "- 开发数据清洗与质量检查流水线，覆盖 30+ 数据源和 80 条校验规则。\n- 为关键作业补齐测试和运行手册，使每周人工排查时间减少约 6 小时。\n- 参与代码评审与发布值班，熟悉从需求拆分到上线复盘的完整流程。",
        },
      ],
    },
    {
      id: "projects",
      title: "项目经历",
      kind: "entries",
      visible: true,
      fixed: true,
      text: "",
      entries: [
        {
          id: "project-resume",
          title: "开源简历工作台",
          subtitle: "核心开发者",
          startDate: "2025.11",
          endDate: "至今",
          location: "",
          details: "- 设计本地优先的结构化简历编辑器，段落内部支持 `Markdown`，并提供 A4 实时预览。\n- 规划面向 Coding Agent 的 CLI / MCP 接口，让内容与版式能够被自动化调整。\n- 使用浏览器渲染导出 PDF，并验证页数、中文文本和内容裁切。",
        },
        {
          id: "project-runtime",
          title: "可恢复 Agent 运行时",
          subtitle: "个人项目",
          startDate: "2025.03",
          endDate: "2025.10",
          location: "",
          details: "- 实现持久化 checkpoint、工具重试与人工接管，覆盖 20+ 故障场景。\n- 通过 [可观测面板](https://example.com) 追踪每次工具调用和状态迁移。\n- 为状态升级设计兼容性测试，支持中断任务在新版本继续运行。",
        },
      ],
    },
    {
      id: "education",
      title: "教育背景",
      kind: "entries",
      visible: true,
      fixed: true,
      text: "",
      entries: [
        {
          id: "education-example",
          title: "同济大学",
          subtitle: "软件工程 · 工学学士",
          startDate: "2020.09",
          endDate: "2024.06",
          location: "上海",
          details: "- GPA 3.7 / 4.0，专业前 10%\n- 主修分布式系统、数据库系统、软件工程与编译原理",
        },
      ],
    },
    {
      id: "honors",
      title: "荣誉证书",
      kind: "text",
      visible: true,
      fixed: true,
      text: "- 全国大学生软件创新大赛一等奖（2023）\n- AWS Certified Solutions Architect – Associate（2024）\n- 校级优秀毕业设计（2024）\n- 连续两年获得专业奖学金（2022–2023）",
      entries: [],
    },
  ],
};

export function ResumeEditor() {
  const [resume, setResume] = useState<ResumeDocument>(DEFAULT_RESUME);
  const [hydrated, setHydrated] = useState(false);
  const [pages, setPages] = useState<string[][]>([[HEADER_BLOCK_ID]]);
  const [oversizedSection, setOversizedSection] = useState(false);
  const [notice, setNotice] = useState("");
  const [activeEditorTarget, setActiveEditorTarget] = useState(HEADER_BLOCK_ID);
  const measureRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLElement>(null);

  const activeTemplate = resume.presentation.activeTemplate;
  const activeLayout = resume.presentation.layouts[activeTemplate];

  const visibleSections = useMemo(
    () => resume.sections.filter((section) => section.visible),
    [resume.sections],
  );
  const resolvedEditorTarget = activeEditorTarget === HEADER_BLOCK_ID || activeEditorTarget === ADD_MODULE_ID || resume.sections.some((section) => section.id === activeEditorTarget)
    ? activeEditorTarget
    : HEADER_BLOCK_ID;
  const activeEditorSection = resume.sections.find((section) => section.id === resolvedEditorTarget);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const structured = localStorage.getItem(STRUCTURED_KEY);
        const legacyStructured = localStorage.getItem(LEGACY_STRUCTURED_KEY);
        const legacyDocument = localStorage.getItem(LEGACY_DOCUMENT_KEY);
        const legacyMarkdown = localStorage.getItem(LEGACY_MARKDOWN_KEY);
        const legacyLayout = localStorage.getItem(LEGACY_LAYOUT_KEY);

        if (structured) {
          setResume(normalizeResume(JSON.parse(structured)));
        } else if (legacyStructured) {
          setResume(normalizeResume(JSON.parse(legacyStructured)));
        } else if (legacyDocument) {
          setResume(normalizeResume(JSON.parse(legacyDocument)));
        } else if (legacyMarkdown) {
          const layout = legacyLayout ? normalizeLayout(JSON.parse(legacyLayout)) : DEFAULT_LAYOUT;
          setResume(parseLegacyMarkdown(legacyMarkdown, layout));
        }
      } catch {
        setNotice("本地草稿无法读取，已载入示例内容。");
      } finally {
        setHydrated(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STRUCTURED_KEY, JSON.stringify(resume));
    } catch {
      window.setTimeout(() => setNotice("本地存储空间不足，请更换尺寸更小的照片。"), 0);
    }
  }, [hydrated, resume]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useLayoutEffect(() => {
    const measurement = measureRef.current;
    if (!measurement) return;

    window.__RESUME_READY__ = false;
    const availableHeight = mmToPx(297 - activeLayout.marginY * 2);
    const nextPages: string[][] = [];
    let currentPage: string[] = [];
    let usedHeight = 0;
    let foundOversized = false;

    measurement.querySelectorAll<HTMLElement>("[data-block-id]").forEach((block) => {
      const id = block.dataset.blockId;
      if (!id) return;
      const style = window.getComputedStyle(block);
      const blockHeight = block.getBoundingClientRect().height + Number.parseFloat(style.marginTop || "0");

      if (blockHeight > availableHeight) foundOversized = true;
      if (currentPage.length > 0 && usedHeight + blockHeight > availableHeight) {
        nextPages.push(currentPage);
        currentPage = [];
        usedHeight = 0;
      }
      currentPage.push(id);
      usedHeight += blockHeight;
    });

    if (currentPage.length > 0) nextPages.push(currentPage);
    setPages(nextPages.length > 0 ? nextPages : [[HEADER_BLOCK_ID]]);
    setOversizedSection(foundOversized);
    window.__RESUME_READY__ = hydrated;
  }, [activeLayout.marginY, hydrated, resume]);

  const updateHeader = (key: HeaderTextKey, value: string) => {
    setResume((current) => ({ ...current, header: { ...current.header, [key]: value } }));
  };

  const updatePhoto = (photo: PhotoData | null) => {
    setResume((current) => ({ ...current, header: { ...current.header, photo } }));
  };

  const selectTemplate = (templateId: TemplateId) => {
    setResume((current) => ({
      ...current,
      presentation: { ...current.presentation, activeTemplate: templateId },
    }));
  };

  const updateLayout = (key: keyof LayoutData, value: number) => {
    setResume((current) => {
      const templateId = current.presentation.activeTemplate;
      return {
        ...current,
        presentation: {
          ...current.presentation,
          layouts: {
            ...current.presentation.layouts,
            [templateId]: { ...current.presentation.layouts[templateId], [key]: value },
          },
        },
      };
    });
  };

  const updateSection = (sectionId: string, patch: Partial<ResumeSection>) => {
    setResume((current) => ({
      ...current,
      sections: current.sections.map((section) => section.id === sectionId ? { ...section, ...patch } : section),
    }));
  };

  const moveSection = (sectionId: string, direction: -1 | 1) => {
    setResume((current) => ({ ...current, sections: moveItem(current.sections, sectionId, direction) }));
  };

  const addSection = (kind: ResumeSection["kind"]) => {
    const section: ResumeSection = {
      id: makeId("section"),
      title: kind === "text" ? "自选文本模块" : "自选经历模块",
      kind,
      visible: true,
      fixed: false,
      text: kind === "text" ? "在这里输入内容，可使用 **粗体** 或列表。" : "",
      entries: kind === "entries" ? [createBlankEntry()] : [],
    };
    setResume((current) => ({ ...current, sections: [...current.sections, section] }));
    setActiveEditorTarget(section.id);
    setNotice("已添加自选模块。");
  };

  const deleteSection = (sectionId: string) => {
    setResume((current) => ({ ...current, sections: current.sections.filter((section) => section.id !== sectionId) }));
    setActiveEditorTarget(HEADER_BLOCK_ID);
  };

  const selectEditorTarget = (target: string) => {
    setActiveEditorTarget(target);
    window.requestAnimationFrame(() => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const updateEntry = (sectionId: string, entryId: string, patch: Partial<ResumeEntry>) => {
    setResume((current) => ({
      ...current,
      sections: current.sections.map((section) => section.id === sectionId
        ? { ...section, entries: section.entries.map((entry) => entry.id === entryId ? { ...entry, ...patch } : entry) }
        : section),
    }));
  };

  const addEntry = (sectionId: string) => {
    setResume((current) => ({
      ...current,
      sections: current.sections.map((section) => section.id === sectionId
        ? { ...section, entries: [...section.entries, createBlankEntry()] }
        : section),
    }));
  };

  const moveEntry = (sectionId: string, entryId: string, direction: -1 | 1) => {
    setResume((current) => ({
      ...current,
      sections: current.sections.map((section) => section.id === sectionId
        ? { ...section, entries: moveItem(section.entries, entryId, direction) }
        : section),
    }));
  };

  const deleteEntry = (sectionId: string, entryId: string) => {
    setResume((current) => ({
      ...current,
      sections: current.sections.map((section) => section.id === sectionId
        ? { ...section, entries: section.entries.filter((entry) => entry.id !== entryId) }
        : section),
    }));
  };

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const content = await file.text();
      const imported = file.name.toLowerCase().endsWith(".md")
        ? parseLegacyMarkdown(content, activeLayout)
        : normalizeResume(JSON.parse(content));
      setResume(imported);
      setActiveEditorTarget(HEADER_BLOCK_ID);
      setNotice("简历内容已载入。");
    } catch {
      setNotice("导入失败：请选择有效的 Markdown 或简历 JSON。");
    }
  };

  const exportMarkdown = () => {
    downloadText(resumeToMarkdown(resume), `${slugify(resume.header.name || "resume")}.resume.md`, "text/markdown");
    setNotice("Markdown 快照已导出。");
  };

  const exportJson = () => {
    downloadText(JSON.stringify(resume, null, 2), `${slugify(resume.header.name || "resume")}.resume.json`, "application/json");
    setNotice("结构化 JSON 已导出。");
  };

  const resetResume = () => {
    if (!window.confirm("恢复示例会覆盖当前本地草稿，继续吗？")) return;
    setResume(DEFAULT_RESUME);
    setActiveEditorTarget(HEADER_BLOCK_ID);
    setNotice("已恢复示例内容。");
  };

  const pageStyles = {
    "--resume-font-size": `${activeLayout.fontSize}pt`,
    "--resume-line-height": activeLayout.lineHeight,
    "--resume-margin-x": `${activeLayout.marginX}mm`,
    "--resume-margin-y": `${activeLayout.marginY}mm`,
    "--resume-section-gap": `${activeLayout.sectionGap}px`,
  } as CSSProperties;

  return (
    <main className="app-shell">
      <header className="app-bar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">AR</div>
          <div>
            <p className="eyebrow">LOCAL FIRST</p>
            <h1>AI Resume</h1>
          </div>
        </div>

        <div className="app-actions">
          <div className="save-state"><span aria-hidden="true" />{hydrated ? "已保存在本地" : "正在载入"}</div>
          <button className="ghost-button" type="button" onClick={() => selectEditorTarget(resolvedEditorTarget)}>结构化编辑</button>
          <button className="ghost-button" type="button" onClick={() => importRef.current?.click()}>导入</button>
          <button className="ghost-button action-secondary" type="button" onClick={exportMarkdown}>导出 MD</button>
          <button className="ghost-button action-secondary" type="button" onClick={exportJson}>JSON</button>
          <button className="ghost-button action-secondary" type="button" onClick={resetResume}>恢复示例</button>
          <button className="primary-button" type="button" onClick={() => window.print()}>导出 PDF</button>
          <input ref={importRef} className="visually-hidden" type="file" accept=".md,.json,text/markdown,application/json" onChange={importFile} />
        </div>
      </header>

      <section className="preview-stage" aria-label="A4 简历预览">
        <div className="preview-shell">
          <header className="preview-heading">
            <div>
              <p className="eyebrow">LIVE DOCUMENT</p>
              <h2>简历预览</h2>
            </div>
            <div className="page-status">
              {oversizedSection && <span className="overflow-warning">单个模块超过一页</span>}
              <span>{pages.length} PAGE{pages.length > 1 ? "S" : ""}</span>
            </div>
          </header>

          <TemplatePicker activeTemplate={activeTemplate} onSelect={selectTemplate} />

          <div className="page-wrap" data-preview-ready={hydrated ? "true" : "false"}>
            {pages.map((blockIds, pageIndex) => (
              <ResumePage key={`${pageIndex}-${blockIds.join("-")}`} pageIndex={pageIndex} blockIds={blockIds} resume={resume} templateId={activeTemplate} style={pageStyles} />
            ))}
          </div>
        </div>

        <div className="measurement-wrap" aria-hidden="true">
          <div ref={measureRef} className="resume-page measurement-page" data-template={activeTemplate} data-has-photo={resume.header.photo ? "true" : "false"} style={pageStyles}>
            <ResumeHeader header={resume.header} measure />
            {visibleSections.map((section, index) => <ResumeSectionView key={section.id} section={section} index={index} measure />)}
          </div>
        </div>
      </section>

      <ModuleNavigator
        headerName={resume.header.name}
        sections={resume.sections}
        activeTarget={resolvedEditorTarget}
        onSelect={selectEditorTarget}
      />

      <section className="editor-zone" ref={editorRef}>
        <div className="editor-shell">
          <header className="editor-heading">
            <div>
              <p className="eyebrow">ACTIVE MODULE</p>
              <h2>{resolvedEditorTarget === HEADER_BLOCK_ID ? "基本信息" : resolvedEditorTarget === ADD_MODULE_ID ? "添加模块" : activeEditorSection?.title}</h2>
              <p>当前只编辑一个模块；内容会即时同步到上方简历预览。</p>
            </div>
            <span className="syntax-badge">FIELD-LEVEL MD</span>
          </header>

          <div className="structured-editor">
            <div className="content-editor">
              {resolvedEditorTarget === HEADER_BLOCK_ID && (
                <HeaderEditor header={resume.header} onChange={updateHeader} onPhotoChange={updatePhoto} onPhotoError={setNotice} />
              )}

              {activeEditorSection && (
                <SectionEditor
                  key={activeEditorSection.id}
                  section={activeEditorSection}
                  index={resume.sections.findIndex((section) => section.id === activeEditorSection.id)}
                  total={resume.sections.length}
                  onChange={(patch) => updateSection(activeEditorSection.id, patch)}
                  onMove={(direction) => moveSection(activeEditorSection.id, direction)}
                  onDelete={() => deleteSection(activeEditorSection.id)}
                  onEntryChange={(entryId, patch) => updateEntry(activeEditorSection.id, entryId, patch)}
                  onEntryAdd={() => addEntry(activeEditorSection.id)}
                  onEntryMove={(entryId, direction) => moveEntry(activeEditorSection.id, entryId, direction)}
                  onEntryDelete={(entryId) => deleteEntry(activeEditorSection.id, entryId)}
                />
              )}

              {resolvedEditorTarget === ADD_MODULE_ID && (
                <div className="add-module-card is-active-panel">
                  <div>
                    <strong>添加自选模块</strong>
                    <p>文本模块适合简介、技能与证书；经历模块包含标题、时间和多个条目。</p>
                  </div>
                  <div className="add-module-actions">
                    <button type="button" onClick={() => addSection("text")}>＋ 文本模块</button>
                    <button type="button" onClick={() => addSection("entries")}>＋ 经历模块</button>
                  </div>
                </div>
              )}
            </div>

            <aside className="layout-panel">
              <section>
                <p className="panel-label">PAGE STYLE</p>
                <h3>页面版式</h3>
                <div className="range-stack">
                  <RangeField label="正文字号" value={activeLayout.fontSize} min={8.25} max={11.5} step={0.25} suffix="pt" onChange={(value) => updateLayout("fontSize", value)} />
                  <RangeField label="行距" value={activeLayout.lineHeight} min={1.2} max={1.7} step={0.05} suffix="" onChange={(value) => updateLayout("lineHeight", value)} />
                  <RangeField label="模块间距" value={activeLayout.sectionGap} min={3} max={16} step={1} suffix="px" onChange={(value) => updateLayout("sectionGap", value)} />
                  <RangeField label="水平页边距" value={activeLayout.marginX} min={8} max={24} step={1} suffix="mm" onChange={(value) => updateLayout("marginX", value)} />
                  <RangeField label="垂直页边距" value={activeLayout.marginY} min={8} max={24} step={1} suffix="mm" onChange={(value) => updateLayout("marginY", value)} />
                </div>
              </section>

              <section className="syntax-guide">
                <p className="panel-label">INSIDE TEXT FIELDS</p>
                <h3>段落 Markdown</h3>
                <dl>
                  <div><dt>- 项目</dt><dd>无序列表</dd></div>
                  <div><dt>1. 项目</dt><dd>有序列表</dd></div>
                  <div><dt>**text**</dt><dd>粗体</dd></div>
                  <div><dt>*text*</dt><dd>斜体</dd></div>
                  <div><dt>`code`</dt><dd>行内代码</dd></div>
                  <div><dt>[text](url)</dt><dd>链接</dd></div>
                </dl>
              </section>
            </aside>
          </div>
        </div>
      </section>

      {notice && <div className="toast" role="status">{notice}</div>}
    </main>
  );
}

function ModuleNavigator({ headerName, sections, activeTarget, onSelect }: {
  headerName: string;
  sections: ResumeSection[];
  activeTarget: string;
  onSelect: (target: string) => void;
}) {
  const targets = [
    { id: HEADER_BLOCK_ID, title: "基本信息", visible: true },
    ...sections.map((section) => ({ id: section.id, title: section.title, visible: section.visible })),
  ];

  return (
    <nav className="module-navigator" aria-label="简历模块导航">
      <div className="module-track" role="tablist" aria-label={`${headerName || "当前简历"}的编辑模块`}>
        {targets.map((target) => {
          const active = target.id === activeTarget;
          return (
            <button
              key={target.id}
              className="module-tab"
              type="button"
              role="tab"
              aria-selected={active}
              data-active={active ? "true" : "false"}
              data-visible={target.visible ? "true" : "false"}
              onClick={() => onSelect(target.id)}
            >
              <span className="module-status" aria-hidden="true" />
              <span>{target.title}</span>
              {active && <span className="module-edit-mark" aria-hidden="true">✎</span>}
            </button>
          );
        })}
        <button
          className="module-tab module-add-tab"
          type="button"
          role="tab"
          aria-selected={activeTarget === ADD_MODULE_ID}
          data-active={activeTarget === ADD_MODULE_ID ? "true" : "false"}
          onClick={() => onSelect(ADD_MODULE_ID)}
        >
          <span className="module-add-icon" aria-hidden="true">＋</span>
          <span>添加模块</span>
        </button>
      </div>
    </nav>
  );
}

function HeaderEditor({ header, onChange, onPhotoChange, onPhotoError }: {
  header: HeaderData;
  onChange: (key: HeaderTextKey, value: string) => void;
  onPhotoChange: (photo: PhotoData | null) => void;
  onPhotoError: (message: string) => void;
}) {
  const photoInputRef = useRef<HTMLInputElement>(null);

  const importPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const src = await fileToDataUrl(file);
      onPhotoChange({ src, positionX: 50, positionY: 50, zoom: 1 });
    } catch {
      onPhotoError("照片读取失败，请选择 PNG、JPEG 或 WebP 图片。");
    }
  };

  return (
    <section className="editor-card basic-card">
      <header className="card-heading">
        <div><span className="card-index">00</span><div><h3>基本信息</h3><p>页面顶部固定内容</p></div></div>
        <span className="fixed-badge">HEADER</span>
      </header>
      <div className="field-grid header-fields">
        <TextField label="姓名" value={header.name} onChange={(value) => onChange("name", value)} />
        <TextField label="求职方向" value={header.role} onChange={(value) => onChange("role", value)} />
        <TextField label="电话" value={header.phone} onChange={(value) => onChange("phone", value)} />
        <TextField label="邮箱" value={header.email} onChange={(value) => onChange("email", value)} />
        <TextField label="城市" value={header.location} onChange={(value) => onChange("location", value)} />
        <TextField label="主页" value={header.website} onChange={(value) => onChange("website", value)} />
      </div>
      <div className="photo-editor">
        <div className="photo-editor-copy">
          <strong>可选照片</strong>
          <p>上传后通过位置与缩放完成裁剪；没有照片时模板会自动重排。</p>
        </div>
        {header.photo ? (
          <div className="photo-crop-controls">
            <ResumePhoto photo={header.photo} alt="照片裁剪预览" preview />
            <div className="photo-range-stack">
              <RangeField label="水平位置" value={header.photo.positionX} min={0} max={100} step={1} suffix="%" onChange={(value) => onPhotoChange({ ...header.photo!, positionX: value })} />
              <RangeField label="垂直位置" value={header.photo.positionY} min={0} max={100} step={1} suffix="%" onChange={(value) => onPhotoChange({ ...header.photo!, positionY: value })} />
              <RangeField label="缩放" value={header.photo.zoom} min={1} max={2} step={0.05} suffix="×" onChange={(value) => onPhotoChange({ ...header.photo!, zoom: value })} />
            </div>
            <div className="photo-actions">
              <button type="button" onClick={() => photoInputRef.current?.click()}>更换</button>
              <button className="danger-action" type="button" onClick={() => onPhotoChange(null)}>移除</button>
            </div>
          </div>
        ) : (
          <button className="photo-upload-button" type="button" onClick={() => photoInputRef.current?.click()}>
            <span aria-hidden="true">＋</span> 上传并裁剪照片
          </button>
        )}
        <input ref={photoInputRef} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={importPhoto} />
      </div>
    </section>
  );
}

function SectionEditor({ section, index, total, onChange, onMove, onDelete, onEntryChange, onEntryAdd, onEntryMove, onEntryDelete }: {
  section: ResumeSection;
  index: number;
  total: number;
  onChange: (patch: Partial<ResumeSection>) => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
  onEntryChange: (entryId: string, patch: Partial<ResumeEntry>) => void;
  onEntryAdd: () => void;
  onEntryMove: (entryId: string, direction: -1 | 1) => void;
  onEntryDelete: (entryId: string) => void;
}) {
  return (
    <section className={`editor-card${section.visible ? "" : " is-hidden"}`} data-section-editor={section.id}>
      <header className="card-heading">
        <div>
          <span className="card-index">{String(index + 1).padStart(2, "0")}</span>
          <div>
            <input className="section-title-input" aria-label="模块标题" value={section.title} onChange={(event) => onChange({ title: event.target.value })} />
            <p>{section.kind === "text" ? "文本模块" : `${section.entries.length} 个经历条目`}</p>
          </div>
        </div>
        <div className="card-actions">
          <button type="button" aria-label={`上移${section.title}`} disabled={index === 0} onClick={() => onMove(-1)}>↑</button>
          <button type="button" aria-label={`下移${section.title}`} disabled={index === total - 1} onClick={() => onMove(1)}>↓</button>
          <button type="button" onClick={() => onChange({ visible: !section.visible })}>{section.visible ? "隐藏" : "显示"}</button>
          {!section.fixed && <button className="danger-action" type="button" onClick={onDelete}>删除</button>}
        </div>
      </header>

      {section.kind === "text" ? (
        <MarkdownField label="段落内容" value={section.text} onChange={(value) => onChange({ text: value })} />
      ) : (
        <div className="entry-editor-list">
          {section.entries.map((entry, entryIndex) => (
            <EntryEditor
              key={entry.id}
              entry={entry}
              index={entryIndex}
              total={section.entries.length}
              onChange={(patch) => onEntryChange(entry.id, patch)}
              onMove={(direction) => onEntryMove(entry.id, direction)}
              onDelete={() => onEntryDelete(entry.id)}
            />
          ))}
          <button className="add-entry-button" type="button" onClick={onEntryAdd}>＋ 添加条目</button>
        </div>
      )}
    </section>
  );
}

function EntryEditor({ entry, index, total, onChange, onMove, onDelete }: {
  entry: ResumeEntry;
  index: number;
  total: number;
  onChange: (patch: Partial<ResumeEntry>) => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
}) {
  return (
    <section className="entry-editor" data-entry-editor={entry.id}>
      <header>
        <strong>条目 {String(index + 1).padStart(2, "0")}</strong>
        <div className="mini-actions">
          <button type="button" aria-label="上移条目" disabled={index === 0} onClick={() => onMove(-1)}>↑</button>
          <button type="button" aria-label="下移条目" disabled={index === total - 1} onClick={() => onMove(1)}>↓</button>
          <button className="danger-action" type="button" onClick={onDelete}>删除</button>
        </div>
      </header>
      <div className="field-grid entry-fields">
        <TextField label="名称" value={entry.title} onChange={(value) => onChange({ title: value })} />
        <TextField label="角色 / 专业" value={entry.subtitle} onChange={(value) => onChange({ subtitle: value })} />
        <TextField label="开始时间" value={entry.startDate} onChange={(value) => onChange({ startDate: value })} />
        <TextField label="结束时间" value={entry.endDate} onChange={(value) => onChange({ endDate: value })} />
        <TextField label="地点" value={entry.location} onChange={(value) => onChange({ location: value })} />
      </div>
      <MarkdownField label="经历描述" value={entry.details} onChange={(value) => onChange({ details: value })} />
    </section>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="text-field"><span>{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function MarkdownField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const fieldId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyMarkdown = (action: "bold" | "bullet" | "ordered" | "outdent" | "indent") => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    let replaceStart = selectionStart;
    let replaceEnd = selectionEnd;
    let replacement = "";
    let nextSelectionStart = selectionStart;
    let nextSelectionEnd = selectionEnd;

    if (action === "bold") {
      const selected = value.slice(selectionStart, selectionEnd) || "粗体";
      replacement = `**${selected}**`;
      nextSelectionStart = selectionStart + 2;
      nextSelectionEnd = nextSelectionStart + selected.length;
    } else {
      replaceStart = value.lastIndexOf("\n", Math.max(0, selectionStart - 1)) + 1;
      const followingBreak = value.indexOf("\n", selectionEnd);
      replaceEnd = followingBreak === -1 ? value.length : followingBreak;
      const lines = value.slice(replaceStart, replaceEnd).split("\n");
      replacement = lines.map((line, lineIndex) => {
        if (action === "indent") return `  ${line}`;
        if (action === "outdent") return line.replace(/^(?: {1,2}|\t)/, "");
        const indentation = line.match(/^\s*/)?.[0] || "";
        const content = line.slice(indentation.length).replace(/^(?:[-*+]|\d+\.)\s+/, "");
        return `${indentation}${action === "bullet" ? "-" : `${lineIndex + 1}.`} ${content}`;
      }).join("\n");
      nextSelectionStart = replaceStart;
      nextSelectionEnd = replaceStart + replacement.length;
    }

    const nextValue = `${value.slice(0, replaceStart)}${replacement}${value.slice(replaceEnd)}`;
    onChange(nextValue);
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(nextSelectionStart, nextSelectionEnd);
    });
  };

  return (
    <div className="markdown-field">
      <span className="markdown-field-label"><label htmlFor={fieldId}>{label}</label><em>Markdown 内容</em></span>
      <div className="markdown-editor-frame">
        <div className="markdown-toolbar" role="toolbar" aria-label={`${label}格式工具`}>
          <button type="button" aria-label="加粗" title="加粗" onClick={() => applyMarkdown("bold")}><b>B</b></button>
          <button type="button" aria-label="无序列表" title="无序列表" onClick={() => applyMarkdown("bullet")}>•</button>
          <button type="button" aria-label="有序列表" title="有序列表" onClick={() => applyMarkdown("ordered")}>1.</button>
          <span className="toolbar-divider" aria-hidden="true" />
          <button type="button" aria-label="减少缩进" title="减少缩进" onClick={() => applyMarkdown("outdent")}>←</button>
          <button type="button" aria-label="增加缩进" title="增加缩进" onClick={() => applyMarkdown("indent")}>→</button>
          <span className="toolbar-hint">支持 **粗体**、列表、`code` 与链接</span>
        </div>
        <textarea ref={textareaRef} id={fieldId} aria-label={label} spellCheck={false} value={value} onChange={(event) => onChange(event.target.value)} />
      </div>
    </div>
  );
}

function TemplatePicker({ activeTemplate, onSelect }: { activeTemplate: TemplateId; onSelect: (templateId: TemplateId) => void }) {
  return (
    <div className="template-picker" role="radiogroup" aria-label="简历模板">
      {TEMPLATE_IDS.map((templateId) => {
        const template = RESUME_TEMPLATES[templateId];
        return (
          <button
            key={templateId}
            className="template-option"
            type="button"
            role="radio"
            aria-checked={activeTemplate === templateId}
            data-active={activeTemplate === templateId ? "true" : "false"}
            data-template-card={templateId}
            onClick={() => onSelect(templateId)}
          >
            <span className="template-miniature" aria-hidden="true">
              <i className="mini-name" />
              <i className="mini-photo" />
              <i className="mini-rule" />
              <i className="mini-section one" />
              <i className="mini-section two" />
              <i className="mini-section three" />
            </span>
            <span className="template-copy">
              <b>{template.name}</b>
              <small>{template.description}</small>
            </span>
            <span className="template-check" aria-hidden="true">✓</span>
          </button>
        );
      })}
    </div>
  );
}

function ResumePage({ pageIndex, blockIds, resume, templateId, style }: {
  pageIndex: number;
  blockIds: string[];
  resume: ResumeDocument;
  templateId: TemplateId;
  style: CSSProperties;
}) {
  const visibleSections = resume.sections.filter((section) => section.visible);
  return (
    <article
      className="resume-page"
      style={style}
      data-page={pageIndex + 1}
      data-template={templateId}
      data-has-photo={resume.header.photo ? "true" : "false"}
    >
      {blockIds.map((blockId) => {
        if (blockId === HEADER_BLOCK_ID) return <ResumeHeader key={blockId} header={resume.header} />;
        const section = resume.sections.find((candidate) => candidate.id === blockId);
        return section ? <ResumeSectionView key={section.id} section={section} index={visibleSections.findIndex((candidate) => candidate.id === section.id)} /> : null;
      })}
      <span className="page-number" aria-hidden="true">{String(pageIndex + 1).padStart(2, "0")}</span>
    </article>
  );
}

function ResumeHeader({ header, measure = false }: { header: HeaderData; measure?: boolean }) {
  return (
    <header className="resume-header" data-part="header" data-block-id={measure ? HEADER_BLOCK_ID : undefined}>
      <div className="name-lockup">
        <h2>{header.name || "你的姓名"}</h2>
        <p className="resume-role">{header.role || "目标职位"}</p>
      </div>
      <div className="resume-photo-slot">
        {header.photo && <ResumePhoto photo={header.photo} alt={`${header.name || "候选人"}的照片`} />}
      </div>
      <div className="resume-contact" data-part="contacts">
        {header.phone && <ContactItem kind="phone" label="手机" value={header.phone} />}
        {header.email && <ContactItem kind="email" label="邮箱" value={header.email} />}
        {header.location && <ContactItem kind="location" label="地点" value={header.location} />}
        {header.website && <ContactItem kind="website" label="主页" value={header.website} />}
      </div>
    </header>
  );
}

function ResumePhoto({ photo, alt, preview = false }: { photo: PhotoData; alt: string; preview?: boolean }) {
  const style = {
    "--photo-x": `${photo.positionX}%`,
    "--photo-y": `${photo.positionY}%`,
    "--photo-zoom": photo.zoom,
  } as CSSProperties;
  // Data URLs are user-owned local assets; Next Image cannot optimize them without changing export behavior.
  // eslint-disable-next-line @next/next/no-img-element
  return <span className={`resume-photo${preview ? " is-preview" : ""}`} style={style}><img src={photo.src} alt={alt} /></span>;
}

function ContactItem({ kind, label, value }: { kind: "phone" | "email" | "location" | "website"; label: string; value: string }) {
  return (
    <span className="contact-item" data-contact={kind}>
      <i className="contact-icon" aria-hidden="true" />
      <b>{label}：</b>
      <span>{value}</span>
    </span>
  );
}

const SECTION_KICKERS: Record<string, string> = {
  summary: "PROFILE",
  skills: "SKILLS",
  work: "EXPERIENCE",
  internship: "INTERNSHIP",
  projects: "PROJECTS",
  education: "EDUCATION",
  honors: "HONORS",
};

const SECTION_ICONS: Record<string, string> = {
  summary: "●",
  skills: "</>",
  work: "▣",
  internship: "▣",
  projects: "◆",
  education: "◆",
  honors: "★",
};

function ResumeSectionView({ section, index, measure = false }: { section: ResumeSection; index: number; measure?: boolean }) {
  return (
    <section
      className="resume-section"
      data-part="section"
      data-section-id={section.id}
      data-section-kind={section.kind}
      data-block-id={measure ? section.id : undefined}
    >
      <div className="section-rail" data-part="section-heading">
        <span className="section-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
        <span className="section-icon" aria-hidden="true">{SECTION_ICONS[section.id] || "＋"}</span>
        <h3>{section.title}</h3>
        <span className="section-kicker">{SECTION_KICKERS[section.id] || (section.kind === "entries" ? "EXPERIENCE" : "PROFILE")}</span>
      </div>
      <div className="section-content">
        {section.kind === "text"
          ? <MarkdownBlocks value={section.text} />
          : section.entries.map((entry) => <ResumeEntryView key={entry.id} entry={entry} />)}
      </div>
    </section>
  );
}

function ResumeEntryView({ entry }: { entry: ResumeEntry }) {
  const dates = [entry.startDate, entry.endDate].filter(Boolean).join(" — ");
  return (
    <article className="resume-entry">
      <div className="entry-heading">
        <div className="entry-title-group">
          <strong>{entry.title || "未命名"}</strong>
          {entry.subtitle && <span>{entry.subtitle}</span>}
        </div>
        <div className="entry-meta">
          {dates && <span>{dates}</span>}
          {entry.location && <em>{entry.location}</em>}
        </div>
      </div>
      <MarkdownBlocks value={entry.details} />
    </article>
  );
}

function MarkdownBlocks({ value }: { value: string }) {
  const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const blocks: ReactNode[] = [];
  let listType: "ul" | "ol" | null = null;
  let listItems: string[] = [];

  const flushList = () => {
    if (!listType || listItems.length === 0) return;
    const items = listItems;
    const key = `list-${blocks.length}`;
    blocks.push(listType === "ol"
      ? <ol className="compact-list" key={key}>{items.map((line, index) => <li key={`${line}-${index}`}>{renderInlineMarkdown(line)}</li>)}</ol>
      : <ul className="compact-list" key={key}>{items.map((line, index) => <li key={`${line}-${index}`}>{renderInlineMarkdown(line)}</li>)}</ul>);
    listType = null;
    listItems = [];
  };

  lines.forEach((line) => {
    const unordered = line.match(/^[-*]\s+(.+)$/);
    const ordered = line.match(/^\d+[.)]\s+(.+)$/);
    const nextType = ordered ? "ol" : unordered ? "ul" : null;
    if (nextType) {
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      listItems.push((ordered || unordered)![1]);
    } else {
      flushList();
      blocks.push(<p key={`p-${blocks.length}`}>{renderInlineMarkdown(line)}</p>);
    }
  });
  flushList();
  return <div className="resume-prose">{blocks}</div>;
}

function RangeField({ label, value, min, max, step, suffix, onChange }: { label: string; value: number; min: number; max: number; step: number; suffix: string; onChange: (value: number) => void }) {
  return (
    <label className="range-field">
      <span>{label}<output>{value}{suffix}</output></span>
      <input type="range" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function parseLegacyMarkdown(markdown: string, layout: LayoutData): ResumeDocument {
  const header: HeaderData = { name: "", role: "", phone: "", email: "", location: "", website: "", photo: null };
  const sections: ResumeSection[] = [];
  let currentSection: ResumeSection | null = null;
  let currentEntry: ResumeEntry | null = null;
  let reachedSections = false;

  markdown.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith("<!--")) return;
    const nameMatch = line.match(/^#\s+(.+)$/);
    if (nameMatch && !line.startsWith("##")) { header.name = stripInlineMarkdown(nameMatch[1]); return; }
    const sectionMatch = line.match(/^##\s+(.+)$/);
    if (sectionMatch && !line.startsWith("###")) {
      reachedSections = true;
      const title = stripInlineMarkdown(sectionMatch[1]);
      currentSection = { id: uniqueSectionId(title, sections), title, kind: "text", visible: true, fixed: Boolean(FIXED_SECTION_IDS[title]), text: "", entries: [] };
      sections.push(currentSection);
      currentEntry = null;
      return;
    }
    const entryMatch = line.match(/^###\s+(.+)$/);
    if (entryMatch && currentSection) {
      currentSection.kind = "entries";
      currentEntry = parseEntryHeading(entryMatch[1], currentSection.entries.length);
      currentSection.entries.push(currentEntry);
      return;
    }
    if (!reachedSections) {
      if (line.startsWith(">")) header.role = line.replace(/^>\s*/, "");
      else if (line.includes("|")) parseContacts(line, header);
      return;
    }
    if (!currentSection) return;
    if (currentEntry) currentEntry.details = currentEntry.details ? `${currentEntry.details}\n${line}` : line;
    else currentSection.text = currentSection.text ? `${currentSection.text}\n${line}` : line;
  });

  return { version: 3, header, presentation: createPresentation(DEFAULT_TEMPLATE_ID, layout), sections };
}

function parseEntryHeading(value: string, index: number): ResumeEntry {
  const parts = value.split(/\s+\|\s+/).map((part) => part.trim());
  const [startDate, endDate] = splitDateRange(parts[2] || "");
  return { id: `entry-${index}-${slugify(parts[0] || "item")}`, title: parts[0] || "未命名条目", subtitle: parts[1] || "", startDate, endDate, location: parts[3] || "", details: "" };
}

function parseContacts(value: string, header: HeaderData) {
  value.split("|").map((item) => item.trim()).filter(Boolean).forEach((item) => {
    if (item.includes("@")) header.email = item;
    else if (/https?:\/\/|github\.|\.com\b|\.dev\b|\.io\b/i.test(item)) header.website = item;
    else if (/\d{5,}/.test(item.replace(/\s/g, ""))) header.phone = item;
    else if (!header.location) header.location = item;
  });
}

function resumeToMarkdown(resume: ResumeDocument) {
  const contacts = [resume.header.phone, resume.header.email, resume.header.location, resume.header.website].filter(Boolean).join(" | ");
  const body = resume.sections.filter((section) => section.visible).map((section) => {
    const heading = `## ${section.title}`;
    if (section.kind === "text") return `${heading}\n${section.text}`;
    const entries = section.entries.map((entry) => {
      const dates = [entry.startDate, entry.endDate].filter(Boolean).join(" - ");
      const meta = [entry.title, entry.subtitle, dates, entry.location].filter(Boolean).join(" | ");
      return `### ${meta}${entry.details ? `\n${entry.details}` : ""}`;
    }).join("\n\n");
    return `${heading}\n${entries}`;
  }).join("\n\n");
  return `# ${resume.header.name}\n> ${resume.header.role}\n\n${contacts}\n\n${body}`.trim();
}

function renderInlineMarkdown(value: string): ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  return value.split(pattern).filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link && isSafeLink(link[2])) return <a key={index} href={link[2]}>{link[1]}</a>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}

function normalizeResume(value: unknown): ResumeDocument {
  if (!value || typeof value !== "object") throw new Error("Invalid resume");
  const candidate = value as {
    header?: Partial<HeaderData> & { photo?: unknown };
    layout?: Partial<LayoutData>;
    presentation?: { activeTemplate?: unknown; layouts?: Partial<Record<TemplateId, Partial<LayoutData>>> };
    sections?: Array<Partial<ResumeSection> & { entries?: Array<Partial<ResumeEntry> & { details?: unknown }> }>;
  };
  if (!candidate.header || !Array.isArray(candidate.sections)) throw new Error("Invalid resume");
  const activeTemplate = isTemplateId(candidate.presentation?.activeTemplate) ? candidate.presentation.activeTemplate : DEFAULT_TEMPLATE_ID;
  const layouts = Object.fromEntries(TEMPLATE_IDS.map((templateId) => [
    templateId,
    normalizeLayout(candidate.presentation?.layouts?.[templateId] || RESUME_TEMPLATES[templateId].defaultLayout),
  ])) as Record<TemplateId, LayoutData>;
  if (candidate.layout) layouts[activeTemplate] = normalizeLayout(candidate.layout);
  return {
    version: 3,
    header: {
      name: String(candidate.header.name || ""), role: String(candidate.header.role || ""), phone: String(candidate.header.phone || ""),
      email: String(candidate.header.email || ""), location: String(candidate.header.location || ""), website: String(candidate.header.website || ""),
      photo: normalizePhoto(candidate.header.photo),
    },
    presentation: { activeTemplate, layouts },
    sections: candidate.sections.map((section, sectionIndex) => ({
      id: String(section.id || `section-${sectionIndex}`), title: String(section.title || "未命名模块"), kind: section.kind === "entries" ? "entries" : "text",
      visible: section.visible !== false, fixed: Boolean(section.fixed), text: String(section.text || ""),
      entries: Array.isArray(section.entries) ? section.entries.map((entry, entryIndex) => ({
        id: String(entry.id || `entry-${entryIndex}`), title: String(entry.title || ""), subtitle: String(entry.subtitle || ""),
        startDate: String(entry.startDate || ""), endDate: String(entry.endDate || ""), location: String(entry.location || ""),
        details: Array.isArray(entry.details) ? entry.details.map((line) => `- ${String(line)}`).join("\n") : String(entry.details || ""),
      })) : [],
    })),
  };
}

function normalizePhoto(value: unknown): PhotoData | null {
  if (!value || typeof value !== "object") return null;
  const photo = value as Partial<PhotoData>;
  if (typeof photo.src !== "string" || !photo.src.startsWith("data:image/")) return null;
  return {
    src: photo.src,
    positionX: clamp(numberOr(photo.positionX, 50), 0, 100),
    positionY: clamp(numberOr(photo.positionY, 50), 0, 100),
    zoom: clamp(numberOr(photo.zoom, 1), 1, 2),
  };
}

function createPresentation(activeTemplate: TemplateId, activeLayout?: LayoutData): ResumeDocument["presentation"] {
  const layouts = Object.fromEntries(TEMPLATE_IDS.map((templateId) => [
    templateId,
    { ...RESUME_TEMPLATES[templateId].defaultLayout },
  ])) as Record<TemplateId, LayoutData>;
  if (activeLayout) layouts[activeTemplate] = normalizeLayout(activeLayout);
  return { activeTemplate, layouts };
}

function normalizeLayout(value: Partial<LayoutData>): LayoutData {
  return {
    fontSize: numberOr(value.fontSize, DEFAULT_LAYOUT.fontSize), lineHeight: numberOr(value.lineHeight, DEFAULT_LAYOUT.lineHeight),
    marginX: numberOr(value.marginX, DEFAULT_LAYOUT.marginX), marginY: numberOr(value.marginY, DEFAULT_LAYOUT.marginY),
    sectionGap: numberOr(value.sectionGap, DEFAULT_LAYOUT.sectionGap),
  };
}

function createBlankEntry(): ResumeEntry {
  return { id: makeId("entry"), title: "新条目", subtitle: "角色 / 专业", startDate: "2026.01", endDate: "至今", location: "", details: "1. 第一条描述\n2. 第二条描述" };
}

function moveItem<T extends { id: string }>(items: T[], id: string, direction: -1 | 1) {
  const index = items.findIndex((item) => item.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function uniqueSectionId(title: string, sections: ResumeSection[]) {
  const base = FIXED_SECTION_IDS[title] || `custom-${slugify(title)}`;
  let id = base;
  let suffix = 2;
  while (sections.some((section) => section.id === id)) id = `${base}-${suffix++}`;
  return id;
}

function splitDateRange(value: string): [string, string] {
  const parts = value.split(/\s+(?:-|–|—|~|至)\s+/).map((part) => part.trim()).filter(Boolean);
  return parts.length >= 2 ? [parts[0], parts.slice(1).join(" ")] : [value, ""];
}

function stripInlineMarkdown(value: string) {
  return value.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1").replace(/`([^`]+)`/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

function isSafeLink(value: string) { return /^(https?:\/\/|mailto:)/i.test(value); }

function downloadText(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function fileToDataUrl(file: File) {
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Invalid image"));
    reader.onerror = () => reject(reader.error || new Error("Unable to read image"));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("Unable to decode image"));
    element.src = source;
  });
  const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.88);
}

function numberOr(value: unknown, fallback: number) { return typeof value === "number" && Number.isFinite(value) ? value : fallback; }
function clamp(value: number, minimum: number, maximum: number) { return Math.min(maximum, Math.max(minimum, value)); }
function makeId(prefix: string) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`; }
const mmToPx = (millimeters: number) => millimeters * 96 / 25.4;
const slugify = (value: string) => value.trim().replace(/\s+/g, "-").replace(/[\\/:*?"<>|]/g, "") || "resume";
