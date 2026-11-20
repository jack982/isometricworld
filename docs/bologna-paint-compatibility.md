# BO-004S local painter compatibility

Inspected on 2026-11-20 at checkpoint **cec0a69**, branch
`feature/bo-004s-paint-feasibility`, Node **v24.22.3** (`nvm use 24`). Initial tracked tree clean;
only the operator's `plans/BO-004S-codex-task.md` was untracked. Process inspection found no active
repository render, film, painter or Astro server. No process was stopped. No upstream file was merged.

## Source and preservation

The authority is this checkout, not either GitHub main branch. Normal painter inputs come from
`data/bo-003f-landmarks/derived/piazza-maggiore/{render,height}` and its manifest, as selected by
BO-005P. The 140 BO-005P AVIFs are viewer products and are not painter inputs. All ten 1024² normal
render / 256² packed-height pairs pass dimensions, PNG, nonblank, alpha and historical SHA checks.
The two upper-corner canvas cells (-2,-2), (1,-2) are outside the manifest.

The new [input manifest](bologna-paint-input-manifest.json) inventories **1,410 prior files**,
including every present protected raw/derived/BO-001R/BO-002/BO-003/BO-003F/BO-005P file,
previous Bologna documentation/proofs and shared painter/configuration/style files. `data/web`
and `data/web-state` were absent and remain absent. All old hashes still match. The original
BO-005P 990-file inventory and historical data/document inventories are also checked.

Frozen Bologna origin 44.4938,11.343,h=0; heading315°, pitch45°, 0.25m/art-pixel, geoid39.647m;
bbox [44.4893,11.337,44.4983,11.349]. All region/city tables remain unchanged.

The task narrative reports BO-005P human 8/8 PASS, but the actual checked-in report/JSON still say
independent human acceptance NOT_TESTED. No new human acceptance or measured monument fidelity is
inferred here. BO-003F's technical validity and unresolved architecture are retained explicitly.

## Actual local CLI

`pipeline/src/codex.ts` is absent. `paint.ts` directly spawns `codex exec`.

|Local option/behaviour|Observed implementation|
|---|---|
|Flags|`--plan`, `--window`, `--near`, `--radius`, `--force`, `--older`, `--assemble`, `-j`, `--center`|
|Absent|`--tag`, `--parts`, painter `--model`, `--effort`, backend/budget/call-cap options|
|Window grid|1024 px; stride896; overlap128; assembly feather64|
|Region prompt|Only Israel Center and Stuttgart; Bologna throws before painting|
|Paths|`base = DERIVED/area`; `PIPELINE_DATA_ROOT` redirects derived paths; styles still live in shared `pipeline/style`|
|`--plan`|Not purely read-only: after source/prompt lookup it creates `windows/` before reporting window count. Bologna currently throws first because no prompt exists. Not invoked.|
|Selection|`--window=i,j` selects one, but input/manifest membership is not validated as strictly as this spike requires|
|Input colour|Normal tiled crop, then CLAHE128/maxSlope2 and saturation1.1; painted-neighbour overlaps pasted when present|
|Height|R/G packed cm above heightBase−100m; alpha0→NaN; whole intersecting tiles' above-sea 5th percentile; sqrt-relative 60m guide, cubic256→1024|
|Codex|`exec --skip-git-repo-check -s workspace-write -C work -i input.png -i height.png -i style.png -i trees.png -`; prompt on stdin; 900s termination timer|
|Retries|Up to three attempts; limit errors decrement the attempt counter and pause/retry, potentially indefinitely|
|QA|Registration identity/best score, shift/scale, MIN_MATCH0.45, MIN_TEXTURE0.05; dark-cell checks can retry|
|Cleanup|Removes input/height/style/trees/raw output after successful registration; preserves only log/metrics and aligned window|
|Other writes|Assembles `paint/`, writes `paint.json`; sea handling can delete/replace shared `pipeline/style/sea.png` even though the derived root is isolated|

Therefore the normal painter is **not** an acceptable one-call experiment launcher. No ordinary
`npm run paint`, including `--plan`, was run. Tel Aviv/Stuttgart prompts and behaviour remain unchanged.

## Upstream comparison (reference only)

Pinned upstream code: [paint.ts at 8f9e3bb9](https://github.com/krasun/isometricworld/blob/8f9e3bb9f9533bcc5dfb3c6481ec0a1306e5ca3a/pipeline/src/paint.ts).
The downloaded text and its URL/access date/hash are retained under the isolated root's
`compatibility/`. It retains the 1024/896/128 grid, four core images, registration and assembly.
It additionally has tagged experiments, parts/model/effort options, optional extra inputs,
regional invention checks and paid fal backend/budget code. Those capabilities do not exist in
the local painter and were not imported, executed or used as permission for a provider request.

## Experiment adapter and current blocker

`docs/bologna-paint-prepare.ts` creates one exact, fresh root; copies original PNG bytes rather than
symlinking; builds aligned model inputs; stores the prompt, licence record, candidate masks and pins.
It keeps the unchanged colour crop, omitting the normal painter's photogrammetry-oriented CLAHE/lift.
This is explicit experiment behaviour, not a modification of ordinary painting. There are no painted
neighbour strips, sea shortcut, assembly, automatic registration or retry at this stage.

The Bologna prompt is site-agnostic: Emilia-Romagna palette hypotheses, generic existing deciduous
crowns, topology/void preservation, no named-landmark repair or invented clock/facade/chapel details.
Existing `reference.png` and `trees-stuttgart.png` are copied byte-for-byte; their CC BY4 project
provenance is in `ATTRIBUTION.md`. No new geographical/photo/style source is introduced.

`docs/bologna-paint-plan.ts` is read-only. Its repository dependency graph excludes subprocess,
provider and network imports. It also runs directly with Node24 type stripping under filesystem
read-only/no-child-process permissions. `--allow-addons` is necessary for the trusted installed
sharp native addon; Node warns that native addons are outside its JS permission guarantees.
This is additional defence, not a claim that arbitrary native code is sandboxed.

Installed **codex-cli0.170.0**, `codex features list` shows `image_generation stable true`, and
`codex login status` reports an existing ChatGPT login. Only help/features/status/version and offline
protocol-schema generation were invoked. No account tokens or private configuration were copied.
The CLI's model is its undisclosed/default selection; no image submodel or remaining quota can be
verified from these offline commands. Feature availability is not a successful generation test.

Crucially, offline CLI help and protocol inspection do **not** establish a supported, enforced
native image-tool call-count limit. Generic hooks are listed but their interception of the native
image tool has not been verified. One `codex exec` process could make multiple calls; a prompt
instruction or killing the second log event is insufficient. The live gate deliberately has **no
provider launcher** and rejects even matching approval with `BLOCKED_NATIVE_IMAGE_CALL_CAP`.
Do not bypass it by calling the ordinary painter. Source/isolation preparation passes; Gate0's
native-cap prerequisite remains blocked, and no operational live-ready GateB PASS is claimed.
