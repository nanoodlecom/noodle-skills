---
name: jingle-maker
description: Turn a one-paragraph brief into a finished jingle with vocals — an LLM writes catchy lyrics, a second LLM invents a fitting musical style, and a music model sings it. Use when the user wants a jingle, theme song, ad spot, or any short custom song from a text brief.
---

# Jingle maker

Runs the bundled nanoodle workflow `workflows/jingle.noodle-graph.json` against the NanoGPT
API: a brief (`Brief`) feeds a lyric-writing LLM; the lyrics feed both a style-inventing LLM
and a music model, which renders the sung track (`Jingle`, ~30 seconds by default). Requires
Node.js 22.23.4+, 24.22.1+, or26.12.1+ and the `nanoodle` npm package (`npx nanoodle` fetches it).

## API key

The run needs a NanoGPT API key. Prefer `NANOGPT_API_KEY` already in the environment.
Otherwise pass `--env-file <path-to-.env>` (this CLI: `--env-file` overrides ambient env).

Never print the key.

## Run

From this skill's directory (or prefix paths if running from elsewhere). Replace the
`Brief` value with the user's brief:

```sh
npx nanoodle run workflows/jingle.noodle-graph.json \
  --input "Brief=An upbeat 30-second jingle for a neighborhood coffee shop called Morning Ember. Warm, catchy, repeat the shop name in the hook." \
  --out ./jingle-out
```

Add `--env-file .env` only when the key is not already exported. Add `--json` for a
structured result (paths, costUsd, remainingBalance). Music generation can take a minute
or two — don't kill the run early.

Optional overrides:

```sh
--input "Lyric writer=<custom lyric-writer instructions>"   # the lyric LLM
--input "Style writer=<custom style-writer instructions>"   # the style LLM
--set "n4.duration=60"                                      # longer track (seconds)
--set "n4.instrumental=true"                                # no vocals
```

Inspect the interface anytime with:

```sh
npx nanoodle inspect workflows/jingle.noodle-graph.json
```

## Inputs

| Key | Required | What to pass |
|-----|----------|--------------|
| `Brief` | yes | What the jingle is for — product, mood, length, anything to repeat |
| `Lyric writer` | no | Custom instructions for the lyric-writing LLM (its system prompt) |
| `Style writer` | no | Custom instructions for the style-inventing LLM (its system prompt) |

The two optional keys are the node names shown in the editor. Each one replaces the
system prompt of the node with that name.

## Outputs

- Media is saved under `--out` as `Jingle.<ext>` — extension follows the audio MIME
  (often `mp3`). **Use the path the CLI prints on the `Jingle:` line**; do not hard-code
  the extension.
- With `--json`, the path is in `outputs.Jingle`.

## Cost

Each run costs about **$0.05–0.10** in NanoGPT credit (the `Minimax-Music-02` song step
dominates; the two LLM steps are fractions of a cent). Runs spend real credit — tell the
user before running repeatedly.
