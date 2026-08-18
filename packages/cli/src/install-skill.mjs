import { cp, lstat, mkdir, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, relative, resolve } from "node:path";
import { resolveSkillSource } from "./paths.mjs";

const AGENT_ALIASES = new Map([
  ["codex", "codex"],
  ["claude", "claude-code"],
  ["claude-code", "claude-code"],
  ["deepseek", "deepseek-harness"],
  ["harness", "deepseek-harness"],
  ["deepseek-harness", "deepseek-harness"],
]);

export async function installSkill({ agent = "all", scope = "project", root = process.cwd(), force = false }) {
  if (scope !== "project" && scope !== "user") {
    throw new Error(`unknown scope ${JSON.stringify(scope)}; expected project or user`);
  }
  const agents = normalizeAgents(agent);
  const source = resolveSkillSource();
  const destinations = [];

  for (const targetAgent of agents) {
    const skillsRoot = resolveSkillsRoot(targetAgent, scope, root);
    const destination = resolve(skillsRoot, "ai-resume");
    assertDirectChild(skillsRoot, destination);
    if (await pathExists(destination)) {
      if (!force) throw new Error(`skill already exists at ${destination}; pass --force to replace it`);
      await rm(destination, { recursive: true, force: true });
    }
    await mkdir(skillsRoot, { recursive: true });
    await cp(source, destination, { recursive: true, errorOnExist: true, force: false });
    destinations.push({ agent: targetAgent, path: destination });
  }
  return destinations;
}

function normalizeAgents(agent) {
  if (agent === "all") return ["codex", "claude-code", "deepseek-harness"];
  const normalized = AGENT_ALIASES.get(agent);
  if (!normalized) {
    throw new Error(`unknown agent ${JSON.stringify(agent)}; expected codex, claude-code, deepseek-harness, or all`);
  }
  return [normalized];
}

function resolveSkillsRoot(agent, scope, root) {
  const base = scope === "user" ? homedir() : resolve(root);
  if (agent === "codex") return resolve(base, ".agents/skills");
  if (agent === "claude-code") return resolve(base, ".claude/skills");
  return resolve(base, ".dsh/skills");
}

function assertDirectChild(parent, child) {
  const pathFromParent = relative(resolve(parent), resolve(child));
  if (!pathFromParent || pathFromParent.startsWith("..") || isAbsolute(pathFromParent)) {
    throw new Error(`refusing to replace skill outside ${parent}`);
  }
}

async function pathExists(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error && error.code === "ENOENT") return false;
    throw error;
  }
}
