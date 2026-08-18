import { cp, mkdir, rm, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const repositoryRoot = resolve(packageRoot, "../..");
const sourceRoot = resolve(repositoryRoot, "apps/web");
const sourceDist = resolve(sourceRoot, "dist");
const destination = resolve(packageRoot, "web");

runNpmBuild(sourceRoot);
const metadata = await stat(resolve(sourceDist, "server/index.js"));
if (!metadata.isFile()) throw new Error("web build did not produce dist/server/index.js");

await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp(resolve(sourceDist, "client"), resolve(destination, "client"), { recursive: true });
await cp(resolve(sourceDist, "server"), resolve(destination, "server"), { recursive: true });
process.stdout.write(`Bundled editor runtime at ${destination}\n`);

function runNpmBuild(cwd) {
  const windows = process.platform === "win32";
  const result = windows
    ? spawnSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", "npm.cmd run build"], { cwd, stdio: "inherit", windowsHide: true })
    : spawnSync("npm", ["run", "build"], { cwd, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`web build failed with code ${result.status}`);
}
