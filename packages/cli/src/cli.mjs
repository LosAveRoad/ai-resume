import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { inspectResume, formatValidationErrors, readResume } from "./schema.mjs";
import { installSkill } from "./install-skill.mjs";
import { renderResume, runEditorServer } from "./browser.mjs";
import { resolveSkillSource, templateRoot } from "./paths.mjs";
import {
  cloneResumeRecord,
  readResumeRecord,
  readWorkspace,
  resolveWorkspacePath,
  ensureWorkspace,
  writeMaterials,
  writeResumeRecord,
} from "./workspace.mjs";

const VERSION = "0.1.0";
const DEFAULT_RESUME_PATH = "airesume/resumes/resume-main.json";
const UNDERFILLED_PAGE_THRESHOLD = 90;
const TARGET_PAGE_UTILIZATION = 95;

export async function run(argv, io = process) {
  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h") {
    io.stdout.write(HELP);
    return 0;
  }
  if (argv[0] === "--version" || argv[0] === "-v") {
    io.stdout.write(`${VERSION}\n`);
    return 0;
  }
  const [command = "help", ...tokens] = argv;
  const { positionals, options } = parseArguments(tokens);

  if (options.help || command === "help") {
    io.stdout.write(HELP);
    return 0;
  }
  if (options.version || command === "version") {
    io.stdout.write(`${VERSION}\n`);
    return 0;
  }

  switch (command) {
    case "init":
      return initProject(positionals[0] ?? ".", options.force, io);
    case "validate":
      return validateCommand(positionals[0] ?? DEFAULT_RESUME_PATH, options.json, io);
    case "inspect":
      return inspectCommand(positionals[0] ?? DEFAULT_RESUME_PATH, options.json, io);
    case "dev":
      return devCommand(options.port, options.workspace ?? options["data-dir"], io);
    case "workspace":
      return workspaceCommand(positionals, options, io);
    case "render":
      return browserCommand("png", positionals[0] ?? DEFAULT_RESUME_PATH, options, io);
    case "export":
      return browserCommand("pdf", positionals[0] ?? DEFAULT_RESUME_PATH, options, io);
    case "install-skill":
      return installSkillCommand(options, io);
    case "skill-path":
      io.stdout.write(`${resolveSkillSource()}\n`);
      return 0;
    default:
      throw new Error(`unknown command ${JSON.stringify(command)}; run ai-resume --help`);
  }
}

