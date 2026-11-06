# Implicit state machine audit — 2026-11-06

Audited baseline: `27963e3e76fa9af658a3ebba810108b61212347b`.
Scope: all eleven bundled graphs and playbooks, the character rig/preview, test harness,
and both GitHub Actions workflows. This repository is a skill distribution, not a service.

## Graph execution and delivery

Every graph shares the executor lifecycle: load JSON → derive/validate inputs and models →
schedule dependencies → run ready nodes → collect successful sinks and errors → save media
and print a summary. Upload/text nodes prepare inputs, joins wait for all linked inputs,
and independent branches may run concurrently. A failed dependency prevents dependent API
calls; an unrelated branch may still succeed. A partial result is not a successful whole
run. Input overrides and output keys are separate namespaces, including `Verdict` and
`Final PR body`. Those collisions already have execution tests.

| Skill | Dependency transitions and completion boundary |
| --- | --- |
| poster-generator | Idea → prompt writer → image → saved Poster |
| photo-restyler | Photo + Style → edit → saved Restyled |
| jingle-maker | Brief → lyrics → style; music waits for both lyrics and style → saved Jingle |
| narrated-poem | Picture → vision description → poem → speech → saved Narration |
| video-teaser | Tagline → shot writer → submit video → poll remote job → download/save Teaser |
| alt-text-writer | Image + joined rules/style → vision → Alt text JSON string |
| visual-judge | Screenshot → description; Spec + description → judge → Verdict JSON string |
| ui-mockup | Feature + Style guide → join → prompt writer → image → saved Mockup |
| pr-describer | Diff → draft; Diff + draft → audit; draft + audit notes → final PR body |
| og-card-maker | Post + Style → prompt → image; image fans out to resize Hero and vision AltText |
| character-sprites | Character → designer → canonical image; image fans out to resized Reference and edited Rig parts; both outputs precede local rigging |

The executor owns HTTP status handling, remote video/audio polling, timeout/cancellation,
cost accounting, and download behavior. These are not reimplemented here. A timeout or
lost connection after submission can leave a billed remote job running; starting the CLI
again is a fresh run, not a durable resume contract. The pinned 0.8.0 workflow runner does
not persist a resume registry. Recovery instructions now require checking remote state and
keeping successful outputs before choosing another paid run. No live generation or billing
was performed in this audit. Model availability/quality and provider-side cancellation
remain live-service concerns, outside an offline guarantee.

## Character pack transaction

Previous transitions were: mkdir destination → copy sources → save config → decode/extract
parts → write individual frames → write atlas → write manifest/QA → copy preview. Each step
mutated the final directory. A failure after frame generation left partial files behind;
reusing a destination or racing two processes could mix runs and overwrite a previous pack.

Fixed transitions: reject an existing destination → create unique sibling staging directory
→ build every artifact → copy required preview → rename the nonempty complete directory to
the destination. Cleanup runs on an ordinary failure. Competing builders stage separately;
once one commits, another cannot replace its nonempty destination. Pack consumers never
observe intermediate frames at the final path. Success reports the final path, not staging.
The same-filesystem rename gives atomic visibility, not crash durability across power loss.

The existing validation gates remain: generation errors, input file presence, proportion /
joint ranges, square sheet dimensions, complete decode, nonempty/padded extracted parts,
and frame bounds. Saved source metadata retains cost and local filenames but excludes raw
account/credential fields. Offline reuse resolves paths from the documented working directory.
Missing preview templates now fail the transaction instead of silently omitting the preview.

A forced kill can leave an unpublished hidden staging folder. It cannot publish a partial
pack or damage the last completed destination. Documentation explains how to identify and
remove an abandoned folder after the process stops. Existing packs are deliberately not
replaced; use a fresh destination for each revision.

## Preview playback and input

Initialization: loading atlas JSON → loading/decoding image → ready/render loop, or visible
error with serving guidance. Ready state combines action (idle/walk/attack/jump), frame,
elapsed time, paused/scrubbed state, playback speed, position, facing, and held movement keys.
Action selection resets timing; pause/scrub hold a frame; looping actions wrap; attack/jump
play once then choose walk only if movement is held, otherwise idle. Jump is a pose preview;
world gravity, hitboxes and game victory/defeat/restart belong to the consuming game.

Previously blur cleared held keys but left the action as walk, and hidden-tab recovery did
not release held keys. Fixed blur/visibility transitions clear movement and return a
keyboard-driven walk to idle. An in-progress attack still completes before returning to idle.
Explicitly selected walk playback continues to loop when no keyboard movement was active.

## CI and distribution lifecycle

`test.yml`: push to main / PR → install the lockfile → offline tests on Node 22.23.4,
24.22.1, 26.12.1 → pass/fail. `latest-executor.yml`: schedule/manual/path change → install
lockfile → compare latest → install latest without changing the lockfile → test → on failure
find an open compatibility issue, comment if present, create otherwise. It does not publish
packages or deploy services. The issue remains open for human resolution; weekly success
alone does not prove its earlier cause was fixed. Concurrent runs can race the find/create issue transition and open duplicate issues.
A workflow-level serialization fix was prepared, but GitHub rejected the branch push:
its OAuth app lacks `workflow` scope. The workflow edit was removed before publishing the
remaining fixes. It remains a narrow CI follow-up; authentication/permissions were not changed.

The previous hardcoded guards omitted character-sprites. Added its interface/model guards,
its documented generation command against the local stub (including JSON redirection and
the reference/parts dependency), and a coverage assertion so new skill folders cannot be
silently omitted again. New rig and preview suites cover the transitions described above.

The local mock server transitions from unbound → listening on an ephemeral loopback port
→ scripted request/response recording → close. Test fixtures are removed after use. The
character command runs in a copied temporary skill directory so its `run.json` redirection
cannot overwrite a developer’s saved generation summary. Mock HTTP callbacks and codec
fixtures are test-only; they do not proxy real provider traffic.

GitHub inspection found no open PRs, no releases, no deployments, and no Pages hosting.
`package.json` is private and neither workflow publishes. Distribution is merge to main,
then copying/updating the skill directory as documented in README. Existing installed copies
and the separately hosted Iron Verdict example are not automatically updated by this repo.
Rollback is a normal revert of the merge followed by updating the affected installed copy;
no live database or workload migration is involved.

## Evidence

- Baseline offline suite: 64/64 passing on Node 24.22.1 with nanoodle 0.8.0.
- New reproductions against baseline: four failures — focus recovery, partial output after
  a late encoder error, rewriting an existing destination, and two concurrent successful writers.
- Fixed suite: 77/77 passing against pinned nanoodle 0.8.0 on Node 22.23.4 and
  published nanoodle 0.13.0 on Node 24.22.1.
- Rig tests inject an atlas-encoder failure after all frames, retry from saved sources,
  verify sanitized metadata, preserve an existing pack, reject empty existing directories,
  and race independent CLI processes. Deterministic codec stubs exercise orchestration;
  they do not establish rendering quality.
- Separate real ffmpeg 6.1.1 smoke test with synthetic artwork produced 32 PNG frames and a
  2048×1024 RGBA atlas, manifest, QA, source/config files and preview. Visual quality remains
  explicitly marked `required`, as before.
- Preview tests execute the shipped inline script with DOM/canvas adapters and controlled
  clocks, covering focus/visibility recovery, one-shot return states, pause and scrubbing.
