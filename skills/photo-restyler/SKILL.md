---
name: photo-restyler
description: Restyle an existing photo with a plain-English instruction — an image-edit model repaints the picture in the requested style. Use when the user has an image file and wants it restyled, re-lit, aged, cartoonified, or otherwise transformed while keeping the subject.
---

# Photo restyler

Runs the bundled nanoodle workflow `workflows/photo-restyler.noodle-graph.json` against the
NanoGPT API: an image input (`Photo`) plus a style instruction (`Style`) feed an image-edit
model that outputs the transformed picture (`Restyled`). Requires Node.js 22.23.4+, 24.22.1+, or26.12.1+ and the
`nanoodle` npm package (`npx nanoodle` fetches it).

## API key

The run needs a NanoGPT API key. Prefer `NANOGPT_API_KEY` already in the environment.
Otherwise pass `--env-file <path-to-.env>` (this CLI: `--env-file` overrides ambient env).

Never print the key.

## Run

From this skill's directory (or prefix paths if running from elsewhere). `@path` attaches a
local file; replace both values:

```sh
npx nanoodle run workflows/photo-restyler.noodle-graph.json \
  --input "Photo=@/path/to/photo.jpg" \
  --input "Style=make it look like a vintage 1970s film photograph — warm faded colors, soft grain, slight vignette" \
  --out ./restyle-out
```

Add `--env-file .env` only when the key is not already exported. Add `--json` for a
structured result (paths, costUsd, remainingBalance).

Inspect the interface anytime with:

```sh
npx nanoodle inspect workflows/photo-restyler.noodle-graph.json
```

## Inputs

| Key | Required | What to pass |
|-----|----------|--------------|
| `Photo` | yes | `@<path>` to the user's image file (jpg/png/webp) |
| `Style` | yes | The restyle instruction in plain English |

## Outputs

- Media is saved under `--out` as `Restyled.<ext>` — extension follows the image MIME.
  **Use the path the CLI prints on the `Restyled:` line**; do not hard-code `.png`.
- With `--json`, the path is in `outputs.Restyled`.

## Cost

Each run costs about **$0.04** in NanoGPT credit (one `nano-banana-2-lite` edit). Runs
spend real credit — tell the user before running repeatedly.
