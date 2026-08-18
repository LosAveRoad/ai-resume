import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const STORAGE_KEY = "ai-resume.structured.v2";
const MARKDOWN_KEY = "ai-resume.markdown.v1";
const LAYOUT_KEY = "ai-resume.layout.v1";
const invocationDirectory = process.env.INIT_CWD ?? process.cwd();
const url = readArgument("--url") ?? "http://localhost:3000";
const outputArgument = readArgument("--out");
const outputPath = outputArgument
  ? path.resolve(invocationDirectory, outputArgument)
  : path.resolve(process.cwd(), "..", "..", "output", "pdf", "ai-resume-editor-sample.pdf");
const inputPath = readArgument("--input");

await mkdir(path.dirname(outputPath), { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext();
  const page = await context.newPage();

  if (inputPath) {
    const resolvedInput = path.resolve(invocationDirectory, inputPath);
    const inputContent = await readFile(resolvedInput, "utf8");
    if (resolvedInput.toLowerCase().endsWith(".md")) {
      await page.addInitScript(
        ({ key, value }) => localStorage.setItem(key, value),
        { key: MARKDOWN_KEY, value: inputContent },
      );
    } else {
      const resumeJson = JSON.parse(inputContent);
      await page.addInitScript(({ documentKey, markdownKey, layoutKey, value }) => {
        if (typeof value.markdown === "string") {
          localStorage.setItem(markdownKey, value.markdown);
          if (value.layout) localStorage.setItem(layoutKey, JSON.stringify(value.layout));
        } else {
          localStorage.setItem(documentKey, JSON.stringify(value));
        }
      }, { documentKey: STORAGE_KEY, markdownKey: MARKDOWN_KEY, layoutKey: LAYOUT_KEY, value: resumeJson });
    }
  }

  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-preview-ready="true"]');
  await page.waitForFunction(() => window.__RESUME_READY__ === true && document.fonts.status === "loaded");
  await page.waitForTimeout(150);
  await page.emulateMedia({ media: "print" });
  await page.pdf({
    path: outputPath,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  console.log(`PDF written to ${outputPath}`);
} finally {
  await browser.close();
}

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
