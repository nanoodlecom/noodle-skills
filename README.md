# noodle-skills

**Ready-to-install agent skills, each wrapping a [nanoodle](https://nanoodle.com) visual AI
workflow.** Drop a folder into your agent's skills directory and Claude Code (or any agent
that reads markdown playbooks and runs shell commands) can generate posters, restyle photos,
sing jingles, narrate poems, and render video teasers — plus a coding-agent toolbelt: write
alt text from real pixels, judge screenshots against a spec, mock up UI screens, draft
self-audited PR descriptions, and mint OG cards — headless, on your own
[NanoGPT](https://nano-gpt.com) key.

Each skill is just two files: a `SKILL.md` playbook and a `workflows/*.noodle-graph.json`
saved from the nanoodle editor. The `nanoodle` CLI (`npx nanoodle`) executes the graph; the
agent supplies the inputs and hands back the outputs.

> **Which repo do I want?** These are **prebuilt** skills — each one runs a single
> ready-made workflow. Want one skill that teaches your agent to *design and run arbitrary
> graphs* instead? That's [nanoodle-skill](https://github.com/nanoodlecom/nanoodle-skill).
> Agent speaks MCP rather than skills? Use
> [nanoodle-mcp](https://github.com/nanoodlecom/nanoodle-mcp).

> **These skills spend real money.** Every run bills your NanoGPT balance — cents per run,
> but real cents. Each SKILL.md carries an honest per-run ballpark, and agents are told to
> mention cost before running repeatedly.

## The skills

| Skill | What it does | Inputs | Output | Cost / run (approx.) |
|-------|--------------|--------|--------|----------------------|
| [poster-generator](skills/poster-generator/) | One-line idea → LLM prompt-writer → poster image | `Idea` | `Poster.<ext>` | ~$0.04 |
| [photo-restyler](skills/photo-restyler/) | Photo + plain-English instruction → restyled image | `Photo` (file), `Style` | `Restyled.<ext>` | ~$0.04 |
| [jingle-maker](skills/jingle-maker/) | Brief → lyrics LLM + style LLM → sung ~30s track | `Brief` | `Jingle.<ext>` | ~$0.05–0.10 |
| [narrated-poem](skills/narrated-poem/) | Picture → vision → four-line poem → spoken audio | `Picture` (file) | `Narration.<ext>` | ~$0.01 |
| [video-teaser](skills/video-teaser/) | One-liner → shot-description LLM → 5s video clip | `Tagline` | `Teaser.<ext>` | ~$0.06 |

### For coding agents

| Skill | What it does | Inputs | Output | Cost / run (approx.) |
|-------|--------------|--------|--------|----------------------|
| [alt-text-writer](skills/alt-text-writer/) | Vision model reads the actual pixels → alt text + caption JSON | `Image` (file) | `Alt text` (text) | <$0.01 |
| [visual-judge](skills/visual-judge/) | Screenshot vs written spec → neutral describe → pass/fail JSON verdict | `Screenshot` (file), `Spec` | `Verdict` (text) | ~$0.01 |
| [ui-mockup](skills/ui-mockup/) | Feature sentence + style guide → screenshot-style mockup render | `Feature` | `Mockup.<ext>` | ~$0.04 |
| [pr-describer](skills/pr-describer/) | Diff → draft → in-graph audit → final PR description | `Diff` (file) | `Final PR body` (text) | ~$0.01 |
| [og-card-maker](skills/og-card-maker/) | Post/release line → house-style 1200×630 card + honest alt text | `Post` | `Hero.<ext>`, `AltText` (text) | ~$0.05 |

Costs are ballparks from the NanoGPT catalog at the time of writing; the CLI prints the
actual metered cost (and remaining balance) after every run.

## Install

A skill is a plain directory — installing is copying (or symlinking) it:

```sh
# Claude Code, user-level
cp -r skills/poster-generator ~/.claude/skills/poster-generator

# Claude Code, project-level
cp -r skills/poster-generator <your-project>/.claude/skills/poster-generator
```

Other agents only need the folder somewhere they can read `SKILL.md` and run commands
(`~/.agents/skills/`, `~/.grok/skills/`, …).

Requirements at run time: Node.js 22.23.4+, 24.22.1+, or 26.12.1+ and a NanoGPT API key in `NANOGPT_API_KEY` (or a
`.env` file passed via `--env-file`). `npx nanoodle` fetches the executor on first use —
nothing else to install. The skills are tested against the **nanoodle 0.8.x** CLI (the
version `npx nanoodle` currently fetches); this repo's devDependency pins the same range.

## Try one from this repo

```sh
export NANOGPT_API_KEY=...        # spends from this balance
cd skills/poster-generator
npx nanoodle run workflows/poster.noodle-graph.json \
  --input "Idea=a synthwave night market on the moon" \
  --out ./poster-out
```

Inspect any workflow's interface offline (no key, no network):

```sh
npx nanoodle inspect skills/jingle-maker/workflows/jingle.noodle-graph.json
```

## Design your own

These ten are templates, not a ceiling. The recipe is five steps:

1. Build and test a workflow visually at [nanoodle.com](https://nanoodle.com) (runs in your
   browser on your own key), then press 💾 Save to download the `noodle-graph.json`.
2. **Name your nodes** in the editor — custom node names become the `--input` keys and
   output filenames. A node's name becomes the key of its single input, and that includes
   the case where the only unwired input left is the optional system prompt. So a node
   named `Poet` whose prompt arrives over a wire takes `--input "Poet=…"`, not
   `--input "System prompt=…"`. Leave the node unnamed and the key stays the generic label
   (`System prompt`) — the substitution needs a name to substitute. If a named node is also
   a sink, its name is both the input key and the output key; inputs and outputs are
   separate namespaces, so that is legal.
3. Drop the file into `your-skill/workflows/`.
4. `npx nanoodle inspect` it and check the derived keys.
5. Write `SKILL.md` documenting the exact run command.

The full guide lives in the nanoodle-js repo:
[docs/agent-skills.md](https://github.com/nanoodlecom/nanoodle-js/blob/main/docs/agent-skills.md).

## Tests

```sh
npm install
npm test
```

Tests are fully offline and spend nothing: they verify each graph's derived input/output
keys against its SKILL.md, that every model-bearing node pins a model, and they execute
every playbook's documented run command verbatim against a local stub API. The suite runs
against the pinned devDependency, nanoodle 0.8.x — the same version `npx nanoodle` fetches.

Two guards have no hardcoded expectation. For every skill they derive the keys from that
skill's own graph with the installed library, then assert that the `## Inputs` table lists
exactly the derived input keys, that the `## Outputs` section names exactly the derived
output keys, and that every `--input "<Key>=` the playbook types is a derived key.

The scope of those guards, stated plainly: they read the **installed** library, and `npm ci`
installs the pinned range. A key rename in a *newer* published release stays invisible to a
commit here until somebody moves the pin — so the pinned suite alone would not have caught
the last break either. A second workflow,
[`.github/workflows/latest-executor.yml`](.github/workflows/latest-executor.yml), closes
that gap: weekly it installs `nanoodle@latest` over the pin and runs the same suite. A
published rename fails that job, which is still before a user's run, because every playbook
tells the agent to run `npx nanoodle` — that is, latest.

Two workflows have an input key equal to an output key, because both come from one node's
name (`Verdict` in visual-judge, `Final PR body` in pr-describer). A separate test proves
what that does: the input half sets that node's system prompt, the output half still carries
its result, and nothing becomes ambiguous.

## Limitations

- Runs bill your NanoGPT balance — there is no dry-run mode beyond `inspect`.
- Model ids are pinned to catalog entries that existed when this repo was last updated;
  NanoGPT occasionally renames or retires models. If a run fails with a model error, pick a
  replacement with `--set "<nodeId>.model=<id>"` or re-save the graph in the editor.
- Output quality is the model's, not the workflow's — rerun or tweak the prompts/system
  inputs for better takes.
- Media generation is not instant: music and video runs can take minutes. Don't kill the
  process early.

## License

[MIT](LICENSE).

## Character sprites: a playable skill outcome

[character-sprites](skills/character-sprites/) generates matching character artwork, then uses a local rig to bake 32 transparent idle, walk, punch and jump frames. Requires Node.js, ffmpeg/ffprobe and a NanoGPT key for generating new artwork. [Play Iron Verdict](https://nanoodle.com/examples/iron-verdict/), a game a coding agent built using those assets. The graph supplies reference and parts; the skill builds animations; the agent writes gameplay. See the skill for run instructions and prototype limitations.
