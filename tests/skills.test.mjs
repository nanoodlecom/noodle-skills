// Offline guards for every bundled skill — no server, no run(), zero NanoGPT spend.
//
// Per skill:
//   (a) `nanoodle inspect` (offline, via the devDependency CLI) succeeds on the graph
//   (b) the derived input / output keys match what SKILL.md documents
//   (c) every model-bearing node ships with a non-empty fields.model
//       (the executor refuses model-less nodes: "pick a model first")
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Workflow, SETTING_SPECS } from "nanoodle";

const root = fileURLToPath(new URL("..", import.meta.url));
const CLI = fileURLToPath(new URL("../node_modules/nanoodle/bin/nanoodle.mjs", import.meta.url));

/** What each SKILL.md documents. Changing a graph or a doc must keep these in sync. */
const SKILLS = [
  {
    dir: "skills/poster-generator", graph: "workflows/poster.noodle-graph.json",
    required: ["Idea"], optional: ["System prompt"], outputs: ["Poster"],
  },
  {
    dir: "skills/photo-restyler", graph: "workflows/photo-restyler.noodle-graph.json",
    required: ["Photo", "Style"], optional: [], outputs: ["Restyled"],
  },
  {
    dir: "skills/jingle-maker", graph: "workflows/jingle.noodle-graph.json",
    required: ["Brief"], optional: ["System prompt", "System prompt 2"], outputs: ["Jingle"],
  },
  {
    dir: "skills/narrated-poem", graph: "workflows/narrated-poem.noodle-graph.json",
    required: ["Picture"], optional: ["System prompt"], outputs: ["Narration"],
  },
  {
    dir: "skills/video-teaser", graph: "workflows/video-teaser.noodle-graph.json",
    required: ["Tagline"], optional: ["System prompt"], outputs: ["Teaser"],
  },
  {
    dir: "skills/alt-text-writer", graph: "workflows/alt-text.noodle-graph.json",
    required: ["Image", "Alt rules", "Style guide"], optional: [], outputs: ["Alt text"],
  },
  {
    dir: "skills/visual-judge", graph: "workflows/visual-judge.noodle-graph.json",
    required: ["Screenshot", "Spec"], optional: ["System prompt"], outputs: ["Verdict"],
  },
  {
    dir: "skills/ui-mockup", graph: "workflows/ui-mockup.noodle-graph.json",
    required: ["Feature", "Style guide"], optional: ["System prompt"], outputs: ["Mockup"],
  },
  {
    dir: "skills/pr-describer", graph: "workflows/pr-describe.noodle-graph.json",
    required: ["Diff"], optional: ["System prompt", "System prompt 2", "System prompt 3"],
    outputs: ["Final PR body"],
  },
  {
    dir: "skills/og-card-maker", graph: "workflows/og-card.noodle-graph.json",
    required: ["Post", "Style"], optional: ["System prompt", "System prompt 2"],
    outputs: ["Hero", "AltText"],
  },
];

/** Node types whose SETTING_SPECS include a model knob → committed graphs must pin one. */
const MODEL_BEARING = new Set(
  Object.entries(SETTING_SPECS)
    .filter(([, specs]) => specs.some((s) => s.f === "model"))
    .map(([type]) => type),
);

for (const s of SKILLS) {
  const graphPath = root + s.dir + "/" + s.graph;

  test(`${s.dir}: nanoodle inspect succeeds offline`, () => {
    const out = execFileSync(process.execPath, [CLI, "inspect", graphPath], {
      encoding: "utf8",
      env: { ...process.env, NANOGPT_API_KEY: "offline-test", NANOGPT_BASE_URL: "http://127.0.0.1:9" },
    });
    assert.match(out, /Inputs:/);
    assert.match(out, /Outputs:/);
    assert.ok(!/warning:/.test(out), "inspect must print no warnings:\n" + out);
  });

  test(`${s.dir}: derived keys match SKILL.md`, async () => {
    const wf = await Workflow.load(graphPath, { apiKey: "unused" });
    assert.deepEqual(wf.warnings, []);
    assert.deepEqual(
      wf.inputs.filter((i) => !i.optional).map((i) => i.key), s.required,
      "required input keys must match SKILL.md's --input flags");
    assert.deepEqual(
      wf.inputs.filter((i) => i.optional).map((i) => i.key), s.optional,
      "optional input keys must match SKILL.md's documented overrides");
    assert.deepEqual(
      wf.outputs.map((o) => o.key), s.outputs,
      "output keys must match SKILL.md's documented <Key>.<ext>");

    // Every documented key must literally appear in the SKILL.md body.
    const md = readFileSync(root + s.dir + "/SKILL.md", "utf8");
    for (const key of [...s.required, ...s.optional, ...s.outputs]) {
      assert.ok(md.includes(key), `SKILL.md must mention key "${key}"`);
    }
  });

  test(`${s.dir}: every model-bearing node pins a model`, async () => {
    const wf = await Workflow.load(graphPath, { apiKey: "unused" });
    for (const n of wf.graph.nodes) {
      if (!MODEL_BEARING.has(n.type)) continue;
      assert.ok(
        typeof n.fields.model === "string" && n.fields.model.trim() !== "",
        `node ${n.id} (${n.type}) must have fields.model set — the executor refuses model-less nodes`);
    }
  });
}
