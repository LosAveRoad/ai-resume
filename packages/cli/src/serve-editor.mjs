import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, isAbsolute, relative, resolve } from "node:path";
import { Readable } from "node:stream";
import { pathToFileURL } from "node:url";
import {
  cloneResumeRecord,
  createResumeRecord,
  deleteResumeRecord,
  ensureWorkspace,
  readMaterials,
  readResumeRecord,
  readWorkspace,
  replaceWorkspace,
  writeMaterials,
  writeResumeRecord,
  WorkspaceConflictError,
  WorkspaceNotFoundError,
} from "./workspace.mjs";
import { renderResume } from "./browser.mjs";

class InvalidRequestError extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidRequestError";
  }
}

const root = resolve(readArgument("--root") ?? "web");
const port = Number(readArgument("--port") ?? 4173);
const workspaceRoot = resolve(readArgument("--workspace") ?? readArgument("--data-dir") ?? resolve(process.cwd(), "airesume"));
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`invalid port: ${port}`);
await ensureWorkspace(workspaceRoot);

const clientRoot = resolve(root, "client");
const serverEntry = resolve(root, "server/index.js");
const worker = (await import(pathToFileURL(serverEntry).href)).default;
if (!worker || typeof worker.fetch !== "function") throw new Error(`invalid editor server bundle: ${serverEntry}`);

const assets = { fetch: serveAssetRequest };
const executionContext = {
  waitUntil(promise) {
    Promise.resolve(promise).catch((error) => process.stderr.write(`editor background task failed: ${error}\n`));
  },
  passThroughOnException() {},
};
const server = createServer(async (incoming, outgoing) => {
  try {
    const host = incoming.headers.host || `127.0.0.1:${port}`;
    const url = new URL(incoming.url || "/", `http://${host}`);
    const apiResponse = await serveWorkspaceApi(incoming, url);
    if (apiResponse) {
      await sendResponse(outgoing, apiResponse);
      return;
    }
    const staticResponse = await serveAssetRequest(new Request(url));
    const response = staticResponse.status !== 404
      ? staticResponse
      : await worker.fetch(await toRequest(incoming, url), { ASSETS: assets }, executionContext);
    await sendResponse(outgoing, response);
  } catch (error) {
    if (error instanceof WorkspaceConflictError) {
      await sendResponse(outgoing, jsonResponse({ error: error.message }, 409));
      return;
    }
    if (error instanceof WorkspaceNotFoundError) {
      await sendResponse(outgoing, jsonResponse({ error: error.message }, 404));
      return;
    }
    if (error instanceof InvalidRequestError) {
      await sendResponse(outgoing, jsonResponse({ error: error.message }, 400));
      return;
    }
    outgoing.statusCode = 500;
    outgoing.setHeader("content-type", "text/plain; charset=utf-8");
    outgoing.end(error instanceof Error ? error.stack : String(error));
  }
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`AI Resume editor listening at http://127.0.0.1:${port}\n`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}

async function serveAssetRequest(request) {
  const pathname = decodeURIComponent(new URL(request.url).pathname).replace(/^\/+/, "");
  if (!pathname) return new Response("Not found", { status: 404 });
  const file = resolve(clientRoot, pathname);
  const fromRoot = relative(clientRoot, file);
  if (!fromRoot || fromRoot.startsWith("..") || isAbsolute(fromRoot)) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const metadata = await stat(file);
    if (!metadata.isFile()) return new Response("Not found", { status: 404 });
    return new Response(Readable.toWeb(createReadStream(file)), {
      headers: {
        "content-type": contentType(file),
        "content-length": String(metadata.size),
        "cache-control": pathname.startsWith("_next/static/")
          ? "public, max-age=31536000, immutable"
          : "public, max-age=3600",
      },
    });
  } catch (error) {
    if (error && error.code === "ENOENT") return new Response("Not found", { status: 404 });
    throw error;
  }
}

