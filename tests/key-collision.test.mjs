// Two bundled workflows have an input key equal to an output key of the same workflow:
// visual-judge (`Verdict`) and pr-describer (`Final PR body`). Both come from the same
// node's editor name — the node is the sink, so `deriveOutputs` keys the output by that
// name, and the node's only unwired input is its optional system prompt, so `deriveInputs`
// keys that input by the same name. A rename cannot separate them: it renames both.
//
// These tests pin what the collision actually does to a caller, so the SKILL.md text that
// promises "separate namespaces" is a measured claim and not a hope:
//   (a) `--input "<Key>=…"` reaches that node's SYSTEM message, not its output;
//   (b) `outputs["<Key>"]` in the stdout summary carries that node's RESULT;
//   (c) resolution is not ambiguous and does not error — the run completes.
// Stubbed against a local node:http server, zero NanoGPT spend.
import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { Workflow } from "nanoodle";
import { startMockServer, PNG_B64 } from "./harness/mock-server.mjs";

// MUST be async: the mock server shares this process's event loop.
const run = promisify(execFile);
const root = fileURLToPath(new URL("..", import.meta.url));
const CLI = fileURLToPath(new URL("../node_modules/nanoodle/bin/nanoodle.mjs", import.meta.url));

const fixtureDir = mkdtempSync(join(tmpdir(), "noodle-skills-collision-"));
const FIXTURE_JPG = join(fixtureDir, "fixture.jpg");
writeFileSync(FIXTURE_JPG, Buffer.from(PNG_B64, "base64"));
const FIXTURE_TXT = join(fixtureDir, "fixture.txt");
writeFileSync(FIXTURE_TXT, "diff --git a/config.js b/config.js\n-  cacheTtl: 60,\n+  cache_ttl_seconds: 60,");
test.after(() => rmSync(fixtureDir, { recursive: true, force: true }));

const SENTINEL = "SENTINEL-SYSTEM-PROMPT-FROM-THE-COLLIDING-INPUT-KEY";
const PAGE_DESC = "Three plan cards in a row; the middle card has no button.";
const VERDICT_JSON = '{"pass": false, "violations": []}';
const DRAFT_BODY = "Renames the cache TTL config key.";
const AUDIT_NOTES = "- the draft omits the rename's breaking effect";
const FINAL_BODY = "Renames the cache TTL config key. ## Breaking changes";

/** Every skill whose input keys and output keys overlap, and how to exercise the overlap. */
const COLLIDING = [
  {
    dir: "skills/visual-judge", graph: "workflows/visual-judge.noodle-graph.json",
    key: "Verdict", expectOutput: VERDICT_JSON,
    args: ["--input", "Screenshot=@" + FIXTURE_JPG, "--input", "Spec=three plan cards"],
    // Describer and judge share the chat endpoint; the judge answers second.
    script(srv, seen) {
      srv.script("POST /api/v1/chat/completions", (req) => {
        seen.push(req.json);
        const content = seen.length === 1 ? PAGE_DESC : VERDICT_JSON;
        return { json: { choices: [{ message: { content } }], x_nanogpt_pricing: { costUsd: 0.001 } } };
      });
    },
    // The judge is the last chat call: the run's own sink.
    systemOf: (seen) => systemMessage(seen[seen.length - 1]),
    calls: 2,
  },
  {
    dir: "skills/pr-describer", graph: "workflows/pr-describe.noodle-graph.json",
    key: "Final PR body", expectOutput: FINAL_BODY,
    args: ["--input", "Diff=@" + FIXTURE_TXT],
    // Drafter, auditor and reviser share the chat endpoint, in that order. Dispatch by call
    // order, not by system text — the reviser's system prompt is the sentinel under test.
    script(srv, seen) {
      srv.script("POST /api/v1/chat/completions", (req) => {
        seen.push(req.json);
        const content = [DRAFT_BODY, AUDIT_NOTES, FINAL_BODY][seen.length - 1];
        return { json: { choices: [{ message: { content } }], x_nanogpt_pricing: { costUsd: 0.001 } } };
      });
    },
    systemOf: (seen) => systemMessage(seen[seen.length - 1]),
    calls: 3,
  },
];

function systemMessage(body) {
  const msg = (body.messages || []).find((m) => m.role === "system");
  return msg ? msg.content : null;
}

test("the colliding-key list covers every bundled skill whose keys actually overlap", async () => {
  const graphs = COLLIDING.map((c) => c.dir);
  const found = [];
  for (const dir of [
    "skills/poster-generator/workflows/poster.noodle-graph.json",
    "skills/photo-restyler/workflows/photo-restyler.noodle-graph.json",
    "skills/jingle-maker/workflows/jingle.noodle-graph.json",
    "skills/narrated-poem/workflows/narrated-poem.noodle-graph.json",
    "skills/video-teaser/workflows/video-teaser.noodle-graph.json",
    "skills/alt-text-writer/workflows/alt-text.noodle-graph.json",
    "skills/visual-judge/workflows/visual-judge.noodle-graph.json",
    "skills/ui-mockup/workflows/ui-mockup.noodle-graph.json",
    "skills/pr-describer/workflows/pr-describe.noodle-graph.json",
    "skills/og-card-maker/workflows/og-card.noodle-graph.json",
  ]) {
    const wf = await Workflow.load(root + dir, { apiKey: "unused" });
    const outKeys = new Set(wf.outputs.map((o) => o.key));
    for (const i of wf.inputs) {
      if (!outKeys.has(i.key)) continue;
      found.push(dir.split("/").slice(0, 2).join("/"));
      // A rename cannot break the tie: both keys come from the same node's name.
      const out = wf.outputs.find((o) => o.key === i.key);
      assert.equal(i.nodeId, out.nodeId,
        `"${i.key}" collides across two different nodes in ${dir} — that IS separable by a rename, ` +
        "so fix the graph instead of documenting the clash");
    }
  }
  assert.deepEqual(found.sort(), [...graphs].sort(),
    "a bundled workflow gained or lost an input/output key collision — cover it here and in its SKILL.md");
});

for (const c of COLLIDING) {
  test(`${c.dir}: --input "${c.key}" and outputs["${c.key}"] are separate namespaces`, async (t) => {
    const srv = await startMockServer();
    t.after(() => srv.close());
    const seen = [];
    c.script(srv, seen);

    const { stdout } = await run(process.execPath, [
      CLI, "run", root + c.dir + "/" + c.graph,
      ...c.args, "--input", `${c.key}=${SENTINEL}`, "--json",
    ], {
      encoding: "utf8",
      timeout: 120_000,
      env: { ...process.env, NANOGPT_API_KEY: "test-key", NANOGPT_BASE_URL: srv.url },
    });

    const summary = JSON.parse(stdout);
    // (c) resolution is unambiguous: the run completed, so no key error was thrown.
    assert.deepEqual(summary.errors, [], "the collision must not error or make resolution ambiguous");
    assert.equal(seen.length, c.calls, `run must make ${c.calls} chat calls`);
    // (a) the input half reached the node's system prompt.
    assert.equal(c.systemOf(seen), SENTINEL,
      `--input "${c.key}=…" must replace that node's system prompt`);
    // (b) the output half still carries the node's result, unaffected by the input of the same name.
    assert.equal(summary.outputs[c.key], c.expectOutput,
      `outputs["${c.key}"] must carry the node's result, not the input value`);
    assert.notEqual(summary.outputs[c.key], SENTINEL);
  });
}
