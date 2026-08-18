import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, isAbsolute, relative, resolve } from "node:path";
import { Readable } from "node:stream";
import { pathToFileURL } from "node:url";

const root = resolve(readArgument("--root") ?? "web");
const port = Number(readArgument("--port") ?? 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`invalid port: ${port}`);

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
    const staticResponse = await serveAssetRequest(new Request(url));
    const response = staticResponse.status !== 404
      ? staticResponse
      : await worker.fetch(await toRequest(incoming, url), { ASSETS: assets }, executionContext);
    await sendResponse(outgoing, response);
  } catch (error) {
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
