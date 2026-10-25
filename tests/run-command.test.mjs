// Stubbed end-to-end: prove the run command documented in EVERY skill's SKILL.md is
// LITERALLY correct — extract it from the markdown, execute it verbatim, and serve the
// NanoGPT API from a local node:http stub (NANOGPT_BASE_URL). Zero real spend.
//
// The only substitution: `@/path/to/…` file placeholders become a real fixture image —
// exactly the replacement each playbook instructs the agent to make ("Replace both
// values", "`@path` attaches a local file"). Everything else runs character-for-character.
import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { Workflow } from "nanoodle";

// MUST be async: the mock server lives in THIS process's event loop — a sync exec would
// block it and deadlock the child on its first HTTP request.
const run = promisify(execFile);
import { startMockServer, PNG_B64 } from "./harness/mock-server.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));

// Fixture image standing in for the user's file behind `@/path/to/…` placeholders.
// Named .jpg like the docs' examples → mediaFromFile derives image/jpeg from the extension.
const fixtureDir = mkdtempSync(join(tmpdir(), "noodle-skills-test-"));
const FIXTURE_JPG = join(fixtureDir, "fixture.jpg");
writeFileSync(FIXTURE_JPG, Buffer.from(PNG_B64, "base64"));
// Text fixture standing in for `@/tmp/….txt` placeholders (the CLI reads .txt as text).
const SAMPLE_DIFF = "diff --git a/config.js b/config.js\n-  cacheTtl: 60,\n+  cache_ttl_seconds: 60,";
const FIXTURE_TXT = join(fixtureDir, "fixture.txt");
writeFileSync(FIXTURE_TXT, SAMPLE_DIFF);
test.after(() => rmSync(fixtureDir, { recursive: true, force: true }));

/** First ```sh fence in SKILL.md that invokes `nanoodle run` — the documented command. */
function documentedRunCommand(skillDir) {
  const md = readFileSync(join(skillDir, "SKILL.md"), "utf8");
  const fences = [...md.matchAll(/```sh\n([\s\S]*?)```/g)].map((m) => m[1]);
  const cmd = fences.find((f) => f.includes("nanoodle run"));
  assert.ok(cmd, "SKILL.md must contain a ```sh fence with the nanoodle run command");
  return cmd.trim();
}

// Canned model replies, echoed back by the stub and asserted on the far side of each hop.
const POSTER_PROMPT = "Neon-lit ramen shop glowing through heavy rain, cinematic, warm lantern light.";
const LYRICS = "Morning Ember, light the day / pour the warmth and come our way";
const STYLE = "Upbeat acoustic pop with handclaps and a whistled hook";
const DESCRIPTION = "A weathered red rowboat rests on a misty lake at dawn.";
const POEM = "A rowboat waits on glassy water / dawn spills gold across the shore";
const SHOT = "Slow aerial push over a fog-draped valley, golden rim light on the peaks.";
const MP3_BYTES = Buffer.from("ID3fake-mp3-bytes-for-test");
const MP4_BYTES = Buffer.from("fake-mp4-bytes-for-test");
const ALT_JSON = '{"alt_125char": "A weathered red rowboat on a misty lake at dawn.", "numbered_caption": "Figure 1: A rowboat waits at dawn."}';
const PAGE_DESC = "Header with logo top-left. Three plan cards in a row; the middle card has no button. Footer overlaps nothing.";
const VERDICT_JSON = '{"pass": false, "violations": [{"issue": "Buy button missing on the middle plan card", "severity": "critical"}]}';
const DRAFT_BODY = "Renames the cache TTL config key. ## Changes ## Test plan";
const AUDIT_NOTES = "- draft omits that renaming cacheTtl to cache_ttl_seconds breaks existing configs";
const FINAL_BODY = "Renames the cache TTL config key. ## Changes ## Breaking changes: cacheTtl is now cache_ttl_seconds. ## Test plan";
const MOCKUP_PROMPT = "Desktop screenshot mockup: settings page with profile card, grouped notification toggles, danger zone footer.";
const SCENE = "Flat duotone illustration of two parallel conveyor belts merging, bold text 'v2.3.0' centered, deep indigo and warm coral.";
const OG_ALT = "Two parallel indigo conveyor belts merge beneath bold coral text reading v2.3.0.";

