---
name: alt-text-writer
description: Write accurate alt text and a figure caption for any image file — a vision model looks at the actual pixels and returns JSON with a 125-char alt string and a one-sentence caption. Use when filling in alt="" attributes, writing figure captions, or describing screenshots the agent cannot see.
---

# Alt-text writer

Runs the bundled nanoodle workflow `workflows/alt-text.noodle-graph.json` against the
NanoGPT API: an image input (`Image`) feeds a vision model whose question is assembled from
two text nodes — the alt-text rules (`Alt rules`) and an optional house style guide
(`Style guide`) — and the output (`Alt text`) is JSON with `alt_125char` and
`numbered_caption`. Requires Node.js 22.23.4+, 24.22.1+, or 26.12.1+ and the `nanoodle` npm package (`npx nanoodle`
fetches it).

Typical agent use: mid-PR, glob the repo's images, call this once per file, and write the
returned `alt_125char` into the markup instead of guessing at pixels you cannot see.

## API key

The run needs a NanoGPT API key. Use whichever is available:

- `NANOGPT_API_KEY` already set in the environment — prefer this; no extra flags.
- A `.env` file containing `NANOGPT_API_KEY=...` — pass `--env-file <path>` only when the
  key is not already in the environment. (With this CLI, `--env-file` overrides ambient
  `NANOGPT_API_KEY`.)

Never print the key.

## Run

From this skill's directory (or prefix paths if running from elsewhere). Replace the image
path with the real file (`@path` attaches a local file; an `https://` URL also works):

```sh
npx nanoodle run workflows/alt-text.noodle-graph.json \
  --input "Image=@/path/to/image.jpg"
```

The output is text, so no `--out` directory is needed. For a machine-readable payload
(outputs, cost, balance), the run summary JSON is always printed on stdout.

Optional overrides (both have baked-in defaults):

```sh
--input "Alt rules=<different output instructions>"
--input "Style guide=@docs/style-guide.md"
```

Inspect the interface anytime with:

```sh
npx nanoodle inspect workflows/alt-text.noodle-graph.json
```

## Inputs

| Key | Required | What to pass |
|-----|----------|--------------|
| `Image` | yes | Image file path (`@path`) or https URL |
| `Alt rules` | no (default baked in) | Alternative instructions for the metadata format |
| `Style guide` | no (default baked in) | House wording rules to apply |

## Outputs

- `Alt text` is a **text** output: the CLI prints it on the `Alt text:` stderr line and
  includes it in the stdout JSON as `outputs["Alt text"]` — a JSON string with
  `alt_125char` and `numbered_caption` keys. Parse it from stdout.

## Serve as an MCP tool

The same graph file works unchanged as a typed MCP tool — copy it into the folder
`nanoodle-mcp` serves and the agent gets an `alt-text` tool with `Image` required:

```sh
mkdir -p ~/noodles && cp workflows/alt-text.noodle-graph.json ~/noodles/alt-text.json
claude mcp add nanoodle -- npx nanoodle-mcp --graphs ~/noodles
```

## Cost

Each run costs a **fraction of a cent** (one `gemini-2.5-flash-lite` vision call). Cheap
enough to fan out over a whole docs folder, but each call still spends real NanoGPT
credit — the CLI prints the metered cost after every run.
