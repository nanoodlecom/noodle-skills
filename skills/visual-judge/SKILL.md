---
name: visual-judge
description: Judge a UI screenshot against written acceptance criteria — a vision model describes the rendered page neutrally, then an LLM judge compares it to the spec and returns strict JSON with pass/fail and per-violation severity. Use to self-check frontend changes from a screenshot, or as a CI visual-regression gate that only fails when a human would care.
---

# Visual judge

Runs the bundled nanoodle workflow `workflows/visual-judge.noodle-graph.json` against the
NanoGPT API in two stages: a vision model describes the screenshot (`Screenshot`)
exhaustively and neutrally — it never judges — then an LLM judge compares that description
against your acceptance criteria (`Spec`) and returns strict JSON (`Verdict`):
`{"pass": bool, "violations": [{"issue", "severity"}]}` with severity
`critical | major | minor`. Requires Node.js 22.23.4+, 24.22.1+, or 26.12.1+ and the `nanoodle` npm package
(`npx nanoodle` fetches it).

Typical agent use: after editing a component, screenshot the page (Playwright, your
project's verify tooling), run this, and only commit when `pass` is true — or read the
`violations` and fix them.

## API key

The run needs a NanoGPT API key. Use whichever is available:

- `NANOGPT_API_KEY` already set in the environment — prefer this; no extra flags.
- A `.env` file containing `NANOGPT_API_KEY=...` — pass `--env-file <path>` only when the
  key is not already in the environment. (With this CLI, `--env-file` overrides ambient
  `NANOGPT_API_KEY`.)

Never print the key.

## Run

From this skill's directory (or prefix paths if running from elsewhere). Replace the
screenshot path and the spec with the real ones:

```sh
npx nanoodle run workflows/visual-judge.noodle-graph.json \
  --input "Screenshot=@/path/to/screenshot.jpg" \
  --input "Spec=The pricing page must show three plan cards, a visible Buy button on each, and no overlapping sections."
```

A spec that lives in the repo attaches as a file instead (`.md`/`.txt` are read as text):

```sh
--input "Spec=@docs/page-spec.md"
```

The output is text, so no `--out` directory is needed. The stdout JSON summary carries the
verdict; a shell gate is one `jq` away:

```sh
npx nanoodle run workflows/visual-judge.noodle-graph.json \
  --input "Screenshot=@shot.jpg" --input "Spec=@spec.md" \
  | jq -e '.outputs.Verdict | fromjson | .pass' > /dev/null   # exit 1 = failed the check
```

Inspect the interface anytime with:

```sh
npx nanoodle inspect workflows/visual-judge.noodle-graph.json
```

## Inputs

| Key | Required | What to pass |
|-----|----------|--------------|
| `Screenshot` | yes | Screenshot file path (`@path`) or https URL |
| `Spec` | yes | Acceptance criteria as prose: what must be visible, what must not overlap, required copy |
| `Verdict` | no | Override the judge's instructions (default judges layout vs spec, ignores cosmetic noise) |

`Verdict` is the judge node's name, so it is both the optional input key and the output
key. A rename cannot separate them — it renames both. The two halves never meet, and the
behaviour is exact:

- `--input "Verdict=..."` replaces the judge's **system prompt**. It does not preset,
  shadow, or overwrite the output.
- `outputs.Verdict` in the stdout JSON, and the `Verdict:` stderr line, carry the judge's
  **result**.
- Nothing becomes ambiguous and nothing errors: each namespace holds one `Verdict`.

## Outputs

- `Verdict` is a **text** output: printed on the `Verdict:` stderr line and included in the
  stdout JSON as `outputs.Verdict` — itself a JSON string:
  `{"pass": boolean, "violations": [{"issue": string, "severity": "critical"|"major"|"minor"}]}`.
  Fail hard on `critical`/`major`; treat `minor` as annotation.

## Serve as an MCP tool

The same graph file works unchanged as a typed MCP tool with `Screenshot` and `Spec`
required — the agent can self-check its own UI changes before committing:

```sh
mkdir -p ~/noodles && cp workflows/visual-judge.noodle-graph.json ~/noodles/visual-judge.json
claude mcp add nanoodle -- npx nanoodle-mcp --graphs ~/noodles
```

## Cost

Each run costs about **$0.01** in NanoGPT credit (one `openai/gpt-5.4-mini` vision call
plus one `zai-org/glm-5.2` judge call at temperature 0). Runs spend real credit — tell the
user before running repeatedly.
