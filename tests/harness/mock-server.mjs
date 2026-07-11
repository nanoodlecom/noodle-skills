import http from "node:http";

/**
 * Mock NanoGPT server for offline tests (zero deps, node:http) — trimmed copy of the
 * harness in nanoodlecom/nanoodle-js (same MIT license). Tests point NANOGPT_BASE_URL
 * here so nothing ever reaches the real API and no credit is spent.
 *
 * - Records EVERY request: { method, path, headers, json, text } → srv.requests
 * - Scriptable per-route: srv.script("POST /api/v1/chat/completions", handler)
 *   handler = response object | (req) => response object
 *   response object = { status?=200, headers?={}, json?, body? }
 */
export async function startMockServer() {
  const requests = [];
  const scripts = new Map();

  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks);
    const u = new URL(req.url, "http://mock");
    let json = null;
    try { json = JSON.parse(raw.toString("utf8")); } catch { /* not JSON */ }
    const rec = { method: req.method, path: u.pathname, headers: req.headers, json, text: raw.toString("utf8") };
    requests.push(rec);

    let handler = scripts.get(req.method + " " + u.pathname);
    if (typeof handler === "function") handler = await handler(rec);
    if (!handler) {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "mock: no script for " + req.method + " " + u.pathname }));
      return;
    }
    const headers = { ...handler.headers };
    let body;
    if (handler.json !== undefined) {
      headers["content-type"] = headers["content-type"] || "application/json";
      body = JSON.stringify(handler.json);
    } else {
      body = handler.body != null ? handler.body : "";
    }
    res.writeHead(handler.status || 200, headers);
    res.end(body);
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();

  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    of(key) {
      const [method, path] = key.split(" ");
      return requests.filter((r) => r.method === method && r.path === path);
    },
    script(key, handler) { scripts.set(key, handler); return this; },
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

/** 1x1 transparent PNG (base64, starts with iVBOR → sniffs image/png). */
export const PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
