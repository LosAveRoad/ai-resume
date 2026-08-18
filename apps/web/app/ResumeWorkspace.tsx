"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ResumeEditor, createBlankResume, createShowcaseResume, type ResumeDocument } from "./ResumeEditor";

const LIBRARY_KEY = "ai-resume.library.v1";
const LEGACY_DOCUMENT_KEY = "ai-resume.structured.v3";

type SavedResume = {
  id: string;
  title: string;
  role: string;
  updatedAt: string;
  resume: ResumeDocument;
};

type StarterKind = "blank" | "agent" | "backend";

const STARTERS: Array<{ kind: StarterKind; label: string; description: string; tone: string }> = [
  { kind: "blank", label: "空白简历", description: "从结构化基础模块开始", tone: "blank" },
  { kind: "agent", label: "Agent 工程师", description: "工作流、RAG、工具与评测", tone: "agent" },
  { kind: "backend", label: "后端工程师", description: "服务治理、任务与分布式系统", tone: "backend" },
];

export function ResumeWorkspace() {
  const [records, setRecords] = useState<SavedResume[]>([]);
  const [activeId, setActiveId] = useState<string | null>(() => (
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("resume")
  ));
  const [cliMode, setCliMode] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("editor") === "1") return;

    const resumeId = params.get("resume");
    window.history.replaceState(
      { ...window.history.state, aiResumeView: resumeId ? "editor" : "home", resumeId },
      "",
      window.location.href,
    );
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as { aiResumeView?: string; resumeId?: string } | null;
      setActiveId(state?.aiResumeView === "editor" && state.resumeId ? state.resumeId : null);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.get("editor") === "1") {
          setCliMode(true);
          return;
        }

        const stored = localStorage.getItem(LIBRARY_KEY);
        let nextRecords = stored ? normalizeLibrary(JSON.parse(stored)) : [];
        if (nextRecords.length === 0) {
          const legacy = localStorage.getItem(LEGACY_DOCUMENT_KEY);
          if (legacy) {
            const resume = JSON.parse(legacy) as ResumeDocument;
            nextRecords = [createRecord(resume, resume.header.name || "迁移的简历")];
            localStorage.setItem(LIBRARY_KEY, JSON.stringify(nextRecords));
          }
        }
        setRecords(nextRecords);
      } catch {
        setRecords([]);
      } finally {
        setHydrated(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated || cliMode) return;
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(records));
  }, [cliMode, hydrated, records]);

  const activeRecord = useMemo(
    () => records.find((record) => record.id === activeId) ?? null,
    [activeId, records],
  );

  const updateActiveResume = useCallback((resume: ResumeDocument) => {
    setRecords((current) => current.map((record) => record.id === activeId ? {
      ...record,
      title: resume.header.name || record.title || "未命名简历",
      role: resume.header.role || "未设置求职方向",
      updatedAt: new Date().toISOString(),
      resume,
    } : record));
  }, [activeId]);

  const openResume = useCallback((resumeId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.delete("editor");
    url.searchParams.set("resume", resumeId);
    url.hash = "";
    window.history.pushState({ aiResumeView: "editor", resumeId }, "", url);
    setActiveId(resumeId);
  }, []);

  const returnHome = useCallback(() => {
    const state = window.history.state as { aiResumeView?: string } | null;
    if (state?.aiResumeView === "editor") {
      window.history.back();
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("resume");
    url.hash = "top";
    window.history.replaceState({ aiResumeView: "home" }, "", url);
    setActiveId(null);
  }, []);

  const createResume = (kind: StarterKind) => {
    const resume = kind === "blank" ? createBlankResume() : createShowcaseResume(kind);
    if (kind === "blank") resume.header.name = "未命名简历";
    const record = createRecord(resume, kind === "blank" ? "未命名简历" : `${kind === "agent" ? "Agent" : "后端"}方向简历`);
    setRecords((current) => [record, ...current]);
    openResume(record.id);
  };

  const deleteResume = (record: SavedResume) => {
    if (!window.confirm(`确定删除“${record.title}”吗？此操作无法撤回。`)) return;
    setRecords((current) => current.filter((candidate) => candidate.id !== record.id));
  };

  if (cliMode) return <ResumeEditor />;
  if (activeRecord) {
    return <ResumeEditor key={activeRecord.id} initialResume={activeRecord.resume} onResumeChange={updateActiveResume} onBack={returnHome} />;
  }

  return (
    <main className="workspace-home">
      <header className="workspace-nav">
        <a className="workspace-brand" href="#top" aria-label="AI Resume 首页">
          {/* Generated with OpenAI ImageGen and stored locally. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ai-resume-logo.png" alt="" aria-hidden="true" />
          <span><b>AI Resume</b><small>LOCAL-FIRST RESUME STUDIO</small></span>
        </a>
        <nav aria-label="首页导航">
          <a href="#resumes">我的简历</a>
          <a href="#starters">新建简历</a>
          <a href="https://github.com/LosAveRoad/ai-resume">GitHub ↗</a>
        </nav>
      </header>

      <section id="top" className="workspace-hero">
        <div className="workspace-hero-copy">
          <p className="workspace-kicker"><span /> LOCAL FIRST · AGENT READY</p>
          <h1>把简历写作，变成<br /><em>可验证的工程流程。</em></h1>
          <p className="workspace-lead">结构化内容、A4 实时分页、视觉迭代与确定性 PDF 导出。所有素材留在本地，Coding Agent 可以安全地读写、渲染和检查。</p>
          <div className="workspace-hero-actions">
            <button type="button" onClick={() => createResume("blank")}>＋ 新建简历</button>
            <a href="#resumes">查看我的简历 <span>↓</span></a>
          </div>
          <dl className="workspace-metrics">
            <div><dt>3</dt><dd>内置 A4 模板</dd></div>
            <div><dt>100%</dt><dd>浏览器本地保存</dd></div>
            <div><dt>CLI</dt><dd>Agent 原生工作流</dd></div>
          </dl>
        </div>
        <div className="workspace-hero-visual" aria-label="AI Resume 产品预览">
          <div className="hero-orbit one" />
          <div className="hero-orbit two" />
          <div className="hero-document">
            <div className="hero-document-head"><i /><span><b /><small /></span></div>
            <div className="hero-document-rule" />
            <div className="hero-document-section"><strong>01</strong><span><b /><i /><i /></span></div>
            <div className="hero-document-section"><strong>02</strong><span><b /><i /><i /><i /></span></div>
            <div className="hero-document-section"><strong>03</strong><span><b /><i /><i /><i /></span></div>
          </div>
          <div className="hero-badge utilization"><b>95%</b><span>页面利用率</span></div>
          <div className="hero-badge local"><i /> 数据保存在本地</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="hero-logo" src="/ai-resume-logo.png" alt="" aria-hidden="true" />
        </div>
      </section>

      <section id="resumes" className="workspace-section resume-library">
        <div className="workspace-section-heading">
          <div><p>YOUR WORKSPACE</p><h2>我的简历</h2></div>
          <button type="button" onClick={() => createResume("blank")}>＋ 新建简历</button>
        </div>

        {records.length > 0 ? (
          <div className="resume-card-grid">
            {records.map((record, index) => (
              <article className="resume-card" key={record.id}>
                <button className="resume-card-open" type="button" onClick={() => openResume(record.id)} aria-label={`打开${record.title}`}>
                  <div className={`resume-card-preview tone-${index % 3}`}>
                    <span className="preview-name" />
                    <span className="preview-role" />
                    <i /><i /><i /><i />
                  </div>
                  <div className="resume-card-copy">
                    <span className="resume-card-state"><i /> 已保存在本地</span>
                    <h3>{record.title}</h3>
                    <p>{record.role || "未设置求职方向"}</p>
                    <small>更新于 {formatUpdatedAt(record.updatedAt)}</small>
                  </div>
                </button>
                <div className="resume-card-actions">
                  <button type="button" onClick={() => openResume(record.id)}>继续编辑</button>
                  <button type="button" onClick={() => deleteResume(record)} aria-label={`删除${record.title}`}>删除</button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="workspace-empty">
            <div className="empty-mark">＋</div>
            <h3>还没有简历</h3>
            <p>从空白文档开始，或使用下面的岗位模板快速建立第一份结构化简历。</p>
            <button type="button" onClick={() => createResume("blank")}>创建第一份简历</button>
          </div>
        )}
      </section>

      <section id="starters" className="workspace-section starter-section">
        <div className="workspace-section-heading">
          <div><p>START WITH STRUCTURE</p><h2>选择一个起点</h2></div>
          <span>任何模板都可以随时切换视觉样式</span>
        </div>
        <div className="starter-grid">
          {STARTERS.map((starter, index) => (
            <button type="button" className={`starter-card starter-${starter.tone}`} key={starter.kind} onClick={() => createResume(starter.kind)}>
              <span className="starter-index">0{index + 1}</span>
              <div className="starter-sheet"><i /><i /><i /><i /></div>
              <div className="starter-copy">
                <h3>{starter.label}</h3>
                <p>{starter.description}</p>
                <span className="starter-action">开始创建 →</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <footer className="workspace-footer">
        <div className="workspace-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ai-resume-logo.png" alt="" aria-hidden="true" />
          <span><b>AI Resume</b><small>OPEN SOURCE · LOCAL FIRST</small></span>
        </div>
        <p>内容属于你，排版可以验证，导出保持确定。</p>
      </footer>
    </main>
  );
}

function createRecord(resume: ResumeDocument, fallbackTitle: string): SavedResume {
  return {
    id: `resume-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    title: resume.header.name || fallbackTitle,
    role: resume.header.role || "未设置求职方向",
    updatedAt: new Date().toISOString(),
    resume,
  };
}

function normalizeLibrary(value: unknown): SavedResume[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is SavedResume => Boolean(
    item && typeof item === "object" && "id" in item && "resume" in item && "updatedAt" in item,
  ));
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}
