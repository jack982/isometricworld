# BO-004S preparation handoff

**Status: PENDING_LIVE_APPROVAL. No painting result; live readiness is blocked.** The input package
and reproducible preflight through Gate B are complete. The installed native image tool's strict
one-call cap is unverified, so Gate0's provider prerequisite remains blocked. The live wrapper
deliberately refuses all provider execution, including correctly hash-matched approval.

This is not a GO for painting. Gates C–F were not executed. No raw/registered generated image,
before/after painting comparison, style-quality rating or independent human acceptance exists.
The outcome without a permitted image is **INCONCLUSIVE**, with overall status
**PENDING_LIVE_APPROVAL / BLOCKED_NATIVE_IMAGE_CALL_CAP**, not `GO_LIMITED` or a visual `NO_GO`.

## Package and evidence

- [Painter compatibility](bologna-paint-compatibility.md): actual local flags, upstream differences,
  write/retry risks, source selection and native-cap limitation.
- [Exact preflight](bologna-paint-preflight.md): four paths/hashes, prompt hash, approval target,
  proposed command, licence summary, policy, destinations and operator checklist.
- [Canonical input/approval manifest](bologna-paint-input-manifest.json).
- [Preflight engineering QA](bologna-paint-preflight-qa.json): actual commands, statuses, log hashes,
  56 tests, source preservation and explicit NOT_TESTED flags.
- [Unmodified crop with credits](bologna-paint-window-input.png) and
  [QA-only diagnostic overlay](bologna-paint-window-qa.png).
- [Final handoff checksums](bologna-paint-checksums.json): source/docs, isolated inputs and retained logs.

Checkpoint **cec0a69**, branch `feature/bo-004s-paint-feasibility`, Node **v24.22.3** via `nvm use24`.
Working tree started clean apart from the user's untracked plan. Normal source:
`data/bo-003f-landmarks/derived/piazza-maggiore`; its ten complete normal PNG pairs are used,
not material-off controls or viewer AVIFs. Isolated destination: **`data/bo-004s-paint`**.
All **1,410 protected prior files** still match; no protected-root files were added or removed.
Absent `data/web`/`data/web-state` remain absent. Old scene/ground, camera315°/45°/0.25mpp,
origin, EGM2008 geoid39.647m, bbox and all other-city configuration/painter files are unchanged.

Window **(-1,-1)** covers global **[-896,128)²**, supplied completely by render/height tiles
(-1,-1),(0,-1),(-1,0),(0,0). Approximate centre44.4933621,11.3419049. All nine church partitions
and both selected palace roofs fit the crop; the open square, courtyard context, trees and a small
retained portico supply useful failure controls. The candidate does not intersect either intentional
out-of-manifest upper corner. Its nine fixed anchors and 297 conservative intersecting building
bounds are QA projections, not measured image masks. At this view the main north facade is
back-facing; clock/facade details and roof rise remain unverified and must not be invented.

## Implementation boundaries

All added implementation is experiment-only under `docs/`; no shared painter or region source is
modified. Preparation copies original PNG bytes, composes an unchanged normal colour crop and
uses the local painter's actual R/G height decoding/5th-percentile/sqrt/cubic mapping. Source
height encoding is preserved separately. There is no contrast lift, neighbour continuation,
sea shortcut, paint assembly, automatic registration, retry or source-render mutation.

The prompt is an optional Bologna adapter with site-agnostic palette hypotheses and explicit
geometry/void/portico constraints. It copies the existing CC BY4 house-style reference and
central-European tree sheet, both documented in `ATTRIBUTION.md`, rather than generating a new
sheet or importing photographs. Generic tree morphology is not species evidence. No new external
source is activated. The existing OSM, municipality, Copernicus and appearance-only notices remain.

The read-only preflight has no repository subprocess/provider/network dependency. It also passes
under Node24 read-only/no-child permissions; the necessary sharp native addon remains trusted code
outside Node's JS permission guarantees. The live script validates an exact window, manifest hash,
expiry≤24h, one-call intent, one attempt and one worker, then **always rejects the unverified
native-cap backend** before any provider or output directory is created. A true capped backend
requires further implementation/proof, new pins and separately authorized execution; approval alone
cannot turn this stub into a safe live launcher.

## Checks and command record

Final **56/56 tests PASS**: 38 existing Bologna/geometry/coverage/viewer tests plus18 new safety
tests. New tests cover missing/invalid/blank/transparent source inputs, height conversion controls,
manifest intersection/corner cells, root overwrite refusal, unsupported/bulk CLI flags, attempts
or workers>1, missing/mismatched/expired approval, unchanged hashes, the complete preflight import
graph, OS read-only execution and the live-cap rejection even with matching approval.

Pipeline TypeScript, web TypeScript, strict preflight/test TypeScript and `git diff --check` pass.
The former `ImportMeta.env` problem remains fixed by BO-005P; it did not reappear. No new web
build/browser interaction is needed because no viewer or web code/data changed in this task.

Commands actually run included:

