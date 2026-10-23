---
name: character-sprites
description: Turn a humanoid character description into a 2D game prototype with transparent idle, walk, punch and jump animations, a sprite atlas, timing metadata and an interactive preview. Use when a coding agent needs animated character art for a side-view game.
---

# Character sprites

Generate a canonical character and a matching sheet of separate body parts. Local code removes the background, places joints and bakes a cutout rig into 32 transparent frames. Reusing parts preserves identity across frames and makes opposite-leg motion deterministic. Inspect the resulting motion before integrating it.

## Scope

One right-facing humanoid, eight frames each for idle, walk, punch and jump. Left-facing playback mirrors the art. Limbs are rigid cutouts without articulated elbows or knees: suitable for game prototyping, with visible foot tilt and possible sliding. This does not supply hand-drawn animation, additional camera directions, hitboxes or jump physics.

Prefer simple readable silhouettes without held weapons, wings, trailing cloth or disconnected accessories. Magenta and nearby pink/purple hues are reserved for background removal. If these colors are essential to the requested character, adapt the matte/extraction first; do not silently change their design.

Requires Node22.23.4+,24.22.1+,or26.12.1+, nanoodle CLI >=0.4, ffmpeg/ffprobe and `NANOGPT_API_KEY` in the environment. Description and reference images go to NanoGPT; extraction, animation and preview run locally. Never print credentials or distribute raw CLI summaries containing account information.

## Generate

Run from this skill directory, substituting the requested description:

```sh
npx nanoodle run workflows/character-rig.noodle-graph.json \
  --input 'Character=A compact furnace knight with an ivory helmet, amber visor, navy armor, short red scarf, brass gauntlets and heavy boots. Outlined 2D platformer art. No weapon or wings.' \
  --out ./character-raw --timeout 360000 --json > run.json
node scripts/rig.mjs run.json ./character-pack
python3 -m http.server 8080 --directory ./character-pack
```

Open `http://localhost:8080/preview.html`. Any static server works. The workflow uses one text call and two image calls. The tested Muse reference and parts calls cost $0.01 each; future pricing and latency can differ. Report actual run costs and targeted retries separately. Do not start duplicate requests while an earlier request is still running.

## Deliver

- `frames/`: 32 RGBA PNGs, 256×256; `idle_00`–`idle_07`, `walk_00`–`walk_07`, `attack_00`–`attack_07`, `jump_00`–`jump_07`.
- `atlas.png`: 2048×1024, eight columns and four animation rows.
- `atlas.json`: Phaser-style frame rectangles and normalized pivots. The custom `animations` entries contain ordered frame names, millisecond durations and `repeat` (-1 loop, 0 one-shot). Engine integration must read these explicitly.
- `preview.html`: playback, speed, pause, frame scrubbing, background inspection, mirrored facing, arrow-key movement and Space punch.
- `parts/` and `rig-config.json`: extracted artwork and editable proportions/joints.
- `qa.json`: mechanical checks and outstanding visual review.
- `sources/`: original reference, parts sheet and sanitized run metadata for offline reuse.

Use the manifest pivot at (128,236) within each frame. Do not center each pose by its visible bounding box. No runtime rig library is required: the output is baked PNG frames.

## Inspect and optimize

Watch each action at normal and slow speed, including the loop seam. Check shoulder/hip overlap, opposite leg phases, feet meeting the ground, a readable punch, stable character identity and alpha edges on light/dark/checker backgrounds. Mechanical checks do not establish animation quality. Record visible limitations in the handoff.

Adjust proportions and joints locally before spending on regeneration:

```sh
node scripts/rig.mjs run.json ./character-adjusted ./character-pack/rig-config.json
```

Edit the saved configuration: `heights` sets each part's pixel height; `pivots` sets normalized [x,y] positions within each cropped part; `joints` sets [dx,dy] offsets from the hip for near/far shoulders and hips. The same part scale is reused across all frames. The script detects blank gutters around the sheet center, removes reserved magenta including enclosed gaps, and rejects empty or clipped output. It cannot identify incorrect anatomy automatically.

To reuse saved sources without API calls, change into `character-pack/sources` and invoke the absolute path to `rig.mjs` with `run.json` and a new output directory. Relative source paths resolve from the current working directory.

If a part is missing or malformed, regenerate only the parts edit from the saved reference. Keep the successful reference; record retry cost. Start with one run and one targeted improvement unless broader experimentation is authorized. The included furnace-knight experiment validates this method for one design; other proportions require review and may need configuration changes.

## Jump integration

The eight jump poses cover anticipation, rise, apex, fall and landing; `animations.jump.phases` gives their indices. These are pose frames without a baked jump trajectory. Apply gravity to the character world position and select a pose from vertical velocity and ground contact. For a heavy game feel, the arena example uses strong downward acceleration, a short airborne window and a landing recovery. Keep the ground pivot consistent; do not derive world height from each pose silhouette. The animation lab previews the poses in place.

## Worked example: Iron Verdict

[Play the finished prototype](https://nanoodle.com/examples/iron-verdict/) · [Download its game code and assets](https://nanoodle.com/examples/iron-verdict/iron-verdict.zip). First-party example built with this skill and a coding agent.

Goal: “Create a furnace knight, then build a harsh side-view arena fighter around its animations. Make jumps heavy and hits readable through hit-stop, knockback and impact effects. Include victory, defeat and restart.”

The graph generated the reference and separate parts; this skill baked the transparent frames and atlas. The coding agent then built movement, gravity, punch/heavy/slam combat, enemies, three rounds and impact effects in a browser game. It added the jump poses and tuned gameplay locally, reusing the original artwork without another API call.

Use this as an integration reference: load the atlas once, preserve its ground pivot, select jump poses from physics state, and tune impact in game code. Test victory, defeat and restart as well as animation playback. Generating the graph alone does not build a game. Rigid limbs and mirrored facing remain prototype limitations.
