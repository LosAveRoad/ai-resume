import assert from "node:assert/strict";
import { stat, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const cli = resolve(fileURLToPath(new URL("../bin/ai-resume.mjs", import.meta.url)));

test("CLI renders a visual preview and exports a PDF through the real editor", { timeout: 180_000 }, async (t) => {
  const root = await mkdtemp(join(tmpdir(), "ai-resume-browser-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  assertSuccess(runCli(["init", root]));
  const input = join(root, "resume", "resume.json");
  const preview = join(root, "resume", "output", "preview.png");
  const pdf = join(root, "resume", "output", "resume.pdf");

  const rendered = runCli(["render", input, "--out", preview, "--port", "43173"]);
  assertSuccess(rendered);
  assert.match(rendered.stdout, /Rendered page count: 1/);
  assert.ok((await stat(preview)).size > 10_000);

  const exported = runCli(["export", input, "--out", pdf, "--port", "43174"]);
  assertSuccess(exported);
  assert.match(exported.stdout, /Rendered page count: 1/);
  assert.ok((await stat(pdf)).size > 10_000);
});

function runCli(args) {
  return spawnSync(process.execPath, [cli, ...args], {
    encoding: "utf8",
    cwd: resolve(fileURLToPath(new URL("../../../", import.meta.url))),
    windowsHide: true,
    timeout: 150_000,
  });
}

function assertSuccess(result) {
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
}