```sh
source /home/jacopo/.nvm/nvm.sh
nvm use 24
git status --short --branch
git log -3 --oneline
git remote -v
git branch -a
# Read-only process ownership inspection; no kill/stop:
ps -eo pid,ppid,args
codex --version
codex exec --help
codex features list
codex login status
codex app-server --help
codex debug --help
codex debug prompt-input --help
codex app-server generate-json-schema --experimental --out /tmp/bo-004s-codex-schema
# This generates local schema files only; no app-server session/model was started.
node --import tsx docs/bologna-paint-prepare.ts
node --permission --allow-fs-read=. --allow-addons docs/bologna-paint-plan.ts --dry-run
node --import tsx docs/bologna-paint-check.ts
node_modules/.bin/tsc --noEmit -p pipeline
node_modules/.bin/tsc --noEmit -p web
git diff --check
node --import tsx docs/bologna-paint-checksums.ts
```

Inspection also used `rg`, `sed`, file-size/hash/schema reads, sharp scratch crops under `/tmp`
and visual inspection of the candidate and two existing references. The exact test/typecheck
argument arrays and stdout/stderr SHA-256 are in QA JSON; all attempt logs remain in the new root.
Codex help/features/status/version calls are not model requests. Authentication inspection copied
only a status line, never tokens/API keys/private configuration. Image-generation calls **0**,
provider inference requests **0**, retries **0**, uploads **0**. USD spend is **not applicable /
unknown** for the planned logged-in tool; no billable request was made and no $0 price is invented.

The pinned public upstream painter was downloaded for compatibility only. Initial sandbox DNS
lookup failed; the approved read-only curl retry succeeded. No GIS was acquired. To recreate the
offline inspection files in a separate fresh checkout before preparation (not overwrite this root):

```sh
codex --version > /tmp/bo-004s-codex-version.txt
codex exec --help > /tmp/bo-004s-codex-exec-help.txt
codex features list > /tmp/bo-004s-codex-features.txt
codex login status > /tmp/bo-004s-codex-login-status.txt 2>&1
curl --fail --silent --show-error --location https://api.github.com/repos/krasun/isometricworld/commits/8f9e3bb9f9533bcc5dfb3c6481ec0a1306e5ca3a -o /tmp/bo-004s-upstream-commit.json
curl --fail --silent --show-error --location https://raw.githubusercontent.com/krasun/isometricworld/8f9e3bb9f9533bcc5dfb3c6481ec0a1306e5ca3a/pipeline/src/paint.ts -o /tmp/bo-004s-upstream-paint.ts
node --import tsx docs/bologna-paint-prepare.ts
```

Compatibility metadata pins that upstream commit, URL, retrieval time and SHA. It is never imported
or executed. The actual initial metadata query used `/commits/main` and resolved that same commit;
the reproduction command pins it to avoid future drift. No paid fal or other upstream integration
was installed.

Retained implementation failures: initial preparation included this task's new dotted test filename
in the prior-doc filter (corrected to1,410 actual prior files); validator imports were detached from
`areas.ts`'s transitive subprocess/environment machinery before approval. A first safety-test regex
mistook local `RegExp.exec` for process execution (55/56 passed); an AST-based replacement assumed a
legacy TypeScript compiler API absent from installed TS7 and failed typecheck/test. The corrected
esbuild module-graph inspection and all56 tests pass. Initial/intermediate manifests and failed
logs remain, rather than deleting evidence. The canonical final approval target is the docs input
manifest and its identical `manifests/input-manifest.approval-target.json` copy. No source input or
four model images changed during these pre-approval code/test corrections. Node's addon warning
is reported explicitly, not suppressed.

## Files and outstanding work

No tracked pre-existing file is modified. New untracked files to include in handoff:

- `docs/bologna-paint-support.ts`, `-prepare.ts`, `-plan.ts`, `-live.ts`, `-check.ts`, `-checksums.ts`
- `docs/bologna-paint.test.ts`
- `docs/bologna-paint-compatibility.md`, `-preflight.md`, `-feasibility-report.md`
- `docs/bologna-paint-input-manifest.json`, `-preflight-qa.json`, `-checksums.json`
- `docs/bologna-paint-window-input.png`, `-window-qa.png`

The user's untracked `plans/BO-004S-codex-task.md` remains unchanged. The ignored new experiment
root contains four model inputs, all ten original pairs/manifest, complete prompt, candidate
selection/QA overlay, licence/preservation inventories, immutable manifest revisions, pinned
upstream/offline CLI inspection evidence and engineering logs. No live `run/` directory exists.

Outstanding: verify an enforceable native one-call boundary, identify the actual driver/image model
at an authorized run, obtain fresh explicit command/window/hash approval, then evaluate raw output
and drift before registration, topology and detail hallucinations, dark bands, exterior bands and
independent human quality. A single result cannot certify painted-neighbour continuity or measured
architectural fidelity. Historical source uncertainty remains. No Gates C–F or follow-up task,
export/archive, AI painting, publishing, deployment, R2 write, dev-server stop or commit occurred.

**STOP BEFORE LIVE.** Review the exact proposed invocation and its blocking explanation in the
[preflight](bologna-paint-preflight.md); the BO-004S plan explicitly requires this stop and a
separate authorization. Do not bypass the failed-closed backend with the normal retrying painter.
