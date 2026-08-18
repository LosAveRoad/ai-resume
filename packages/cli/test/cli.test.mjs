import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const cli = resolve(fileURLToPath(new URL("../bin/ai-resume.mjs", import.meta.url)));

test("help exposes the agent workflow and no fit command", () => {
  const result = runCli(["--help"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /install-skill/);
  assert.match(result.stdout, /native visual ability/);
  assert.match(result.stdout, /no automatic "fit one page" command/);
});

test("init, validate, inspect, and invalid-data reporting", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "ai-resume-cli-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  const initialized = runCli(["init", root]);
  assert.equal(initialized.status, 0, initialized.stderr);
  const resumePath = join(root, "resume", "resume.json");
  const materialsPath = join(root, "resume", "materials.md");
  assert.equal(existsSync(resumePath), true);
  assert.equal(existsSync(materialsPath), true);

  const validated = runCli(["validate", resumePath, "--json"]);
  assert.equal(validated.status, 0, validated.stderr);
  assert.equal(JSON.parse(validated.stdout).valid, true);

  const inspected = runCli(["inspect", resumePath, "--json"]);
  assert.equal(inspected.status, 0, inspected.stderr);
  const summary = JSON.parse(inspected.stdout);
  assert.equal(summary.totals.sections, 7);
  assert.equal(summary.sections.some((section) => section.id === "projects"), true);

  const invalidPath = join(root, "invalid.json");
  const invalid = JSON.parse(await readFile(resumePath, "utf8"));
  invalid.layout.fontSize = 3;
  await writeFile(invalidPath, JSON.stringify(invalid), "utf8");
  const rejected = runCli(["validate", invalidPath]);
  assert.equal(rejected.status, 1);
  assert.match(rejected.stderr, /layout\.fontSize/);
});

test("project skill installer writes native discovery paths and preserves existing installs", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "ai-resume-skills-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  const installed = runCli(["install-skill", "--agent", "all", "--scope", "project", "--root", root]);
  assert.equal(installed.status, 0, installed.stderr);
  const paths = [
    join(root, ".agents", "skills", "ai-resume", "SKILL.md"),
    join(root, ".claude", "skills", "ai-resume", "SKILL.md"),
    join(root, ".dsh", "skills", "ai-resume", "SKILL.md"),
  ];
  for (const path of paths) {
    assert.equal(existsSync(path), true, path);
    assert.match(await readFile(path, "utf8"), /name: ai-resume/);
  }

  const preserved = runCli(["install-skill", "--agent", "codex", "--scope", "project", "--root", root]);
  assert.equal(preserved.status, 1);
  assert.match(preserved.stderr, /already exists/);

  const replaced = runCli(["install-skill", "--agent", "codex", "--scope", "project", "--root", root, "--force"]);
  assert.equal(replaced.status, 0, replaced.stderr);
});

function runCli(args) {
  return spawnSync(process.execPath, [cli, ...args], {
    encoding: "utf8",
    cwd: resolve(fileURLToPath(new URL("../../../", import.meta.url))),
    windowsHide: true,
  });
}
