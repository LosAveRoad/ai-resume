import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { resolve } from "node:path";
import test from "node:test";
import { chromium } from "playwright";

test("workspace creates, edits, and lists a local resume", { timeout: 90_000 }, async (t) => {
  const repositoryRoot = resolve(import.meta.dirname, "../../..");
  const port = 43181;
  const server = spawn(process.execPath, [
    resolve(repositoryRoot, "packages/cli/src/serve-editor.mjs"),
    "--root", resolve(repositoryRoot, "apps/web/dist"),
    "--port", String(port),
  ], { cwd: repositoryRoot, stdio: "ignore", windowsHide: true });
  t.after(() => stopProcessTree(server));
  await waitForServer(`http://127.0.0.1:${port}`);

  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`http://127.0.0.1:${port}`, { waitUntil: "networkidle" });

  assert.equal(await page.getByText("我的简历", { exact: true }).first().isVisible(), true);
  assert.equal(await page.getByRole("button", { name: "创建第一份简历" }).isVisible(), true);
  await page.getByRole("button", { name: "创建第一份简历" }).click();
  await page.waitForSelector('[data-preview-ready="true"]');
  assert.equal(await page.getByText("简历预览", { exact: true }).isVisible(), true);
  assert.equal(await page.getByText("案例速览", { exact: true }).count(), 0);

  await page.goBack({ waitUntil: "networkidle" });
  assert.equal(await page.locator(".resume-card").count(), 1);
  await page.goForward({ waitUntil: "networkidle" });
  assert.equal(await page.getByText("简历预览", { exact: true }).isVisible(), true);

  await page.getByRole("link", { name: "返回 AI Resume 首页" }).click();
  assert.equal(await page.locator(".resume-card").count(), 1);
  assert.match(await page.locator(".resume-card").innerText(), /未命名简历/);

  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.locator(".resume-card").count(), 1);
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
