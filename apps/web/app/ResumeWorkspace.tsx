"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ResumeEditor, createBlankResume, createShowcaseResume, type ResumeDocument } from "./ResumeEditor";

const RESUMES_API = "/api/resumes";
const MATERIALS_API = "/api/materials";
const WORKSPACE_API = "/api/workspace";

type SavedResume = {
  id: string;
  title: string;
  role: string;
  updatedAt: string;
  revision?: string;
  resume: ResumeDocument;
};

type SaveState = "loading" | "saved" | "saving" | "error" | "conflict";

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
  const [materials, setMaterials] = useState("");
  const [materialsRevision, setMaterialsRevision] = useState<string | undefined>();
  const [saveState, setSaveState] = useState<SaveState>("loading");
  const [materialsSaveState, setMaterialsSaveState] = useState<SaveState>("saved");
  const recordsRef = useRef<SavedResume[]>([]);
  const saveTimersRef = useRef(new Map<string, number>());
  const materialsTimerRef = useRef<number | undefined>();

  const setRecordsAndRef = useCallback((next: SavedResume[] | ((current: SavedResume[]) => SavedResume[])) => {
    const resolved = typeof next === "function" ? next(recordsRef.current) : next;
    recordsRef.current = resolved;
    setRecords(resolved);
  }, []);

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
    let cancelled = false;
    const loadWorkspace = async () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("editor") === "1") {
        setCliMode(true);
        return;
      }

      try {
        const response = await fetch(WORKSPACE_API, { cache: "no-store" });
        if (!response.ok) throw new Error(`workspace API ${response.status}`);
        const workspace = await response.json() as { resumes?: unknown; materials?: string; materialsRevision?: string };
        const nextRecords = normalizeLibrary(workspace.resumes);
        if (!cancelled) {
          setRecordsAndRef(nextRecords);
          setMaterials(typeof workspace.materials === "string" ? workspace.materials : "");
          setMaterialsRevision(typeof workspace.materialsRevision === "string" ? workspace.materialsRevision : undefined);
          setSaveState("saved");
        }
      } catch {
        if (!cancelled) setSaveState("error");
      }
    };
    void loadWorkspace();
    return () => { cancelled = true; };
  }, [setRecordsAndRef]);

  const activeRecord = useMemo(
    () => records.find((record) => record.id === activeId) ?? null,
    [activeId, records],
  );

  const queueResumeSave = useCallback((resumeId: string, resume: ResumeDocument) => {
    const existing = saveTimersRef.current.get(resumeId);
    if (existing !== undefined) window.clearTimeout(existing);
    setSaveState("saving");
    const timer = window.setTimeout(async () => {
      const record = recordsRef.current.find((candidate) => candidate.id === resumeId);
      if (!record) return;
      try {
        const response = await fetch(`${RESUMES_API}/${encodeURIComponent(resumeId)}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ resume, revision: record.revision }),
        });
        if (response.status === 409) {
          setSaveState("conflict");
          return;
        }
        if (!response.ok) throw new Error(`resume save ${response.status}`);
        const saved = await response.json() as SavedResume;
        setRecordsAndRef((current) => current.map((candidate) => candidate.id === resumeId ? saved : candidate));
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 350);
    saveTimersRef.current.set(resumeId, timer);
  }, [setRecordsAndRef]);

  const updateActiveResume = useCallback((resume: ResumeDocument) => {
    const current = recordsRef.current;
    const nextRecords = current.map((record) => record.id === activeId ? {
      ...record,
      title: resume.title || record.title || "未命名简历",
      role: resume.header.role || "未设置求职方向",
      updatedAt: new Date().toISOString(),
      resume,
    } : record);
    setRecordsAndRef(nextRecords);
    if (activeId) queueResumeSave(activeId, resume);
  }, [activeId, queueResumeSave, setRecordsAndRef]);

  const updateMaterials = useCallback((value: string) => {
    setMaterials(value);
    setMaterialsSaveState("saving");
    if (materialsTimerRef.current !== undefined) window.clearTimeout(materialsTimerRef.current);
    materialsTimerRef.current = window.setTimeout(async () => {
      try {
        const response = await fetch(MATERIALS_API, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ content: value, revision: materialsRevision }),
        });
        if (response.status === 409) {
          setMaterialsSaveState("conflict");
          return;
        }
        if (!response.ok) throw new Error(`materials save ${response.status}`);
        const saved = await response.json() as { revision?: string };
        setMaterialsRevision(saved.revision);
        setMaterialsSaveState("saved");
      } catch {
        setMaterialsSaveState("error");
      }
    }, 400);
  }, [materialsRevision]);

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

  const createResume = async (kind: StarterKind) => {
    const resume = kind === "blank" ? createBlankResume() : createShowcaseResume(kind);
    if (kind === "blank") resume.header.name = "未命名简历";
    try {
      const response = await fetch(RESUMES_API, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ resume }),
      });
      if (!response.ok) throw new Error(`resume create ${response.status}`);
      const record = await response.json() as SavedResume;
      setRecordsAndRef((current) => [record, ...current]);
      setSaveState("saved");
      openResume(record.id);
    } catch {
      setSaveState("error");
    }
  };

  const deleteResume = async (record: SavedResume) => {
    if (!window.confirm(`确定删除“${record.title}”吗？此操作无法撤回。`)) return;
    try {
      const response = await fetch(`${RESUMES_API}/${encodeURIComponent(record.id)}`, {
        method: "DELETE",
        headers: record.revision ? { "if-match": record.revision } : undefined,
      });
      if (!response.ok) throw new Error(`resume delete ${response.status}`);
      setRecordsAndRef((current) => current.filter((candidate) => candidate.id !== record.id));
    } catch {
      setSaveState("error");
    }
  };

  const cloneResume = async (record: SavedResume) => {
    const title = window.prompt("新版本名称", `${record.title} · 新岗位`);
    if (!title?.trim()) return;
    try {
      const response = await fetch(`${RESUMES_API}/${encodeURIComponent(record.id)}/clone`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });
      if (!response.ok) throw new Error(`resume clone ${response.status}`);
      const copy = await response.json() as SavedResume;
      setRecordsAndRef((current) => [copy, ...current]);
      openResume(copy.id);
    } catch {
      setSaveState("error");
    }
  };

  const exportActiveResume = useCallback(async () => {
    const resumeId = activeId;
    const record = resumeId ? recordsRef.current.find((candidate) => candidate.id === resumeId) : undefined;
    if (!resumeId || !record) return;
    setSaveState("saving");
    try {
      const response = await fetch(`${RESUMES_API}/${encodeURIComponent(resumeId)}/export`, {
        method: "POST",
        headers: record.revision ? { "if-match": record.revision } : undefined,
      });
      if (response.status === 409) {
        setSaveState("conflict");
        return;
      }
      if (!response.ok) throw new Error(`resume export ${response.status}`);
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = `${resumeId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }, [activeId]);

  if (cliMode) return <ResumeEditor />;
  if (activeRecord) {
    return <ResumeEditor key={activeRecord.id} initialResume={activeRecord.resume} onResumeChange={updateActiveResume} onBack={returnHome} onExport={exportActiveResume} saveState={saveState} />;
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
          <a href="#materials">素材库</a>
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
            <div><dt>100%</dt><dd>本地工作区保存</dd></div>
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
                    <span className="resume-card-state"><i /> 本地工作区</span>
                    <h3>{record.title}</h3>
                    <p>{record.role || "未设置求职方向"}</p>
                    <small>更新于 {formatUpdatedAt(record.updatedAt)}</small>
                  </div>
                </button>
                <div className="resume-card-actions">
                  <button type="button" onClick={() => openResume(record.id)}>继续编辑</button>
                  <button type="button" onClick={() => cloneResume(record)}>复制版本</button>
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

      <section id="materials" className="workspace-section materials-section">
        <div className="workspace-section-heading">
          <div><p>FACT BANK</p><h2>素材库</h2></div>
          <span>{saveStateLabel(materialsSaveState)}</span>
        </div>
        <p className="materials-lead">把经历、项目、指标和链接记录在这里。Coding Agent 会把它作为事实边界，网页和 CLI 共享同一份 Markdown 文件。</p>
        <textarea
          aria-label="素材库 Markdown"
          className="materials-editor"
          value={materials}
          onChange={(event) => updateMaterials(event.target.value)}
          placeholder="# 我的素材\n\n- 项目：\n- 事实与指标：\n- 链接："
          spellCheck={false}
        />
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

function normalizeLibrary(value: unknown): SavedResume[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is SavedResume => Boolean(
    item && typeof item === "object" && "id" in item && "resume" in item && "updatedAt" in item,
  )).map((item) => ({
    ...item,
    revision: typeof item.revision === "string" ? item.revision : undefined,
    title: item.title || item.resume.title || item.resume.header.name || "未命名简历",
    resume: { ...item.resume, title: item.resume.title || item.title || item.resume.header.name || "未命名简历" },
  }));
}

function saveStateLabel(state: SaveState) {
  return {
    loading: "载入中",
    saved: "已保存到 ./airesume",
    saving: "保存中…",
    error: "保存失败，请检查本地服务",
    conflict: "文件已被 Agent 修改，请重新载入",
  }[state];
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}
