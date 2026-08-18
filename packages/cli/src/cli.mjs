import { cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { inspectResume, formatValidationErrors, readResume } from "./schema.mjs";
import { installSkill } from "./install-skill.mjs";
import { renderResume, runEditorServer } from "./browser.mjs";
import { resolveSkillSource, templateRoot } from "./paths.mjs";

const VERSION = "0.1.0";
const DEFAULT_RESUME_PATH = "resume/resume.json";
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
      return devCommand(options.port, io);
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
  const root = resolve(directory);
  const resumeDirectory = resolve(root, "resume");
  const outputDirectory = resolve(resumeDirectory, "output");
  await mkdir(outputDirectory, { recursive: true });
  const copyOptions = force ? { force: true } : { errorOnExist: true, force: false };
  try {
    await cp(resolve(templateRoot, "resume.json"), resolve(resumeDirectory, "resume.json"), copyOptions);
    await cp(resolve(templateRoot, "materials.md"), resolve(resumeDirectory, "materials.md"), copyOptions);
  } catch (error) {
    if (error && (error.code === "ERR_FS_CP_EEXIST" || error.code === "EEXIST")) {
      throw new Error(`resume files already exist under ${resumeDirectory}; pass --force to replace them`);
    }
    throw error;
  }
  io.stdout.write(`Initialized local resume workspace at ${resumeDirectory}\n`);
  io.stdout.write(`  material bank: ${resolve(resumeDirectory, "materials.md")}\n`);
  io.stdout.write(`  resume data:   ${resolve(resumeDirectory, "resume.json")}\n`);
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

async function devCommand(portOption, io) {
  const port = parsePort(portOption, 3000);
  io.stdout.write(`Starting AI Resume editor at http://127.0.0.1:${port}\n`);
  const exitCode = await runEditorServer(port);
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
  ai-resume dev [--port 3000]
  ai-resume render [resume.json] [--out resume.png] [--url URL] [--port 4173]
  ai-resume export [resume.json] [--out resume.pdf] [--url URL] [--port 4173]
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
