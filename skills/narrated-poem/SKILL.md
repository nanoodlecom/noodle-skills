---
name: narrated-poem
description: Turn a picture into a spoken poem — a vision model describes the image, an LLM writes a short poem from the description, and a text-to-speech model narrates it. Use when the user wants a poem, narration, or spoken-word piece inspired by an image file.
---

# Narrated poem

Runs the bundled nanoodle workflow `workflows/narrated-poem.noodle-graph.json` against the
NanoGPT API: an image input (`Picture`) feeds a vision model that describes it, an LLM turns
the description into a four-line poem, and a TTS model speaks it (`Narration`). Requires
Node.js >= 20 and the `nanoodle` npm package (`npx nanoodle` fetches it).

## API key

The run needs a NanoGPT API key. Prefer `NANOGPT_API_KEY` already in the environment.
Otherwise pass `--env-file <path-to-.env>` (this CLI: `--env-file` overrides ambient env).

Never print the key.

## Run

From this skill's directory (or prefix paths if running from elsewhere). `@path` attaches a
local file:

```sh
npx nanoodle run workflows/narrated-poem.noodle-graph.json \
  --input "Picture=@/path/to/picture.jpg" \
  --out ./poem-out
```

Add `--env-file .env` only when the key is not already exported. Add `--json` for a
structured result (paths, costUsd, remainingBalance).

Optional overrides:

```sh
--input "System prompt=<custom poet instructions, e.g. write a limerick instead>"
--set "n4.voice=am_michael"        # pick a Kokoro voice (af_bella, am_adam, bf_emma, …)
--set "n2.q=<different question to ask about the image>"
```

Inspect the interface anytime with:

```sh
npx nanoodle inspect workflows/narrated-poem.noodle-graph.json
```

## Inputs

| Key | Required | What to pass |
|-----|----------|--------------|
| `Picture` | yes | `@<path>` to the user's image file (jpg/png/webp) |
| `System prompt` | no | Custom instructions for the poem-writing LLM |

## Outputs

- Media is saved under `--out` as `Narration.<ext>` — extension follows the audio MIME
  (often `mp3` or `wav`). **Use the path the CLI prints on the `Narration:` line**; do not
  hard-code the extension.
- With `--json`, the path is in `outputs.Narration`.

## Cost

Each run costs about **$0.01** in NanoGPT credit (vision + LLM are fractions of a cent;
`Kokoro-82m` speech is ~$0.002 per poem). Runs spend real credit — tell the user before
running repeatedly.
