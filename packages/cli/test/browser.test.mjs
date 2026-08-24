import assert from "node:assert/strict";
import { stat, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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
  const input = join(root, "airesume", "resumes", "resume-main.json");
  const pdf = join(root, "airesume", "output", "resume.pdf");

  const resume = JSON.parse(await readFile(input, "utf8"));
  const templateIds = ["numbered-rail", "classic-burgundy", "campus-navy", "soft-gray", "blue-line"];
  for (const [index, templateId] of templateIds.entries()) {
    resume.presentation.activeTemplate = templateId;
    await writeFile(input, JSON.stringify(resume, null, 2));
    const preview = join(root, "resume", "output", `${templateId}.png`);
    const rendered = runCli(["render", input, "--out", preview, "--port", String(43173 + index)]);
    assertSuccess(rendered);
    assert.match(rendered.stdout, /Rendered page count: 1/);
    assertUtilizationDiagnostic(rendered.stdout);
    assert.ok((await stat(preview)).size > 10_000);
  }

  const exported = runCli(["export", input, "--out", pdf, "--port", "43180"]);
  assertSuccess(exported);
  assert.match(exported.stdout, /Rendered page count: 1/);
  assert.match(exported.stdout, /Page utilization: \d+%/);
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

function assertUtilizationDiagnostic(stdout) {
  const match = stdout.match(/Page utilization: (\d+)%/);
  assert.ok(match, `missing page utilization output:\n${stdout}`);
  const utilization = Number(match[1]);
  if (utilization < 90) {
    assert.match(stdout, /appears underfilled \(below 90%\)/);
  } else if (utilization < 95) {
    assert.match(stdout, /below the 95% target/);
  }
}
