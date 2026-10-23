---
name: video-teaser
description: Turn a one-liner into a short video clip — an LLM expands the line into a cinematic shot description, then a text-to-video model renders a 5-second teaser. Use when the user wants a short video, teaser, clip, or animated shot from a sentence.
---

# Video teaser

Runs the bundled nanoodle workflow `workflows/video-teaser.noodle-graph.json` against the
NanoGPT API: a one-liner (`Tagline`) feeds an LLM that writes a single cinematic shot
description, which feeds a text-to-video model that renders a 5-second 480p clip
(`Teaser`). Requires Node.js 22.23.4+, 24.22.1+, or26.12.1+ and the `nanoodle` npm package (`npx nanoodle` fetches
it).

## API key

The run needs a NanoGPT API key. Prefer `NANOGPT_API_KEY` already in the environment.
Otherwise pass `--env-file <path-to-.env>` (this CLI: `--env-file` overrides ambient env).

Never print the key.

## Run

From this skill's directory (or prefix paths if running from elsewhere). Replace the
`Tagline` value with the user's line:

```sh
npx nanoodle run workflows/video-teaser.noodle-graph.json \
  --input "Tagline=a slow cinematic drone shot over a misty mountain valley at sunrise" \
  --out ./teaser-out
```

Add `--env-file .env` only when the key is not already exported. Add `--json` for a
structured result (paths, costUsd, remainingBalance). Video generation typically takes a
few minutes — don't kill the run early.

Optional overrides (each raises cost — see Cost below):

```sh
--input "Shot writer=<custom shot-writer instructions>"
--set "n3.resolution=720p"      # sharper (about $0.08/run) — 1080p about $0.12
--set "n3.duration=10"          # longer clip (roughly doubles the video cost)
--set "n3.aspect=9:16"          # portrait
```

Inspect the interface anytime with:

```sh
npx nanoodle inspect workflows/video-teaser.noodle-graph.json
```

## Inputs

| Key | Required | What to pass |
|-----|----------|--------------|
| `Tagline` | yes | The one-line concept for the clip |
| `Shot writer` | no | Custom instructions for the shot-writing LLM (its system prompt) |

`Shot writer` is the node name shown in the editor. It replaces that node's system prompt.

## Outputs

- Media is saved under `--out` as `Teaser.<ext>` — extension follows the video MIME
  (usually `mp4`). **Use the path the CLI prints on the `Teaser:` line**; do not hard-code
  the extension.
- With `--json`, the path is in `outputs.Teaser`.

## Cost

Each run costs about **$0.06** in NanoGPT credit at the default 5 seconds / 480p
(`ltx-2-19b` bills per second by resolution; the LLM step is a fraction of a cent).
Higher resolution or 10-second clips cost proportionally more. Runs spend real credit —
tell the user before running repeatedly.
