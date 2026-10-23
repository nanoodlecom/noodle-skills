---
name: ui-mockup
description: Render a UI mockup image from a one-line feature description — an LLM turns the description plus a style guide into a precise screenshot-style image prompt, then an image model renders it. Use to show the user what a screen could look like before writing any frontend code, or to settle "option A or option B" layout questions by rendering both.
---

# UI mockup

Runs the bundled nanoodle workflow `workflows/ui-mockup.noodle-graph.json` against the
NanoGPT API: the feature description (`Feature`) and a product style guide (`Style guide`)
are joined into a brief, an LLM turns the brief into one disciplined image prompt for a
screenshot-style mockup (explicit layout regions, exact palette, short realistic labels, no
lorem-ipsum walls), and an image model renders it (`Mockup`). Requires Node.js 22.23.4+, 24.22.1+, or 26.12.1+ and
the `nanoodle` npm package (`npx nanoodle` fetches it).

Typical agent use: about to build or propose a screen, render the napkin sketch first, drop
the file path in the conversation, and ask "like this?" before writing JSX.

## API key

The run needs a NanoGPT API key. Use whichever is available:

- `NANOGPT_API_KEY` already set in the environment — prefer this; no extra flags.
- A `.env` file containing `NANOGPT_API_KEY=...` — pass `--env-file <path>` only when the
  key is not already in the environment. (With this CLI, `--env-file` overrides ambient
  `NANOGPT_API_KEY`.)

Never print the key.

## Run

From this skill's directory (or prefix paths if running from elsewhere). Replace the
`Feature` value with the screen being mocked:

```sh
npx nanoodle run workflows/ui-mockup.noodle-graph.json \
  --input "Feature=settings page: profile card, notification toggles grouped by channel, danger zone at the bottom" \
  --out ./mockup-out
```

Match the target product by overriding the style guide (a baked-in clean-SaaS default runs
otherwise):

```sh
--input "Style guide=dark mode, near-black background, emerald primary, dense data tables"
```

Inspect the interface anytime with:

```sh
npx nanoodle inspect workflows/ui-mockup.noodle-graph.json
```

## Inputs

| Key | Required | What to pass |
|-----|----------|--------------|
| `Feature` | yes | The screen to mock, one sentence of plain language |
| `Style guide` | no (default baked in) | The product's look: palette, spacing, light/dark, component vibe |
| `System prompt` | no | Override the prompt-writer's instructions |

## Outputs

- Media is saved under `--out` as `Mockup.<ext>` following the image MIME. **Use the path
  the CLI prints on the `Mockup:` line** — do not hard-code `.png`.
- The stdout JSON summary carries the path in `outputs.Mockup` (and cost/balance).

## Serve as an MCP tool

The same graph file works unchanged as a typed MCP tool — the agent gets a `render-mockup`
tool it can call many times a day:

```sh
mkdir -p ~/noodles && cp workflows/ui-mockup.noodle-graph.json ~/noodles/render-mockup.json
claude mcp add nanoodle -- npx nanoodle-mcp --graphs ~/noodles --out ~/noodle-out
```

## Cost

Each run costs about **$0.04** in NanoGPT credit (the image step, `nano-banana-2-lite`,
dominates; the prompt-writing LLM is a fraction of a cent). This is a napkin sketch, not
marketing art — one fast, cheap render per question. Runs spend real credit — tell the user
before running repeatedly.