/**
 * One entry per skill: which stub routes to script, and which wiring facts to verify
 * once the documented command has run. `outDir` must match the command's --out flag
 * (cleaned up after); `placeholder` is the docs' stand-in file path, swapped for the
 * fixture image.
 */
const SKILLS = [
  {
    dir: "skills/poster-generator", outDir: "poster-out", key: "Poster", ext: /\.png$/,
    script(srv) {
      srv.script("POST /api/v1/chat/completions", {
        json: {
          choices: [{ message: { content: POSTER_PROMPT } }],
          x_nanogpt_pricing: { costUsd: 0.0012, remainingBalance: 4.9 },
        },
      });
      srv.script("POST /v1/images/generations", {
        json: { data: [{ b64_json: PNG_B64 }], cost: 0.02 },
      });
    },
    verify(srv) {
      // The documented --input value must have reached the LLM step on the stub.
      const chatReq = srv.of("POST /api/v1/chat/completions")[0];
      assert.ok(chatReq, "run must call the chat endpoint");
      assert.equal(chatReq.headers.authorization, "Bearer test-key");
      assert.ok(JSON.stringify(chatReq.json.messages).includes("a cozy ramen shop on a rainy night"),
        "the Idea input from the documented command must reach the chat request");
      // The LLM's prompt must have been wired into the image request.
      const imgReq = srv.of("POST /v1/images/generations")[0];
      assert.ok(imgReq, "run must call the image endpoint");
      assert.equal(imgReq.json.prompt, POSTER_PROMPT);
      assert.equal(imgReq.json.model, "nano-banana-2-lite");
    },
  },
  {
    dir: "skills/photo-restyler", outDir: "restyle-out", key: "Restyled", ext: /\.png$/,
    placeholder: "/path/to/photo.jpg",
    script(srv) {
      srv.script("POST /v1/images/generations", {
        json: { data: [{ b64_json: PNG_B64 }], cost: 0.04 },
      });
    },
    verify(srv) {
      const imgReq = srv.of("POST /v1/images/generations")[0];
      assert.ok(imgReq, "run must call the image endpoint");
      assert.equal(imgReq.headers.authorization, "Bearer test-key");
      assert.equal(imgReq.json.model, "nano-banana-2-lite");
      assert.ok(imgReq.json.prompt.includes("vintage 1970s film photograph"),
        "the Style input from the documented command must reach the edit request");
      // The @-attached Photo must ride along as an inline data URL of the fixture bytes.
      assert.ok(String(imgReq.json.imageDataUrl).startsWith("data:image/jpeg;base64,"),
        "the Photo file input must be inlined as a data URL");
      assert.ok(String(imgReq.json.imageDataUrl).includes(PNG_B64),
        "the fixture image bytes must reach the edit request");
    },
  },
  {
    dir: "skills/jingle-maker", outDir: "jingle-out", key: "Jingle", ext: /\.mp3$/,
    script(srv) {
      // Two LLM hops share one endpoint — answer by which system prompt is asking.
      srv.script("POST /api/v1/chat/completions", (req) => {
        const sys = JSON.stringify(req.json.messages);
        const content = sys.includes("jingle songwriter") ? LYRICS
          : sys.includes("musical style") ? STYLE : null;
        assert.ok(content, "chat request must come from the lyric or style writer:\n" + sys);
        return { json: { choices: [{ message: { content } }], x_nanogpt_pricing: { costUsd: 0.001 } } };
      });
      // Binary audio body → the CLI derives the extension from the content-type.
      srv.script("POST /api/v1/audio/speech", {
        headers: { "content-type": "audio/mpeg", "x-cost": "0.07" },
        body: MP3_BYTES,
      });
    },
    verify(srv) {
      const chats = srv.of("POST /api/v1/chat/completions");
      assert.equal(chats.length, 2, "run must call the chat endpoint twice (lyrics + style)");
      assert.ok(JSON.stringify(chats[0].json.messages).includes("Morning Ember"),
        "the Brief input from the documented command must reach the lyric writer");
      const audioReq = srv.of("POST /api/v1/audio/speech")[0];
      assert.ok(audioReq, "run must call the audio endpoint");
      assert.equal(audioReq.json.model, "Minimax-Music-02");
      assert.equal(audioReq.json.input, STYLE, "the style LLM's output must become the music prompt");
      assert.equal(audioReq.json.lyrics, LYRICS, "the lyric LLM's output must be wired into lyrics");
      assert.equal(audioReq.json.duration, 30);
    },
  },
  {
    dir: "skills/narrated-poem", outDir: "poem-out", key: "Narration", ext: /\.mp3$/,
    placeholder: "/path/to/picture.jpg",
    script(srv) {
      // Vision + poet share one endpoint — answer by model id.
      srv.script("POST /api/v1/chat/completions", (req) => {
        const content = req.json.model === "gemini-2.5-flash-lite" ? DESCRIPTION
          : req.json.model === "zai-org/glm-5.2" ? POEM : null;
        assert.ok(content, "unexpected chat model: " + req.json.model);
        return { json: { choices: [{ message: { content } }], x_nanogpt_pricing: { costUsd: 0.001 } } };
      });
      srv.script("POST /api/v1/audio/speech", {
        headers: { "content-type": "audio/mpeg", "x-cost": "0.002" },
        body: MP3_BYTES,
      });
    },
    verify(srv) {
      const chats = srv.of("POST /api/v1/chat/completions");
      assert.equal(chats.length, 2, "run must call the chat endpoint twice (vision + poet)");
      const [visionReq, poetReq] = chats;
      assert.ok(JSON.stringify(visionReq.json.messages).includes("data:image/jpeg;base64," + PNG_B64),
        "the @-attached Picture must reach the vision request as an inline data URL");
      assert.ok(JSON.stringify(poetReq.json.messages).includes(DESCRIPTION),
        "the vision model's description must feed the poet LLM");
      const ttsReq = srv.of("POST /api/v1/audio/speech")[0];
      assert.ok(ttsReq, "run must call the audio endpoint");
      assert.equal(ttsReq.json.model, "Kokoro-82m");
      assert.equal(ttsReq.json.input, POEM, "the poet LLM's output must become the spoken text");
    },
  },
  {
    // Video jobs return a hosted URL; since 0.4.0 the CLI derives the extension from the
    // download's Content-Type, so the stubbed video/mp4 response must save as ".mp4".
    dir: "skills/video-teaser", outDir: "teaser-out", key: "Teaser", ext: /\.mp4$/,
    script(srv) {
      srv.script("POST /api/v1/chat/completions", {
        json: { choices: [{ message: { content: SHOT } }], x_nanogpt_pricing: { costUsd: 0.001 } },
      });
      srv.script("POST /api/generate-video", { json: { runId: "run-1", cost: 0.06 } });
      srv.script("GET /api/video/status", {
        json: { status: "COMPLETED", output: { url: srv.url + "/cdn/teaser" } },
      });
      // The "CDN" download the executor performs once the job completes.
      srv.script("GET /cdn/teaser", { headers: { "content-type": "video/mp4" }, body: MP4_BYTES });
    },
    verify(srv) {
      const chatReq = srv.of("POST /api/v1/chat/completions")[0];
      assert.ok(chatReq, "run must call the chat endpoint");
      assert.ok(JSON.stringify(chatReq.json.messages).includes("misty mountain valley at sunrise"),
        "the Tagline input from the documented command must reach the shot writer");
      const vidReq = srv.of("POST /api/generate-video")[0];
      assert.ok(vidReq, "run must call the video endpoint");
      assert.equal(vidReq.json.model, "ltx-2-19b");
      assert.equal(vidReq.json.prompt, SHOT, "the shot LLM's output must become the video prompt");
      assert.equal(vidReq.json.resolution, "480p");
      assert.equal(vidReq.json.duration, "5");
      assert.equal(vidReq.json.aspect_ratio, "16:9");
      assert.ok(srv.of("GET /api/video/status").length >= 1, "run must poll the video status endpoint");
    },
  },
  {
    dir: "skills/alt-text-writer", textKey: "Alt text", textValue: ALT_JSON,
    placeholder: "/path/to/image.jpg",
    script(srv) {
      srv.script("POST /api/v1/chat/completions", {
        json: { choices: [{ message: { content: ALT_JSON } }], x_nanogpt_pricing: { costUsd: 0.0004 } },
      });
    },
    verify(srv) {
      const req = srv.of("POST /api/v1/chat/completions")[0];
      assert.ok(req, "run must call the chat endpoint");
      assert.equal(req.json.model, "gemini-2.5-flash-lite");
      const msgs = JSON.stringify(req.json.messages);
      assert.ok(msgs.includes("data:image/jpeg;base64," + PNG_B64),
        "the @-attached Image must reach the vision request as an inline data URL");
      assert.ok(msgs.includes("alt_125char"),
        "the joined Alt rules text must override the vision question");
    },
  },
  {
    dir: "skills/visual-judge", textKey: "Verdict", textValue: VERDICT_JSON,
    placeholder: "/path/to/screenshot.jpg",
    script(srv) {
      // Describer + judge share one endpoint — answer by model id.
      srv.script("POST /api/v1/chat/completions", (req) => {
        const content = req.json.model === "openai/gpt-5.4-mini" ? PAGE_DESC
          : req.json.model === "zai-org/glm-5.2" ? VERDICT_JSON : null;
        assert.ok(content, "unexpected chat model: " + req.json.model);
        return { json: { choices: [{ message: { content } }], x_nanogpt_pricing: { costUsd: 0.002 } } };
      });
    },
    verify(srv) {
      const chats = srv.of("POST /api/v1/chat/completions");
      assert.equal(chats.length, 2, "run must call the chat endpoint twice (describer + judge)");
      const [visionReq, judgeReq] = chats;
      assert.ok(JSON.stringify(visionReq.json.messages).includes("data:image/jpeg;base64," + PNG_B64),
        "the @-attached Screenshot must reach the describer as an inline data URL");
      const judgeMsgs = JSON.stringify(judgeReq.json.messages);
      assert.ok(judgeMsgs.includes(PAGE_DESC), "the describer's output must reach the judge");
      assert.ok(judgeMsgs.includes("three plan cards"),
        "the Spec input from the documented command must reach the judge");
      assert.equal(judgeReq.json.temperature, 0, "the judge must run at temperature 0");
    },
  },
  {
    dir: "skills/ui-mockup", outDir: "mockup-out", key: "Mockup", ext: /\.png$/,
    script(srv) {
      srv.script("POST /api/v1/chat/completions", {
        json: { choices: [{ message: { content: MOCKUP_PROMPT } }], x_nanogpt_pricing: { costUsd: 0.001 } },
      });
      srv.script("POST /v1/images/generations", {
        json: { data: [{ b64_json: PNG_B64 }], cost: 0.04 },
      });
    },
    verify(srv) {
      const chatReq = srv.of("POST /api/v1/chat/completions")[0];
      assert.ok(chatReq, "run must call the chat endpoint");
      const msgs = JSON.stringify(chatReq.json.messages);
      assert.ok(msgs.includes("danger zone at the bottom"),
        "the Feature input from the documented command must reach the prompt writer");
      assert.ok(msgs.includes("clean SaaS dashboard"),
        "the default Style guide must ride along in the brief");
      const imgReq = srv.of("POST /v1/images/generations")[0];
      assert.ok(imgReq, "run must call the image endpoint");
      assert.equal(imgReq.json.model, "nano-banana-2-lite");
      assert.equal(imgReq.json.prompt, MOCKUP_PROMPT, "the LLM's prompt must be wired into the image request");
    },
  },
  {
    dir: "skills/pr-describer", textKey: "Final PR body", textValue: FINAL_BODY,
    textPlaceholder: "/tmp/pr-diff.txt",
    script(srv) {
      // Three LLM hops share one endpoint — answer by which system prompt is asking.
      srv.script("POST /api/v1/chat/completions", (req) => {
        const sys = JSON.stringify(req.json.messages);
        const content = sys.includes("write pull request descriptions") ? DRAFT_BODY
          : sys.includes("audit PR descriptions") ? AUDIT_NOTES
          : sys.includes("auditor notes") ? FINAL_BODY : null;
        assert.ok(content, "chat request must come from drafter, auditor, or reviser:\n" + sys);
        return { json: { choices: [{ message: { content } }], x_nanogpt_pricing: { costUsd: 0.001 } } };
      });
    },
    verify(srv) {
      const chats = srv.of("POST /api/v1/chat/completions");
      assert.equal(chats.length, 3, "run must call the chat endpoint three times (draft, audit, revise)");
      const [draftReq, auditReq, reviseReq] = chats;
      assert.ok(JSON.stringify(draftReq.json.messages).includes("cache_ttl_seconds"),
        "the @-attached Diff must reach the drafter as text");
      const auditMsgs = JSON.stringify(auditReq.json.messages);
      assert.ok(auditMsgs.includes("cache_ttl_seconds") && auditMsgs.includes(DRAFT_BODY),
        "the auditor must see both the raw diff and the draft");
      assert.ok(JSON.stringify(reviseReq.json.messages).includes(AUDIT_NOTES),
        "the auditor's notes must reach the reviser");
    },
  },
  {
    dir: "skills/og-card-maker", outDir: "og-out", key: "Hero", ext: /\.png$/,
    textKey: "AltText", textValue: OG_ALT,
    script(srv) {
      // Art director (llm) and alt-text (vision) share the chat endpoint; the card render is a plain image generation.
      srv.script("POST /api/v1/chat/completions", (req) => {
        if (req.json.model === "zai-org/glm-5.2")
          return { json: { choices: [{ message: { content: SCENE } }], x_nanogpt_pricing: { costUsd: 0.001 } } };
        if (req.json.model === "moonshotai/kimi-k3")
          return { json: { choices: [{ message: { content: OG_ALT } }], x_nanogpt_pricing: { costUsd: 0.001 } } };
        assert.fail("unexpected chat model: " + req.json.model);
      });
      srv.script("POST /v1/images/generations", {
        json: { data: [{ b64_json: PNG_B64 }], cost: 0.04 },
      });
    },
    verify(srv) {
      const byModel = (m) => srv.of("POST /api/v1/chat/completions").filter((r) => r.json.model === m);
      const artReq = byModel("zai-org/glm-5.2")[0];
      assert.ok(artReq, "run must call the art-director LLM");
      assert.ok(JSON.stringify(artReq.json.messages).includes("v2.3.0"),
        "the Post input from the documented command must reach the art director");
      const imgReq = srv.of("POST /v1/images/generations")[0];
      assert.ok(imgReq, "run must call the image endpoint");
      assert.equal(imgReq.json.model, "nano-banana-2-lite");
      assert.ok(String(imgReq.json.prompt).includes(SCENE),
        "the art director's prompt must reach the image model");
      const visReq = byModel("moonshotai/kimi-k3")[0];
      assert.ok(visReq, "run must call the alt-text vision model");
      assert.ok(JSON.stringify(visReq.json.messages).includes(PNG_B64),
        "the rendered image must reach the alt-text vision call");
    },
  },
];