async function serveWorkspaceApi(incoming, url) {
  const resumeMatch = url.pathname.match(/^\/api\/resumes\/([^/]+)$/);
  const cloneMatch = url.pathname.match(/^\/api\/resumes\/([^/]+)\/clone$/);
  const exportMatch = url.pathname.match(/^\/api\/resumes\/([^/]+)\/export$/);
  if (url.pathname === "/api/workspace" && incoming.method === "GET") {
    return jsonResponse(await readWorkspace(workspaceRoot));
  }
  if (url.pathname === "/api/workspace" && (incoming.method === "PUT" || incoming.method === "POST")) {
    return jsonResponse(await parseAndReplaceWorkspace(incoming));
  }
  if (url.pathname === "/api/materials" && incoming.method === "GET") {
    return jsonResponse(await readMaterials(workspaceRoot));
  }
  if (url.pathname === "/api/materials" && (incoming.method === "PUT" || incoming.method === "POST")) {
    const body = parseJson(await readIncomingBody(incoming));
    const content = typeof body === "string" ? body : body.content;
    return jsonResponse(await writeMaterials(workspaceRoot, content ?? "", { expectedRevision: expectedRevision(incoming, body) }));
  }
  if (url.pathname === "/api/resumes" && incoming.method === "GET") {
    const workspace = await readWorkspace(workspaceRoot);
    return jsonResponse({ resumes: workspace.resumes });
  }
  if (url.pathname === "/api/resumes" && incoming.method === "POST") {
    const body = parseJson(await readIncomingBody(incoming));
    const resume = body?.resume && typeof body.resume === "object" ? body.resume : body;
    return jsonResponse(await createResumeRecord(workspaceRoot, resume, { id: body?.id }));
  }
  if (resumeMatch && incoming.method === "GET") {
    return jsonResponse(await readResumeRecord(workspaceRoot, decodeURIComponent(resumeMatch[1])));
  }
  if (resumeMatch && incoming.method === "PUT") {
    const body = parseJson(await readIncomingBody(incoming));
    const resume = body?.resume && typeof body.resume === "object" ? body.resume : body;
    return jsonResponse(await writeResumeRecord(workspaceRoot, decodeURIComponent(resumeMatch[1]), resume, {
      expectedRevision: expectedRevision(incoming, body),
    }));
  }
  if (resumeMatch && incoming.method === "DELETE") {
    await deleteResumeRecord(workspaceRoot, decodeURIComponent(resumeMatch[1]), { expectedRevision: expectedRevision(incoming) });
    return jsonResponse({ ok: true });
  }
  if (exportMatch && incoming.method === "POST") {
    const id = decodeURIComponent(exportMatch[1]);
    const record = await readResumeRecord(workspaceRoot, id);
    const revision = expectedRevision(incoming);
    if (revision && revision !== record.revision) throw new WorkspaceConflictError();
    const output = resolve(workspaceRoot, "output", id, "resume.pdf");
    await renderResume({ resume: record.resume, output, url: `http://127.0.0.1:${port}`, format: "pdf" });
    return new Response(await readFile(output), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${id}.pdf"`,
        "cache-control": "no-store",
      },
    });
  }
  if (cloneMatch && incoming.method === "POST") {
    const body = parseJson(await readIncomingBody(incoming));
    return jsonResponse(await cloneResumeRecord(workspaceRoot, decodeURIComponent(cloneMatch[1]), { title: body?.title }));
  }
  if (url.pathname.startsWith("/api/")) return new Response("Not found", { status: 404 });
  return null;
}

async function parseAndReplaceWorkspace(incoming) {
  const body = parseJson(await readIncomingBody(incoming));
  return replaceWorkspace(workspaceRoot, body);
}

function parseJson(body) {
  try {
    return JSON.parse(body || "{}");
  } catch {
    throw new InvalidRequestError("invalid JSON");
  }
}

function expectedRevision(incoming, body) {
  const header = incoming.headers["if-match"];
  const value = body && typeof body === "object" && !Array.isArray(body) ? body.revision : undefined;
  return value ?? (typeof header === "string" ? header.replace(/^W\//, "").replace(/^\"|\"$/g, "") : undefined);
}

async function readIncomingBody(incoming) {
  const chunks = [];
  for await (const chunk of incoming) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

async function toRequest(incoming, url) {
  const method = incoming.method || "GET";
  const options = { method, headers: incoming.headers };
  if (method !== "GET" && method !== "HEAD") {
    options.body = Readable.toWeb(incoming);
    options.duplex = "half";
  }
  return new Request(url, options);
}

async function sendResponse(outgoing, response) {
  outgoing.statusCode = response.status;
  outgoing.statusMessage = response.statusText;
  response.headers.forEach((value, name) => outgoing.setHeader(name, value));
  if (!response.body) {
    outgoing.end();
    return;
  }
  await new Promise((resolvePromise, rejectPromise) => {
    const stream = Readable.fromWeb(response.body);
    stream.on("error", rejectPromise);
    outgoing.on("finish", resolvePromise);
    stream.pipe(outgoing);
  });
}

function contentType(file) {
  const extension = extname(file).toLowerCase();
  return ({
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
  })[extension] ?? "application/octet-stream";
}

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