async function initProject(directory, force, io) {
  const requestedRoot = resolve(directory);
  const root = basename(requestedRoot).toLowerCase() === "airesume" ? requestedRoot : resolve(requestedRoot, "airesume");
  const resumeDirectory = resolve(root, "resumes");
  const resumePath = resolve(resumeDirectory, "resume-main.json");
  const materialsPath = resolve(root, "materials.md");
  try {
    if (!force) {
      await readFile(resumePath);
      throw new Error(`resume files already exist under ${root}; pass --force to replace them`);
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  await ensureWorkspace(root);
  const resume = JSON.parse(await readFile(resolve(templateRoot, "resume.json"), "utf8"));
  const materials = await readFile(resolve(templateRoot, "materials.md"), "utf8");
  await writeResumeRecord(root, "resume-main", resume, { allowCreate: true });
  await writeMaterials(root, materials, { allowCreate: true });
  io.stdout.write(`Initialized local resume workspace at ${root}\n`);
  io.stdout.write(`  material bank: ${materialsPath}\n`);
  io.stdout.write(`  resume data:   ${resumePath}\n`);
  return 0;
}

async function validateCommand(input, json, io) {
  const result = await readResume(input);
  if (result.errors.length) {
    throw new Error(`resume validation failed for ${result.file}:\n${formatValidationErrors(result.errors)}`);
  }
  if (json) io.stdout.write(`${JSON.stringify({ valid: true, file: result.file }, null, 2)}\n`);
  else io.stdout.write(`Valid resume: ${result.file}\n`);
  return 0;
}

async function inspectCommand(input, json, io) {
  const result = await readResume(input);
  if (result.errors.length) {
    throw new Error(`resume validation failed for ${result.file}:\n${formatValidationErrors(result.errors)}`);
  }
  const inspection = inspectResume(result.resume, result.file);
  if (json) {
    io.stdout.write(`${JSON.stringify(inspection, null, 2)}\n`);
  } else {
    io.stdout.write(`${inspection.name || "Unnamed resume"} — ${inspection.role || "No target role"}\n`);
    io.stdout.write(`${inspection.totals.visibleSections}/${inspection.totals.sections} visible sections, ${inspection.totals.visibleEntries} visible entries\n`);
    io.stdout.write(`layout: ${inspection.layout.fontSize}pt, ${inspection.layout.lineHeight} line height, ${inspection.layout.marginX}×${inspection.layout.marginY}mm margins\n`);
    for (const section of inspection.sections) {
      io.stdout.write(`  ${section.visible ? "●" : "○"} ${section.title} (${section.kind}, ${section.entries} entries)\n`);
    }
  }
  return 0;
}

async function devCommand(portOption, dataDir, io) {
  const port = parsePort(portOption, 3000);
  io.stdout.write(`Starting AI Resume editor at http://127.0.0.1:${port}\n`);
  const exitCode = await runEditorServer(port, dataDir);
  if (exitCode !== 0) throw new Error(`editor exited with code ${exitCode}`);
  return exitCode;
}

async function browserCommand(format, input, options, io) {
  const result = await readResume(input);
  if (result.errors.length) {
    throw new Error(`resume validation failed for ${result.file}:\n${formatValidationErrors(result.errors)}`);
  }
  const defaultOutput = format === "png" ? "resume/output/resume.png" : "resume/output/resume.pdf";
  const output = resolve(options.out ?? defaultOutput);
  const renderResult = await renderResume({
    resume: result.resume,
    output,
    url: options.url,
    port: parsePort(options.port, 4173),
    format,
  });
  const label = format === "png" ? "Preview" : "PDF";
  io.stdout.write(`${label} written to ${renderResult.output}\n`);
  io.stdout.write(`Rendered page count: ${renderResult.pageCount}\n`);
  io.stdout.write(`Page utilization: ${renderResult.pageUtilization.map((value) => `${value}%`).join(", ")}\n`);
  const lastPageUtilization = renderResult.pageUtilization.at(-1) ?? 0;
  if (lastPageUtilization < UNDERFILLED_PAGE_THRESHOLD) {
    const pageLabel = renderResult.pageCount === 1 ? "The resume" : "The last page";
    io.stdout.write(`Warning: ${pageLabel} appears underfilled (below ${UNDERFILLED_PAGE_THRESHOLD}%). Add evidence-backed content or relax the layout before delivery.\n`);
  } else if (lastPageUtilization < TARGET_PAGE_UTILIZATION) {
    io.stdout.write(`Notice: page utilization is below the ${TARGET_PAGE_UTILIZATION}% target. Inspect the remaining whitespace before delivery.\n`);
  }
  if (format === "png") {
    io.stdout.write("Inspect this image visually before changing content or layout.\n");
  }
  return 0;
}

async function workspaceCommand(positionals, options, io) {
  const [subcommand = "list", id] = positionals;
  const workspaceRoot = resolveWorkspacePath(options.workspace);
  if (subcommand === "list") {
    const workspace = await readWorkspace(workspaceRoot);
    if (options.json) io.stdout.write(`${JSON.stringify(workspace.resumes, null, 2)}\n`);
    else for (const record of workspace.resumes) io.stdout.write(`${record.id}\t${record.title}\t${record.role}\n`);
    return 0;
  }
  if (subcommand === "clone") {
    if (!id) throw new Error("workspace clone requires a resume id");
    const record = await cloneResumeRecord(workspaceRoot, id, { title: options.title });
    io.stdout.write(`Created resume: ${record.id}\n`);
    io.stdout.write(`Title: ${record.title}\n`);
    return 0;
  }
  if (subcommand === "inspect" || subcommand === "render" || subcommand === "export") {
    if (!id) throw new Error(`workspace ${subcommand} requires a resume id`);
    const record = await readResumeRecord(workspaceRoot, id);
    if (subcommand === "inspect") {
      const inspection = inspectResume(record.resume, `airesume/resumes/${id}.json`);
      io.stdout.write(options.json ? `${JSON.stringify(inspection, null, 2)}\n` : `${inspection.name || "Unnamed resume"} — ${inspection.role || "No target role"}\n`);
      return 0;
    }
    const format = subcommand === "render" ? "png" : "pdf";
    const output = resolve(options.out ?? resolve(workspaceRoot, "output", id, format === "png" ? "preview.png" : "resume.pdf"));
    return reportBrowserOutput(format, record.resume, output, options, io);
  }
  throw new Error(`unknown workspace subcommand ${JSON.stringify(subcommand)}`);
}

async function reportBrowserOutput(format, resume, output, options, io) {
  const renderResult = await renderResume({
    resume,
    output,
    url: options.url,
    port: parsePort(options.port, 4173),
    format,
  });
  const label = format === "png" ? "Preview" : "PDF";
  io.stdout.write(`${label} written to ${renderResult.output}\n`);
  io.stdout.write(`Rendered page count: ${renderResult.pageCount}\n`);
  io.stdout.write(`Page utilization: ${renderResult.pageUtilization.map((value) => `${value}%`).join(", ")}\n`);
  if (format === "png") io.stdout.write("Inspect this image visually before changing content or layout.\n");
  return 0;
}

async function installSkillCommand(options, io) {
  const destinations = await installSkill({
    agent: options.agent ?? "all",
    scope: options.scope ?? "project",
    root: options.root ?? process.cwd(),
    force: options.force,
  });
  for (const destination of destinations) {
    io.stdout.write(`Installed for ${destination.agent}: ${destination.path}\n`);
  }
  return 0;
}

function parseArguments(tokens) {
  const positionals = [];
  const options = {};
  const aliases = { "-h": "help", "-v": "version", "-o": "out" };
  const booleans = new Set(["help", "version", "force", "json"]);
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith("-")) {
      positionals.push(token);
      continue;
    }
    const [rawName, inlineValue] = token.split(/=(.*)/s, 2);
    const name = aliases[rawName] ?? rawName.replace(/^--/, "");
    if (booleans.has(name)) {
      options[name] = true;
      continue;
    }
    const value = inlineValue ?? tokens[index + 1];
    if (value === undefined || value.startsWith("-")) throw new Error(`missing value for ${rawName}`);
    options[name] = value;
    if (inlineValue === undefined) index += 1;
  }
  return { positionals, options };
}

