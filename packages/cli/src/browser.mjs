import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { resolveEditorRuntime } from "./paths.mjs";

const STORAGE_KEY = "ai-resume.structured.v2";

export async function renderResume({ resume, output, url, port = 4173, format }) {
  const outputPath = resolve(output);
  await mkdir(dirname(outputPath), { recursive: true });
  const server = url ? { url, child: null } : await ensureEditorServer(port);

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 1000 },
      deviceScaleFactor: 1.5,
      colorScheme: "light",
    });
    const page = await context.newPage();
    await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
      key: STORAGE_KEY,
      value: resume,
    });
    await page.goto(server.url, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-preview-ready="true"]');
    await page.waitForFunction(() => window.__RESUME_READY__ === true && document.fonts.status === "loaded");
    await page.waitForTimeout(150);

    const pageCount = await page.locator(".page-wrap .resume-page").count();
    if (pageCount === 0) throw new Error("editor rendered no resume pages");

    if (format === "png") {
      await page.addStyleTag({ content: ".app-bar, .toast { display: none !important; }" });
      await page.locator(".page-wrap").screenshot({ path: outputPath, animations: "disabled" });
    } else if (format === "pdf") {
      await page.emulateMedia({ media: "print" });
      await page.pdf({
        path: outputPath,
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      });
    } else {
      throw new Error(`unsupported browser output format: ${format}`);
    }
    return { output: outputPath, pageCount, url: server.url };
  } finally {
    await browser.close();
    if (server.child) stopProcessTree(server.child);
  }
}

export async function runEditorServer(port = 3000) {
  const child = startEditorServer(port, true);
  return new Promise((resolvePromise, rejectPromise) => {
    child.once("error", rejectPromise);
    child.once("exit", (code, signal) => {
      if (signal) resolvePromise(0);
      else resolvePromise(code ?? 1);
    });
  });
}

async function ensureEditorServer(port) {
  validatePort(port);
  const requestedUrls = [`http://127.0.0.1:${port}`, `http://localhost:${port}`];
  for (const candidate of requestedUrls) {
    if (await isEditorReachable(candidate)) return { url: candidate, child: null };
  }
  const runtime = resolveEditorRuntime();
  if (runtime.kind === "development" && port !== 3000 && await isEditorReachable("http://localhost:3000")) {
    return { url: "http://localhost:3000", child: null };
  }

  const child = startEditorServer(port, false, runtime);
  const logs = [];
  child.stdout?.on("data", (chunk) => appendLog(logs, chunk));
  child.stderr?.on("data", (chunk) => appendLog(logs, chunk));
  try {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      for (const candidate of requestedUrls) {
        if (await isEditorReachable(candidate)) return { url: candidate, child };
      }
      if (child.exitCode !== null) break;
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
    }
  } catch (error) {
    stopProcessTree(child);
    throw error;
  }
  stopProcessTree(child);
  const diagnostic = logs.length ? `\n${logs.join("").slice(-3000)}` : "";
  throw new Error(`editor did not become ready on port ${port}${diagnostic}`);
}

function startEditorServer(port, inheritOutput) {
  validatePort(port);
  const runtime = resolveEditorRuntime();
  if (runtime.kind === "production") {
    const serverScript = fileURLToPath(new URL("./serve-editor.mjs", import.meta.url));
    return spawn(process.execPath, [serverScript, "--root", runtime.root, "--port", String(port)], {
      stdio: inheritOutput ? "inherit" : ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
  }
  const windows = process.platform === "win32";
  const command = windows ? (process.env.ComSpec || "cmd.exe") : "npm";
  const args = windows
    ? ["/d", "/s", "/c", `npm.cmd run dev -- --host 127.0.0.1 --port ${port}`]
    : ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(port)];
  return spawn(command, args, {
    cwd: runtime.root,
    stdio: inheritOutput ? "inherit" : ["ignore", "pipe", "pipe"],
    windowsHide: true,
    shell: false,
  });
}

async function isEditorReachable(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(800) });
    if (!response.ok) return false;
    const html = await response.text();
    return html.includes("AI Resume") && html.includes("本地简历工作台");
  } catch {
    return false;
  }
}

function stopProcessTree(child) {
  if (!child.pid || child.exitCode !== null) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
  } else {
    child.kill("SIGTERM");
  }
}

function appendLog(logs, chunk) {
  logs.push(String(chunk));
  if (logs.length > 100) logs.shift();
}

function validatePort(port) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`invalid port: ${port}`);
  }
}
