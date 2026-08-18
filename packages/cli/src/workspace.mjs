import { createHash, randomUUID } from "node:crypto";
import { access, mkdir, readFile, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export const DEFAULT_WORKSPACE_PATH = "airesume";
const WORKSPACE_VERSION = 1;

export class WorkspaceConflictError extends Error {
  constructor(message = "workspace changed since it was read") {
    super(message);
    this.name = "WorkspaceConflictError";
    this.code = "WORKSPACE_CONFLICT";
  }
}

export class WorkspaceNotFoundError extends Error {
  constructor(message = "workspace item not found") {
    super(message);
    this.name = "WorkspaceNotFoundError";
    this.code = "WORKSPACE_NOT_FOUND";
  }
}

export function resolveWorkspacePath(input = DEFAULT_WORKSPACE_PATH, cwd = process.cwd()) {
  return resolve(cwd, input);
}

export async function ensureWorkspace(workspaceRoot, options = {}) {
  const root = resolve(workspaceRoot);
  await mkdir(resolve(root, "resumes"), { recursive: true });
  await mkdir(resolve(root, "output"), { recursive: true });
  const workspaceFile = resolve(root, "workspace.json");
  try {
    await access(workspaceFile);
  } catch {
    await writeFile(workspaceFile, `${JSON.stringify({ version: WORKSPACE_VERSION }, null, 2)}\n`, "utf8");
  }

  const legacyRoot = options.legacyRoot ? resolve(options.legacyRoot) : resolve(dirname(root), ".ai-resume-data");
  await migrateLegacyWorkspace(root, legacyRoot);
  return root;
}

export async function readWorkspace(workspaceRoot, options = {}) {
  const root = await ensureWorkspace(workspaceRoot, options);
  const files = await listResumeFiles(root);
  const resumes = [];
  for (const file of files) {
    try {
      resumes.push(await readResumeRecord(root, file.slice(0, -5)));
    } catch (error) {
      if (error?.code !== "ENOENT") process.stderr.write(`resume read failed for ${file}: ${error}\n`);
    }
  }
  resumes.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const materials = await readMaterials(root);
  return {
    version: WORKSPACE_VERSION,
    resumes,
    materials: materials.content,
    materialsRevision: materials.revision,
  };
}

export async function readResumeRecord(workspaceRoot, id) {
  const root = resolve(workspaceRoot);
  const file = resumeFile(root, id);
  let raw;
  let metadata;
  try {
    [raw, metadata] = await Promise.all([readFile(file, "utf8"), stat(file)]);
  } catch (error) {
    if (error?.code === "ENOENT") throw new WorkspaceNotFoundError(`resume not found: ${id}`);
    throw error;
  }
  const resume = JSON.parse(raw);
  const title = String(resume.title || resume.header?.name || "未命名简历");
  if (!resume.title) resume.title = title;
  return {
    id,
    title,
    role: String(resume.header?.role || "未设置求职方向"),
    updatedAt: metadata.mtime.toISOString(),
    revision: hash(raw),
    resume,
  };
}

export async function writeResumeRecord(workspaceRoot, id, resume, options = {}) {
  const root = options.skipEnsure ? resolve(workspaceRoot) : await ensureWorkspace(workspaceRoot, options);
  const file = resumeFile(root, id);
  await assertRevision(file, options.expectedRevision, options.allowCreate !== false);
  const next = structuredClone(resume);
  next.version ??= 3;
  next.title = String(next.title || next.header?.name || "未命名简历");
  await atomicWrite(file, `${JSON.stringify(next, null, 2)}\n`);
  return readResumeRecord(root, id);
}

export async function createResumeRecord(workspaceRoot, resume, options = {}) {
  const id = options.id || `resume-${Date.now().toString(36)}-${randomUUID().slice(0, 6)}`;
  return writeResumeRecord(workspaceRoot, id, resume, { ...options, allowCreate: true });
}

export async function cloneResumeRecord(workspaceRoot, sourceId, options = {}) {
  const source = await readResumeRecord(workspaceRoot, sourceId);
  const resume = structuredClone(source.resume);
  resume.title = String(options.title || `${source.title} · 副本`);
  return createResumeRecord(workspaceRoot, resume, options);
}

export async function deleteResumeRecord(workspaceRoot, id, options = {}) {
  const root = resolve(workspaceRoot);
  const file = resumeFile(root, id);
  await assertRevision(file, options.expectedRevision, false);
  try {
    await unlink(file);
  } catch (error) {
    if (error?.code === "ENOENT") throw new WorkspaceNotFoundError(`resume not found: ${id}`);
    throw error;
  }
}

export async function readMaterials(workspaceRoot) {
  const file = resolve(workspaceRoot, "materials.md");
  try {
    const content = await readFile(file, "utf8");
    return { content, revision: hash(content) };
  } catch (error) {
    if (error?.code === "ENOENT") return { content: "", revision: hash("") };
    throw error;
  }
}

export async function writeMaterials(workspaceRoot, content, options = {}) {
  const root = await ensureWorkspace(workspaceRoot, options);
  const file = resolve(root, "materials.md");
  await assertRevision(file, options.expectedRevision, options.allowCreate !== false, "");
  await atomicWrite(file, String(content));
  return readMaterials(root);
}

export async function replaceWorkspace(workspaceRoot, candidate, options = {}) {
  const root = await ensureWorkspace(workspaceRoot, options);
  const incoming = Array.isArray(candidate?.resumes) ? candidate.resumes : [];
  const existing = await readWorkspace(root, { legacyRoot: options.legacyRoot });
  const incomingIds = new Set();
  for (const record of incoming) {
    const id = safeId(record?.id || `resume-${randomUUID().slice(0, 8)}`);
    incomingIds.add(id);
    const resume = record?.resume && typeof record.resume === "object" ? record.resume : record;
    await writeResumeRecord(root, id, resume, {
      allowCreate: true,
      expectedRevision: typeof record?.revision === "string" ? record.revision : undefined,
    });
  }
  for (const record of existing.resumes) {
    if (!incomingIds.has(record.id)) {
      try { await unlink(resumeFile(root, record.id)); } catch (error) { if (error?.code !== "ENOENT") throw error; }
    }
  }
  await writeMaterials(root, typeof candidate?.materials === "string" ? candidate.materials : "", {
    expectedRevision: typeof candidate?.materialsRevision === "string" ? candidate.materialsRevision : undefined,
  });
  return readWorkspace(root, { legacyRoot: options.legacyRoot });
}

async function migrateLegacyWorkspace(root, legacyRoot) {
  if (root === legacyRoot) return;
  const workspaceFile = resolve(root, "workspace.json");
  let metadata = { version: WORKSPACE_VERSION };
  try {
    const parsed = JSON.parse(await readFile(workspaceFile, "utf8"));
    if (parsed && typeof parsed === "object") metadata = { ...metadata, ...parsed };
  } catch (error) {
    if (error?.code !== "ENOENT") process.stderr.write(`workspace metadata read failed: ${error}\n`);
  }
  if (metadata.legacyMigrated) return;
  const files = await listResumeFiles(root);
  if (files.length > 0) {
    await atomicWrite(workspaceFile, `${JSON.stringify({ ...metadata, version: WORKSPACE_VERSION, legacyMigrated: true }, null, 2)}\n`);
    return;
  }
  let legacy;
  try {
    legacy = JSON.parse(await readFile(resolve(legacyRoot, "workspace.json"), "utf8"));
  } catch (error) {
    if (error?.code !== "ENOENT") process.stderr.write(`legacy workspace read failed: ${error}\n`);
    legacy = null;
  }
  if (legacy && Array.isArray(legacy.resumes)) {
    for (const record of legacy.resumes) {
      const id = safeId(record?.id || `resume-${randomUUID().slice(0, 8)}`);
      const resume = record?.resume && typeof record.resume === "object" ? structuredClone(record.resume) : record;
      if (!resume || typeof resume !== "object") continue;
      resume.title = String(resume.title || record?.title || resume.header?.name || "未命名简历");
      await writeResumeRecord(root, id, resume, { allowCreate: true, skipEnsure: true });
    }
  }
  const materialsTarget = resolve(root, "materials.md");
  try {
    await access(materialsTarget);
  } catch {
    try { await atomicWrite(materialsTarget, await readFile(resolve(legacyRoot, "materials.md"), "utf8")); } catch (error) { if (error?.code !== "ENOENT") throw error; }
  }
  await atomicWrite(workspaceFile, `${JSON.stringify({ ...metadata, version: WORKSPACE_VERSION, legacyMigrated: true }, null, 2)}\n`);
}

async function listResumeFiles(root) {
  try {
    return (await readdir(resolve(root, "resumes"))).filter((name) => name.endsWith(".json") && name !== "workspace.json");
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

function resumeFile(root, id) {
  return resolve(root, "resumes", `${safeId(id)}.json`);
}

function safeId(value) {
  const id = String(value || "");
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,100}$/.test(id)) throw new Error(`invalid resume id: ${id}`);
  return id;
}

async function assertRevision(file, expectedRevision, allowCreate, missingContent) {
  let raw;
  try {
    raw = await readFile(file, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    if (expectedRevision !== undefined && expectedRevision !== null && expectedRevision !== hash(missingContent ?? "")) {
      throw new WorkspaceConflictError();
    }
    if (!allowCreate) throw new WorkspaceNotFoundError(`workspace file not found: ${file}`);
    return;
  }
  if (expectedRevision !== undefined && expectedRevision !== null && expectedRevision !== hash(raw)) {
    throw new WorkspaceConflictError();
  }
}

async function atomicWrite(file, content) {
  await mkdir(dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, content, "utf8");
    await rename(temporary, file);
  } finally {
    try { await unlink(temporary); } catch {}
  }
}

function hash(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}
