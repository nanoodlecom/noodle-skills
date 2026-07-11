// Stubbed end-to-end: prove the run command documented in poster-generator/SKILL.md is
// LITERALLY correct — extract it from the markdown, execute it verbatim, and serve the
// NanoGPT API from a local node:http stub (NANOGPT_BASE_URL). Zero real spend.
import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { delimiter, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

// MUST be async: the mock server lives in THIS process's event loop — a sync exec would
// block it and deadlock the child on its first HTTP request.
const run = promisify(execFile);
import { startMockServer, PNG_B64 } from "./harness/mock-server.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const skillDir = join(root, "skills", "poster-generator");

/** First ```sh fence in SKILL.md that invokes `nanoodle run` — the documented command. */
function documentedRunCommand() {
  const md = readFileSync(join(skillDir, "SKILL.md"), "utf8");
  const fences = [...md.matchAll(/```sh\n([\s\S]*?)```/g)].map((m) => m[1]);
  const cmd = fences.find((f) => f.includes("nanoodle run"));
  assert.ok(cmd, "SKILL.md must contain a ```sh fence with the nanoodle run command");
  return cmd.trim();
}

test("poster-generator SKILL.md run command works verbatim against a stub API", async (t) => {
  const srv = await startMockServer();
  t.after(() => srv.close());
  t.after(() => rmSync(join(skillDir, "poster-out"), { recursive: true, force: true }));

  const PROMPT = "Neon-lit ramen shop glowing through heavy rain, cinematic, warm lantern light.";
  srv.script("POST /api/v1/chat/completions", {
    json: {
      choices: [{ message: { content: PROMPT } }],
      x_nanogpt_pricing: { costUsd: 0.0012, remainingBalance: 4.9 },
    },
  });
  srv.script("POST /v1/images/generations", {
    json: { data: [{ b64_json: PNG_B64 }], cost: 0.02 },
  });

  const cmd = documentedRunCommand();
  // Run exactly what the playbook says, from the skill directory it says to run from.
  // PATH gets this repo's node_modules/.bin so `npx nanoodle` resolves offline.
  const { stdout } = await run("sh", ["-c", cmd], {
    cwd: skillDir,
    encoding: "utf8",
    timeout: 120_000,
    env: {
      ...process.env,
      PATH: resolve(root, "node_modules", ".bin") + delimiter + process.env.PATH,
      NANOGPT_API_KEY: "test-key",
      NANOGPT_BASE_URL: srv.url,
    },
  });

  // The CLI must report the documented output key and actually save the file.
  const m = stdout.match(/^Poster: saved (.+)$/m);
  assert.ok(m, "CLI must print a 'Poster: saved <path>' line, got:\n" + stdout);
  const saved = resolve(skillDir, m[1]);
  assert.ok(existsSync(saved), "saved poster file must exist: " + saved);
  assert.match(saved, /Poster\.png$/); // stub returns a PNG → MIME-derived extension

  // The documented --input value must have reached the LLM step on the stub.
  const chatReq = srv.of("POST /api/v1/chat/completions")[0];
  assert.ok(chatReq, "run must call the chat endpoint");
  assert.equal(chatReq.headers.authorization, "Bearer test-key");
  assert.ok(JSON.stringify(chatReq.json.messages).includes("a cozy ramen shop on a rainy night"),
    "the Idea input from the documented command must reach the chat request");

  // The LLM's prompt must have been wired into the image request.
  const imgReq = srv.of("POST /v1/images/generations")[0];
  assert.ok(imgReq, "run must call the image endpoint");
  assert.equal(imgReq.json.prompt, PROMPT);
  assert.equal(imgReq.json.model, "nano-banana-2-lite");
});
