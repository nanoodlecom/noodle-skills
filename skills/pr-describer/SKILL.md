---
name: pr-describer
description: Turn a git diff into a self-audited PR description — one LLM drafts the body, a second audits the draft against the raw diff for missed breaking changes and unmentioned files, a third folds the findings in. Use when opening a pull request and the description should mention everything the diff actually changes.
---

# PR describer

Runs the bundled nanoodle workflow `workflows/pr-describe.noodle-graph.json` against the
NanoGPT API — a three-stage text pipeline over one input (`Diff`): a drafter writes a
conventional PR body (summary, `## Changes`, `## Test plan`), an auditor compares the draft
against the raw diff and lists every breaking change, behavioral shift, or touched file the
draft omits, and a reviser emits the final markdown (`Final PR body`) with every audit
finding folded in (adding `## Breaking changes` when needed). Requires Node.js 22.23.4+, 24.22.1+, or26.12.1+ and
the `nanoodle` npm package (`npx nanoodle` fetches it).

## API key

The run needs a NanoGPT API key. Use whichever is available:

- `NANOGPT_API_KEY` already set in the environment — prefer this; no extra flags.
- A `.env` file containing `NANOGPT_API_KEY=...` — pass `--env-file <path>` only when the
  key is not already in the environment. (With this CLI, `--env-file` overrides ambient
  `NANOGPT_API_KEY`.)

Never print the key.

## Run

From this skill's directory (or prefix paths if running from elsewhere). Write the branch
diff to a `.txt` file first (`@path` reads `.txt`/`.md` files as text):

```sh
npx nanoodle run workflows/pr-describe.noodle-graph.json \
  --input "Diff=@/tmp/pr-diff.txt"
```

Producing the diff file is the usual one-liner, e.g.
`git diff origin/main...HEAD > /tmp/pr-diff.txt`.

The output is text, so no `--out` directory is needed. Pipe the body straight into GitHub:

```sh
npx nanoodle run workflows/pr-describe.noodle-graph.json --input "Diff=@/tmp/pr-diff.txt" \
  | jq -r '.outputs["Final PR body"]' | gh pr create --title "..." --body-file -
```

Inspect the interface anytime with:

```sh
npx nanoodle inspect workflows/pr-describe.noodle-graph.json
```

## Inputs

| Key | Required | What to pass |
|-----|----------|--------------|
| `Diff` | yes | The unified diff, usually `@/tmp/pr-diff.txt` |
| `Drafter` | no | Override the drafter's house style (that node's system prompt) |
| `Auditor` | no | Override the auditor's instructions (that node's system prompt) |
| `Final PR body` | no | Override the reviser's instructions (that node's system prompt) |

Each optional key is a node name from the editor, and it replaces that node's system
prompt. `Final PR body` is the reviser node's name, so it is both an optional input key and
the output key. A rename cannot separate them — it renames both. The two halves never meet:
the input sets the reviser's system prompt, the output carries the reviser's result, and
neither is ambiguous, because each namespace holds one `Final PR body`.

```sh
--input "Final PR body=<custom reviser instructions>"   # sets the reviser's system prompt
--input "Drafter=<custom house style>"                  # sets the drafter's system prompt
--input "Auditor=<custom audit instructions>"           # sets the auditor's system prompt
```

`outputs["Final PR body"]` still carries the finished description.

## Outputs

- `Final PR body` is a **text** output: printed on the `Final PR body:` stderr line and
  included in the stdout JSON as `outputs["Final PR body"]` — the finished markdown PR
  description.

## Serve as an MCP tool

The same graph file works unchanged as a typed MCP tool with one required string input:

```sh
mkdir -p ~/noodles && cp workflows/pr-describe.noodle-graph.json ~/noodles/pr-scribe.json
claude mcp add nanoodle -- npx nanoodle-mcp --graphs ~/noodles
```

## Cost

Each run costs about **$0.01** in NanoGPT credit (three `zai-org/glm-5.2` calls; scales
with diff size). Pure text, pennies per call — but runs spend real credit, so mention cost
before batch-processing a backlog of PRs.
