---
name: poster-generator
description: Generate a poster image from a short idea — an LLM expands the idea into a detailed image prompt, then an image model renders it. Use when the user asks for a poster, illustration, or promo image from a one-line concept.
---

# Poster generator

Runs the bundled nanoodle workflow `workflows/poster.noodle-graph.json` against the NanoGPT
API: a text input (`Idea`) feeds an LLM that writes a vivid image prompt, which feeds an
image model that renders the poster (`Poster`). Requires Node.js 22.23.4+, 24.22.1+, or 26.12.1+ and the `nanoodle`
npm package (`npx nanoodle` fetches it).

## API key

The run needs a NanoGPT API key. Use whichever is available:

- `NANOGPT_API_KEY` already set in the environment — prefer this; no extra flags.
- A `.env` file containing `NANOGPT_API_KEY=...` — pass `--env-file <path>` only when the
  key is not already in the environment. (With this CLI, `--env-file` overrides ambient
  `NANOGPT_API_KEY`.)

Never print the key.

## Run

From this skill's directory (or prefix paths if running from elsewhere). Replace the `Idea`
value with the user's concept:

```sh
npx nanoodle run workflows/poster.noodle-graph.json \
  --input "Idea=a cozy ramen shop on a rainy night" \
  --out ./poster-out
```

Add `--env-file .env` only when the key is not already exported. For a machine-readable
payload (paths, cost, balance), add `--json`.

Optional style override (the workflow also exposes this input):

```sh
--input "System prompt=<custom image-prompt writer instructions>"
```

Inspect the interface anytime with:

```sh
npx nanoodle inspect workflows/poster.noodle-graph.json
```

## Inputs

| Key | Required | What to pass |
|-----|----------|--------------|
| `Idea` | yes | The poster concept, one line is enough |
| `System prompt` | no | Custom instructions for the prompt-writing LLM |

## Outputs

- Media is saved under `--out` as `Poster.<ext>` where `<ext>` follows the image MIME
  (often `jpg` or `png`). **Use the path the CLI prints on the `Poster:` line** — do not
  hard-code `.png`.
- With `--json`, the path is in `outputs.Poster` (and cost/balance in the same object).
- The CLI also prints total cost (and remaining balance when the API reports it) to stderr.

## Cost

Each run costs about **$0.04** in NanoGPT credit (the image step, `nano-banana-2-lite`,
dominates; the LLM prompt-writing step is a fraction of a cent). Runs spend real credit —
tell the user before running repeatedly.