function parsePort(value, fallback) {
  if (value === undefined) return fallback;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`invalid port: ${value}`);
  return port;
}

const HELP = `AI Resume CLI ${VERSION}

Usage:
  ai-resume init [directory] [--force]
  ai-resume validate [resume.json] [--json]
  ai-resume inspect [resume.json] [--json]
  ai-resume dev [--port 3000] [--workspace ./airesume]
  ai-resume render [resume.json] [--out resume.png] [--url URL] [--port 4173]
  ai-resume export [resume.json] [--out resume.pdf] [--url URL] [--port 4173]
  ai-resume workspace list [--workspace ./airesume] [--json]
  ai-resume workspace clone <id> [--title TITLE] [--workspace ./airesume]
  ai-resume workspace inspect <id> [--workspace ./airesume] [--json]
  ai-resume workspace render <id> [--out preview.png] [--workspace ./airesume]
  ai-resume workspace export <id> [--out resume.pdf] [--workspace ./airesume]
  ai-resume install-skill [--agent all|codex|claude-code|deepseek-harness]
                          [--scope project|user] [--root directory] [--force]
  ai-resume skill-path

Workflow for coding agents:
  1. Edit the local material bank and structured resume JSON.
  2. Validate the JSON.
  3. Render a PNG and inspect it with native visual ability.
  4. Decide whether to rewrite, remove, reorder, or adjust layout values.
  5. Repeat until the result is sound, then export PDF.

There is deliberately no automatic "fit one page" command.
`;