for (const s of SKILLS) {
  const skillDir = join(root, s.dir);

  test(`${s.dir} SKILL.md run command works verbatim against a stub API`, async (t) => {
    const srv = await startMockServer();
    t.after(() => srv.close());
    if (s.outDir) t.after(() => rmSync(join(skillDir, s.outDir), { recursive: true, force: true }));
    s.script(srv);

    let cmd = documentedRunCommand(skillDir);
    if (s.outDir) assert.ok(cmd.includes("--out ./" + s.outDir), "documented command must write to ./" + s.outDir);
    if (s.placeholder) {
      assert.ok(cmd.includes("@" + s.placeholder),
        `documented command must attach a file as @${s.placeholder}`);
      cmd = cmd.replaceAll("@" + s.placeholder, "@" + FIXTURE_JPG);
    }
    if (s.textPlaceholder) {
      assert.ok(cmd.includes("@" + s.textPlaceholder),
        `documented command must attach a text file as @${s.textPlaceholder}`);
      cmd = cmd.replaceAll("@" + s.textPlaceholder, "@" + FIXTURE_TXT);
    }

    // Run exactly what the playbook says, from the skill directory it says to run from.
    // PATH gets this repo's node_modules/.bin so `npx nanoodle` resolves offline.
    const { stdout, stderr } = await run("sh", ["-c", cmd], {
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

    // The run summary on stdout is the contract every playbook points agents at.
    const summary = JSON.parse(stdout);
    assert.deepEqual(summary.errors, [], "run must finish with no node errors");

    // Media outputs: the CLI must report the documented key (0.4.x: on stderr) and save the file.
    if (s.key) {
      const m = stderr.match(new RegExp(`^${s.key}: saved (.+)$`, "m"));
      assert.ok(m, `CLI must print a '${s.key}: saved <path>' line, got:\n` + stderr);
      const saved = resolve(skillDir, m[1]);
      assert.ok(existsSync(saved), "saved output file must exist: " + saved);
      assert.match(saved, s.ext);
      assert.equal(resolve(skillDir, summary.outputs[s.key]), saved,
        "stdout summary must agree with the saved path (SKILL.md: 'the path is in outputs.<Key>')");
    }

    // Text outputs: printed on stderr as '<Key>: …' and carried verbatim in the summary.
    if (s.textKey) {
      assert.match(stderr, new RegExp(`^${s.textKey}: `, "m"),
        `CLI must print a '${s.textKey}: …' line, got:\n` + stderr);
      assert.equal(summary.outputs[s.textKey], s.textValue,
        `stdout summary must carry the model's text in outputs["${s.textKey}"]`);
    }

    s.verify(srv);
  });
}

test("video-teaser: documented resolution edit reaches the API without a catalog", async () => {
  const skillDir = join(root, "skills/video-teaser");
  const md = readFileSync(join(skillDir, "SKILL.md"), "utf8");
  const fields = JSON.parse(md.match(/```json\n([\s\S]*?)```/)[1]);
  const graph = JSON.parse(readFileSync(join(skillDir, "workflows/video-teaser.noodle-graph.json"), "utf8"));
  Object.assign(graph.nodes.find((n) => n.id === "n3").fields, fields);

  let videoBody;
  const wf = Workflow.fromJSON(graph, {
    apiKey: "offline-test", baseUrl: "http://offline.invalid", pollIntervals: { video: 0 },
    fetch: async (url, opts) => {
      const path = new URL(url).pathname;
      let json;
      if (path === "/api/v1/chat/completions") {
        json = { choices: [{ message: { content: SHOT } }] };
      } else if (path === "/api/generate-video") {
        videoBody = JSON.parse(opts.body);
        json = { runId: "resolution-test" };
      } else if (path === "/api/video/status") {
        json = { status: "COMPLETED", output: { url: "http://offline.invalid/teaser.mp4" } };
      } else {
        assert.fail("unexpected request: " + url);
      }
      return new Response(JSON.stringify(json), { headers: { "content-type": "application/json" } });
    },
  });
  await wf.run({ Tagline: "offline resolution test" });
  assert.equal(videoBody.resolution, "720p");
  assert.equal(videoBody.duration, "5");
  assert.equal(videoBody.aspect_ratio, "16:9");
  assert.equal(videoBody.prompt, SHOT);
});
