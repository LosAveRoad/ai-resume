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

test("server-renders the local resume workspace home", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>AI Resume · 本地简历工作台<\/title>/i);
  assert.match(html, /AI Resume/);
  assert.match(html, /可验证的工程流程/);
  assert.match(html, /我的简历/);
  assert.match(html, /新建简历/);
  assert.match(html, /空白简历/);
  assert.match(html, /Agent 工程师/);
  assert.match(html, /后端工程师/);
  assert.match(html, /95%/);
  assert.match(html, /数据保存在本地/);
  assert.doesNotMatch(html, /SkeletonPreview|react-loading-skeleton|codex-preview/);
});
