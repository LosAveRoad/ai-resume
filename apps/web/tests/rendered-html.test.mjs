import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the local resume editor shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>AI Resume · 本地简历工作台<\/title>/i);
  assert.match(html, /AI Resume/);
  assert.match(html, /简历预览/);
  assert.match(html, /简历模块导航/);
  assert.match(html, /当前只编辑一个模块/);
  assert.match(html, /导出 PDF/);
  assert.match(html, /现代编号/);
  assert.match(html, /经典酒红/);
  assert.match(html, /校园深蓝/);
  assert.match(html, /上传并裁剪照片/);
  assert.doesNotMatch(html, /SkeletonPreview|react-loading-skeleton|codex-preview/);
});
