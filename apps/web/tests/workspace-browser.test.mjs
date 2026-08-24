import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { chromium } from "playwright";

test("workspace creates, edits, and lists a local resume", { timeout: 90_000 }, async (t) => {
  const repositoryRoot = resolve(import.meta.dirname, "../../..");
  const port = 43181;
  const dataDir = await mkdtemp(resolve(tmpdir(), "ai-resume-workspace-"));
  const server = spawn(process.execPath, [
    resolve(repositoryRoot, "packages/cli/src/serve-editor.mjs"),
    "--root", resolve(repositoryRoot, "apps/web/dist"),
    "--port", String(port),
    "--data-dir", dataDir,
  ], { cwd: repositoryRoot, stdio: "ignore", windowsHide: true });
  t.after(() => stopProcessTree(server));
  await waitForServer(`http://127.0.0.1:${port}`);
  const workspaceResponse = await fetch(`http://127.0.0.1:${port}/api/workspace`);
  assert.equal(workspaceResponse.ok, true);
  const emptyWorkspace = await workspaceResponse.json();
  assert.deepEqual(emptyWorkspace.version, 1);
  assert.deepEqual(emptyWorkspace.resumes, []);
  assert.equal(emptyWorkspace.materials, "");
  assert.match(emptyWorkspace.materialsRevision, /^sha256:/);

  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`http://127.0.0.1:${port}`, { waitUntil: "load" });

  assert.equal(await page.getByText("我的简历", { exact: true }).first().isVisible(), true);
  assert.equal(await page.getByRole("button", { name: "创建第一份简历" }).isVisible(), true);
  await page.getByRole("button", { name: "创建第一份简历" }).click();
  await page.waitForSelector('[data-preview-ready="true"]');
  assert.equal(await page.locator(".page-wrap .resume-page").first().getAttribute("data-template"), "soft-gray");
  assert.equal(await page.getByText("简历预览", { exact: true }).isVisible(), true);
  assert.equal(await page.getByText("案例速览", { exact: true }).count(), 0);
  await page.getByLabel("简历名称").fill("我的后端求职简历");
  await page.getByLabel("主页").fill("github.com/example");
  await page.waitForTimeout(250);
  assert.equal(await page.locator('.page-wrap a[href="https://github.com/example"]').count(), 1);
  await page.locator(".module-system-tab").click();
  await page.locator('[data-template-card="soft-gray"]').click();
  await page.waitForSelector('.page-wrap .resume-page[data-template="soft-gray"]');
  await page.locator(".module-tab").filter({ hasText: "项目经历" }).click();
  const entry = page.locator("[data-entry-editor]").first();
  await entry.getByLabel("角色 / 专业").fill("");
  await entry.getByLabel("开始时间").fill("");
  await entry.getByLabel("结束时间").fill("2026.06");
  await page.waitForTimeout(250);
  assert.equal(await page.locator(".page-wrap .entry-heading-count-2").count() > 0, true);
  await entry.getByLabel("结束时间").fill("");
  await page.waitForTimeout(250);
  assert.equal(await page.locator(".page-wrap .entry-heading-count-1").count() > 0, true);

  await page.getByRole("link", { name: "返回 AI Resume 首页" }).click();
  assert.equal(await page.locator(".resume-card").count(), 1);
  assert.match(await page.locator(".resume-card").innerText(), /我的后端求职简历/);

  await page.getByRole("button", { name: "继续编辑" }).click();
  await page.waitForSelector('[data-preview-ready="true"]');
  assert.equal(await page.getByText("简历预览", { exact: true }).isVisible(), true);

  await page.getByRole("button", { name: "返回首页" }).click();
  assert.equal(await page.locator(".resume-card").count(), 1);
  await page.getByLabel("素材库 Markdown").fill("# 测试素材\n\n- 真实项目指标");
  await page.waitForTimeout(600);
  await page.reload({ waitUntil: "load" });
  assert.equal(await page.locator(".resume-card").count(), 1);
  assert.match(await page.getByLabel("素材库 Markdown").inputValue(), /真实项目指标/);
});

async function waitForServer(url) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The server may still be starting; retry until the bounded deadline.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  throw new Error(`server did not become ready at ${url}`);
}

function stopProcessTree(child) {
  if (!child.pid || child.exitCode !== null) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
  } else {
    child.kill("SIGTERM");
  }
}
