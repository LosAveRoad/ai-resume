import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const repositoryRoot = resolve(packageRoot, "../..");
export const templateRoot = resolve(packageRoot, "templates");

export function resolveEditorRuntime() {
  const sourceRoot = resolve(repositoryRoot, "apps/web");
  const sourceDist = resolve(sourceRoot, "dist");
  if (existsSync(resolve(sourceDist, "server/index.js"))) {
    return { kind: "production", root: sourceDist };
  }
  const packagedRoot = resolve(packageRoot, "web");
  if (existsSync(resolve(packagedRoot, "server/index.js"))) {
    return { kind: "production", root: packagedRoot };
  }
  if (existsSync(resolve(sourceRoot, "package.json"))) {
    return { kind: "development", root: sourceRoot };
  }
  throw new Error("cannot find the bundled editor runtime; reinstall @ai-resume/cli or run it from the source repository");
}

export function resolveSkillSource() {
  const candidates = [
    process.env.AI_RESUME_SKILL_SOURCE,
    resolve(packageRoot, "skill/ai-resume"),
    resolve(repositoryRoot, "skills/ai-resume"),
  ].filter(Boolean);
  const source = candidates.find((candidate) => existsSync(resolve(candidate, "SKILL.md")));
  if (!source) {
    throw new Error("cannot find the bundled ai-resume skill; set AI_RESUME_SKILL_SOURCE to its directory");
  }
  return source;
}
