---
name: og-card-maker
description: Generate a 1200×630 social/OG card in a locked house style from a post or release line, plus honest alt text written by a vision model that looked at the final render. Use when a blog post, release, or project page needs a link-preview image that matches the content.
---

# OG card maker

Runs the bundled nanoodle workflow `workflows/og-card.noodle-graph.json` against the
NanoGPT API in four stages: the content (`Post`) and a locked art direction (`Style`) are
joined into a briefing; an LLM art-director writes one disciplined image prompt composed
for a wide landscape crop (for releases, the literal version string must appear as
rendered text); an image model (`nano-banana-2-lite`) paints the card — check the
`AltText` output to confirm any literal text rendered correctly; then the image fans out
to a local resize (`Hero`, exactly
1200×630 — the OG spec) and a vision model that writes alt text (`AltText`) from the actual
pixels — if the render botched something, the alt text says what is really there. Requires
Node.js 22.23.4+, 24.22.1+, or 26.12.1+ and the `nanoodle` npm package (`npx nanoodle` fetches it).

## API key

The run needs a NanoGPT API key. Use whichever is available:

- `NANOGPT_API_KEY` already set in the environment — prefer this; no extra flags.
- A `.env` file containing `NANOGPT_API_KEY=...` — pass `--env-file <path>` only when the
  key is not already in the environment. (With this CLI, `--env-file` overrides ambient
  `NANOGPT_API_KEY`.)

Never print the key.

## Run

From this skill's directory (or prefix paths if running from elsewhere). Pass the post body
(or a `vX.Y.Z — changelog line` for releases) as `Post`:

```sh
npx nanoodle run workflows/og-card.noodle-graph.json \
  --input "Post=v2.3.0 — parallel graph execution lands, twice as fast on wide graphs" \
  --out ./og-out
```

A whole post attaches as a file (`.md`/`.txt` are read as text):
`--input "Post=@content/posts/my-post.md"`. Lock in your own look by overriding `Style`
once and keeping it verbatim across runs — consistency is what makes the cards yours.

Inspect the interface anytime with:

```sh
npx nanoodle inspect workflows/og-card.noodle-graph.json
```

## Inputs

| Key | Required | What to pass |
|-----|----------|--------------|
| `Post` | yes | Post body, or `vX.Y.Z — <changelog line>` for a release |
| `Style` | no (default baked in) | House art direction: palette, composition rules, what to avoid |
| `System prompt` | no | Override the art-director LLM's instructions |

## Outputs

- `Hero` is the card: saved under `--out` as `Hero.<ext>`, already resized/cropped to
  1200×630. **Use the path the CLI prints on the `Hero:` line** — do not hard-code `.png`.
- `AltText` is a **text** output: printed on the `AltText:` stderr line and included in the
  stdout JSON as `outputs.AltText` — one factual sentence, ready for the post's front
  matter or `og:image:alt`.

## Serve as an MCP tool

The same graph file works unchanged as a typed MCP tool for interactive one-offs
("regenerate the card for the caching post, moodier"):

```sh
mkdir -p ~/noodles && cp workflows/og-card.noodle-graph.json ~/noodles/og-card.json
claude mcp add nanoodle -- npx nanoodle-mcp --graphs ~/noodles --out ~/noodle-out
```

## Cost

Each run costs about **$0.05** in NanoGPT credit (the image generation is ~$0.04; the
LLM and vision steps are a cent or less combined). The resize is local and free. Runs
spend real credit — tell the user before regenerating repeatedly.
