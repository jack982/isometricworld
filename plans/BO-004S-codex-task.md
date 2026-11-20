# BO-004S — Bologna AI Painting Feasibility Spike

**Project:** Isometric Bologna (`jack982/isometricworld`)

**Execution target:** Codex CLI, local repository, Node.js 24

**Status:** Implementation plan, **not** permission for an image-generation run

**Scope:** One 1024×1024 *paint window*, not the full map, not a publishable architectural reconstruction

**Expected decision:** `GO_LIMITED`, `REFINE_INPUT`, `NO_GO`, or `INCONCLUSIVE`

---

## 0. Mission and background

We have a working geographically grounded Bologna proof, created in stages:

- **BO-001/001R:** OSM + terrain baseline; corrected OSM surface acquisition with an archived Geofabrik PBF.
- **BO-002:** municipal CTC footprints and relative eave heights; courtyards preserved; municipal trees merged with OSM.
- **BO-003/003F:** bounded architectural pilots for Piazza Maggiore, San Petronio, Palazzo d'Accursio, and a portico; structural details remain incomplete or estimated.
- **BO-005P:** local Astro/OpenSeadragon viewer at `/bologna`, human acceptance **8/8 PASS**, 140 locally exported AVIF tiles, fixed TS error. Best complete **normal/color** render source in its handoff: `data/bo-003f-landmarks/derived/piazza-maggiore`.

**Business/product goal:** a recognizable, geographically faithful, pan/zoom isometric map of Bologna, in the visual family of the original Isometric World, eventually public on Hetzner VPS with R2-backed assets, Umami analytics, and optional mobility overlays. No VPS/R2/analytics or public distribution work is authorized here.

**Research question:** Can the project's existing image-painting method add a compelling, coherent illustrated style to the *existing* Bologna geometry **without** inventing architecture, relocating buildings, filling courtyards/porticoes, moving streets, changing the camera, or pretending inaccurate monuments are verified?

**What success means:** a convincing controlled visual result *and* defensible geometry preservation. Pretty but geographically wrong is a **failure**, not a GO.

---

## 1. Hard safety rules (non-negotiable)

1. Read `AGENTS.md`, `README.md`, `ATTRIBUTION.md`, and the actual **current local** `pipeline/src/paint.ts`, `pipeline/src/codex.ts` (if present), `pipeline/src/register.ts`, `pipeline/src/paths.ts`, `pipeline/src/areas.ts`, `pipeline/src/places.ts`, plus BO-003F/BO-005P handoffs. **Do not assume that the public fork's `main` equals this working branch**. The upstream painter has evolved separately; use upstream only as a reference, not as a file to overwrite wholesale.
2. Do not change frozen Bologna origin, camera heading 315°, pitch 45°, 0.25 m/art-pixel, geoid, bounding box, geometry, terrain or municipal adapter inputs. In particular, do not rerun `fetch`, `ground`, `scene`, or `render` to make a painting look better.
3. Do not touch, delete, or rewrite existing `data/derived/`, `data/raw/`, `data/bo-001r/`, `data/bo-002-*`, `data/bo-003-*`, `data/bo-003f-*`, `data/bo-005p-*`, `data/web/`, `data/web-state/`, old paintings, or the running user dev server. Keep a verified preservation manifest for the protected inputs.
4. Use a **fresh isolated** experiment root, e.g. `data/bo-004s-paint/`, created with a fail-if-exists guard. No symlink/reference may allow a write back to source roots. If a shared painter cannot safely be redirected, create a minimal experiment-only wrapper. Preserve provenance and SHA-256 for copied inputs.
5. **Preparation and dry-run only by default.** Absolutely no Codex image-generation request, fal.ai call, paid API call, upload, `publish`, `deploy`, `archive`, or `export` until the operator explicitly authorizes the *single-window live test*. Do not infer approval from receiving this plan.
6. After approval: at most **one model image-generation call**. Disable or bypass the painter's normal retry loop (which may attempt up to three times, and may wait/retry on quota). No automatic repaint, no parallel workers, no fallback provider. The user must explicitly approve any subsequent attempt. Stop immediately on rate limit, quota or provider error; never sleep until the quota resets.
7. Default provider for the approved test: the repository's **Codex CLI + built-in image tool**, using the user's existing logged-in account. Do not create an OpenAI API key. **Do not enable fal.ai** unless separately approved with a known per-call quote and hard budget control. A ChatGPT login does not imply unlimited image-generation allowance; record request counts and any observable usage information rather than inventing USD costs.
8. Only use source geometry and legally usable style-reference assets. No Google Maps/Earth, Bing/Apple/Mapbox satellite/Street View, proprietary 3D Tiles, or unlicensed photos, even as reference imagery. Check the licence/provenance of any new reference *before* the run. Credit active sources and adaptations. Do not call guessed facade or roof details measured facts.
9. Never silently alter other-city paint prompts, output paths or rendering semantics. Any extension must be optional, Bologna-scoped and upstream-friendly. No commits unless requested.

### Mandatory stop conditions

Stop at the preflight, report a blocker, and do **not** generate an image if: source render/height data is absent or hash-mismatched; the candidate window does not intersect validated Bologna tiles; painter output isolation cannot be guaranteed; the prompt would misrepresent uncertain monument geometry; an input/style licence is unresolved; or the image tool is not clearly available within the planned request cap.

---

## 2. Gates and implementation order

### Gate 0 — Workspace, source selection and painter compatibility (read-only)

1. Run `nvm use 24`, `git status --short --branch`, `git log -3 --oneline`, and inspect process ownership. Do not kill the user dev server.
2. Inventory BO-005P's selected source from `docs/bologna-viewer-spike.md`, `docs/bologna-viewer-inputs.json` and the archived BO-003F proof. Verify all ten source render+height pairs, camera, manifest, and hashes. Confirm that the **normal** render, not the neutral-control render, supplies the painting. The 140 BO-005P AVIF images are **viewer outputs**, not replacement painter inputs.
3. Inspect the **actual local** painting CLI: supported flags, write paths, how it finds `DERIVED`, whether `PIPELINE_DATA_ROOT` is honored, whether `--tag` exists, how a window is selected, whether `--plan` writes anything, how many attempts `paintWindow()` makes, and how Codex is invoked. Do this before naming executable commands.
4. Compare relevant behavior with upstream's painting design: 1024 px windows, 896 px stride, 128 px overlap, four aligned inputs (normal render, height pass, common style reference, species sheet), registration/anti-darkness checks, painted-window assembly into map tiles. **Do not merge upstream just to run this experiment.**
5. Save `docs/bologna-paint-compatibility.md`: local Git commit, flags actually present, exact invocation design, write-safety assessment, source inventory and differences from upstream.

**Gate 0 PASS:** dependencies and source image pairs validate; the painter can be run under a **hard one-call cap** and entirely separate output; otherwise STOP.

### Gate A — Select one representative window and prepare references (zero AI calls)

1. Inspect the 10-tile manifest and source rendering. Select **one** 1024×1024 painter window, preferably containing a recognizable portion of Piazza Maggiore and built massing of San Petronio / Palazzo d'Accursio, with enough streets, facades, open space and roofs to reveal failure modes. Use pixel/manifest mapping rather than assuming the lat/lon centre maps to window `0,0`.
2. Reject candidates dominated by blank cells, exterior edge, or a monument cut unhelpfully across a border; if no single window includes the desired feature, select the best available window and document the limitation. Record selected window `(i,j)`, exact global pixel bounds, approximate geographic centre, intersecting tiles, feature/CTC IDs and a screenshot crop.
3. Prepare **exactly** the same window's `input.png` (normal procedural colour) and `height.png` (same camera, pixel-aligned). Both must be 1024×1024, nonblank and valid. Preserve the original height PNG encoding and verify any height-map conversion used by the painter. Generate a diagnostic overlay of major footprint/roof, courtyard, road and tree boundaries; label it *QA-only*, not an image-generation reference unless the existing painter legitimately supports it.
4. Use the repository's house-style `pipeline/style/reference.png` if licence/provenance is documented and compatible with the project. Prefer an existing central-European tree sheet, such as `trees-stuttgart.png`, **only after** confirming it is an authorized project asset suitable for Bologna. If neither is defensible, create a minimal clearly documented Bologna tree style sheet from approved/synthetic sources during preparation **without an image-generation call**, or mark the experiment blocked. Never use the Tel Aviv palm sheet uncritically.
5. Define one scoped `LOCAL.bologna` configuration or equivalent optional region adapter: Emilia-Romagna historical centre, restrained ochre/brick/terracotta roofs, warm plaster and stone walls, pale stone paving, believable common urban trees. These are **visual hypotheses**, not guarantees that every footprint has those materials. The prompt must be *site-agnostic* where the architecture is unknown; do not put landmark names in a global prompt that gets reused on every Bologna window.
6. Add explicit constraints for this window: use only the render+height for position, shape and topology; preserve every road, corner, building volume, open piazza, courtyard void and visible portico clearance; no invented bell towers, clock faces, chapels, signage, statues, traffic, or fake trees; no perspective, camera rotation, crop or zoom. Improve texture, window treatment, material shading and illustration detail **within existing shapes only**. Do not claim San Petronio's historically correct facade from a back-facing camera view.
7. Save all inputs, a generated `prompt.txt`, licence/provenance manifest and candidate rationale under isolated `data/bo-004s-paint/`; mirror only lightweight docs and preview images to `docs/`.

**Gate A PASS:** clear candidate and approved sources; exact, reviewable prompt and 4 inputs; no external generative calls.

### Gate B — Reproducible dry run and explicit live authorization

1. Implement a `docs/bologna-paint-plan.ts` (or equivalent small reusable script) that validates source hashes, input dimensions, intended image-count and isolation; prints the **actual** painter command for *one* `(i,j)` window; reports destination paths and whether any file could be overwritten. This script must **not** invoke Codex image tools.
2. If the local painter supports `--plan`, run it only after confirming its side effects and setting the isolated data root; otherwise use the wrapper's `--dry-run` for a truly read-only validation. Never run `paint` without both a window selection and a verified one-call guard.
3. Generate `docs/bologna-paint-preflight.md`, containing:
   - selected `(i,j)`, area identifier and expected source tiles;
   - the 4 input file paths/hashes and prompt hash;
   - exact planned command, CLI model/backend and run mode;
   - source/asset licence summary;
   - **call cap = 1**, retry cap = 0, parallel workers = 1;
   - USD spend = `not applicable / unknown` for a logged-in Codex image tool unless a billable amount is explicitly reported (never state `$0` simply because no API key is configured);
   - explicit **STOP BEFORE LIVE** approval marker.
4. Produce an operator-facing summary and **STOP**. Do not call the model yet. Wait for user approval of that named single-window invocation.

**Gate B PASS:** preflight complete, no image calls, no changes to prior outputs. **This is the expected stopping point for an initial Codex run of this task.**

### Gate C — Single-window image-generation run (ONLY on separate explicit approval)

On a separate Codex CLI turn, after the operator explicitly approves the exact command/window and one image-generation call:

1. Re-verify the preflight hashes and source state; if changed, abort and request a new preflight.
2. Invoke only the verified one-window painter/wrapper, with a strict **one-call total** and no internal retries. Do **not** use a broad `--near`, all-area `--center`, `--force`, `--parts`, concurrency >1, or any fallback backend. Explicitly override the normal painter's multi-attempt behavior where required.
3. Preserve **raw model output before registration**, aligned/registered output, input, height, prompt, logs and registration metrics, never deleting these just because normal paint code cleans its `work/` files. A failed single call must not trigger a second.
4. Record backend, model if identifiable, number of generated outputs, start/end timestamps, tool usage/quota observables and any actual billed cost. Do not infer a financial price from the plan subscription.
5. Do **not** copy painted outputs into BO-003F, BO-005P, normal `paint/` directories, `data/web/` or production tile layers.

**Gate C PASS:** exactly one generated 1024×1024 image, saved with exact provenance. Failure, missing output, or limits => `INCONCLUSIVE` or `NO_GO`, without retry.

### Gate D — Geometry preservation, anti-hallucination and visual evaluation

Compare **three views with identical crop and scaling**: (a) procedural input; (b) raw model output; (c) registered model output. Quantitative checks are necessary but not sufficient.

Required automated checks (add a reproducible QA script with thresholds and raw values):

1. Image format/resolution: 1024×1024, valid PNG; no black bands, alpha holes, borders, labels or watermarks; compare actual alpha values.
2. Registration: record original and registered edge alignment, correlation/match score, XY offset and scale. Existing painter's `MIN_MATCH=0.45` is a *minimum engineering heuristic*, **not proof of faithful architecture**. Report raw drift even if registration later corrects it.
3. Semantics and masks: diagnostic overlays around selected building outlines, courtyards, plaza/road edges, tree clusters and portico. Count/locate new roof-like masses where the render has ground. Flag new walls across known courtyards or roads.
4. Controlled landmarks: at the selected window's actual visible scale, inspect San Petronio/Palazzo d'Accursio (if present). Do not award fidelity credit for imaginary belfries, clock towers or invented facade features. An attractive hallucination is a hard negative.
5. Edge checks: inspect all four outer bands. A single painting **cannot prove painted-to-painted continuity** because no neighbor was painted. Record compatibility with procedural surroundings, and separately identify any harsh transition. The viewer's ten original tile counts cannot certify painter-window seams.
6. Preserve an annotation sheet of 5–10 fixed locations (building corners, streets, courtyard voids, portico, open square where present), with unchanged pixel positions marked. Changes beyond ~4 pixels (about 1 m at this camera) are **investigate/human-review triggers**, not grounds to warp away an entire false building; any added/removed or merged building/road is an automatic fidelity FAIL.
7. If accurate controls are missing for a landmark, explicitly report its historical fidelity as **NOT_VERIFIED** rather than PASS.

Independent human rating rubric, one score each from 1 (poor) to 5 (strong):

- `Aesthetic improvement` (does it resemble Isometric World more than the normal render?).
- `Geometric fidelity` (do identifiable footprints, streets, public spaces and roof boundaries remain?).
- `Bologna visual identity` (does it look like Bologna rather than a generic imaginary town?).
- `Architectural honesty` (is structural uncertainty preserved, rather than hidden by invented details?).
- `Style consistency` (would adjacent windows plausibly continue the same palette/detail?).

Make a side-by-side JPG/PNG, a **50/50 wipe** or checker overlay, and at least 3 detail crops. Show procedural and painted versions at matching resolution. The agent may perform a preliminary visual review, but **must mark human visual acceptance NOT_TESTED** until user review occurs.

### Gate E — Optional isolated viewer preview (no publish, no extra AI generation)

Only if safe under the existing BO-005P local-preview integration: build a *temporary, isolated* hybrid test where one painted window (or its affected exported tiles) is assembled over the original procedural render, while all remaining pixels/tiles remain procedural. Preserve an independent output root and do not overwrite the 140 BO-005P assets. Do not introduce a production fallback or access R2.

Show at least two browser screenshots at close/medium zoom, capturing the painted/procedural boundary. Validate `P` compare/toggle if supported, attribution, no missing tiles, and unchanged URL/deep link behavior. If paint assembly/export is not safely isolated, **skip viewer integration**, provide a side-by-side proof and explain the blocker. The core BO-004S decision must not depend on doing an unsafe export.

### Gate F — GO / NO-GO decision

Produce `docs/bologna-paint-feasibility-report.md` with a short recommendation:

- **`GO_LIMITED`**: visually compelling, geometry preserved on the selected window, no material hallucinations; propose a **separately approved** two-adjacent-window seam test. This **does not** authorize painting the whole patch or city.
- **`REFINE_INPUT`**: style potential is evident, but geometric input, local prompt, tree sheet or chosen location undermines the result; propose one specific change and estimate *additional image calls*, but execute none.
- **`NO_GO`**: major geometric hallucinations, systematic spatial drift, unacceptable style, unresolved rights, or weak improvement; propose a procedural-styling/landmark alternative instead of indiscriminate retries.
- **`INCONCLUSIVE`**: no permitted image call, no output, backend error, or insufficient evaluation data.

A valid recommendation requires a **human review for visual quality**. Agent-only QA may assign `PENDING_HUMAN` with a provisional engineering result, but not the final `GO_LIMITED`.

---

## 3. Deliverables

Minimum at **preflight stopping point** (no image model called):

```
docs/
  bologna-paint-compatibility.md
  bologna-paint-preflight.md
  bologna-paint-feasibility-report.md     # status: PENDING_LIVE_APPROVAL
  bologna-paint-window-input.png        # scaled/credited QA view, if safe
  bologna-paint-input-manifest.json      # hashes, source refs, window, camera
  bologna-paint-plan.ts                 # reproducible dry-run/selection

data/bo-004s-paint/                    # untracked, isolated, preserved
  input/                               # frozen render/height/style/trees
  candidate/                           # candidate crop and diagnostic overlays
  prompts/
  manifests/
```

Additional only **after a separately authorized** single image call:

```
docs/
  bologna-paint-comparison.jpg
  bologna-paint-crops.jpg
  bologna-paint-qa.json
  bologna-paint-feasibility-report.md   # revised with actual results

data/bo-004s-paint/
  model-output/raw.png
  model-output/registered.png
  model-output/call-log.json
  qa/                                   # registration, masks, annotations
  viewer-preview/                       # optional isolated temporary export
```

`docs/bologna-paint-feasibility-report.md` must list: source commit/branch, selected window (i,j), exact baseline input root and hashes, local/upstream painter compatibility, any code changes, prompt and reference assets with licences, commands actually run, number of image-generation calls, real/unknown costs, QA values, before/after observations, human-review status, final recommendation and explicit remaining risks.

Any new source files/tests must be included in a reproducible handoff (untracked files as well as tracked patch). No secrets, `~/.codex/` tokens, API keys, or private local configuration in docs, logs or ZIP.

---

## 4. Engineering verification

Run (adapt commands to the actual checked-out package scripts; these are safe baseline examples):

```bash
nvm use 24

git status --short --branch
node_modules/.bin/tsc --noEmit -p pipeline
node_modules/.bin/tsc --noEmit -p web
# Run all relevant existing Bologna and viewer regression tests.
# Run newly added dry-run, output-isolation and QA unit tests.
git diff --check
```

Create negative safety tests proving:

- preflight cannot invoke an image model;
- missing/invalid height or render tile stops cleanly;
- output root already exists => refuse overwrite;
- attempts >1 or `--near`/unbounded job rejected by the live wrapper;
- source baseline hashes remain unchanged;
- selecting an invalid/out-of-manifest window fails;
- expired/mismatched approval hash prevents a live run;
- other-region config and normal painting commands remain unaffected.

Report actual tests passed/failed. Confirm that no `publish`, `deploy`, R2 sync, bulk painting or paid-provider fallback occurred.

---

## 5. Operator workflow and stop points

### First Codex CLI run — **preparation only**

Work on a fresh branch after checkpointing BO-005P:

```bash
git switch -c feature/bo-004s-paint-feasibility
codex
```

Paste this entire file into Codex, or ask Codex to read its local saved copy:

> Implement BO-004S through **Gate B only**. Read the complete task and repository instructions. Perform source checks, candidate selection, isolated input preparation, Bologna prompt/reference configuration, safe dry-run and preflight QA. **Do not call image generation** or initiate any paid request. Stop with the exact one-window command, SHA-256-identified approval target, expected output locations and user-review checklist. Do not auto-commit.

### Second Codex CLI run — **only if the operator approves Gate C**

Provide a clear, fresh approval naming the window `(i,j)`, input-manifest SHA-256 and **one image-generation call**. Use the exact command printed by Gate B. Execute only Gates C–D (and optional safe E), stop without retries, and return the actual proof artifacts to the operator. The user reviews the output before Gate F gets a final visual GO.

---

## 6. Explicit non-goals

No full patch/city painting; no changing the 315° camera to expose San Petronio's principal facade; no detailed clock-tower reconstruction or facade fabrication; no fresh proprietary imagery; no Google/fal provider switching without approval; no live vehicles, birds, tram or TPER; no general refactor of the renderer; no R2 source archival, public tile publication, Hetzner deployment or Umami instrumentation; no automatic commits, deletions or unbounded retries.

**Definition of done for BO-004S:** One isolated Bologna window has a fully reproducible preflight; if separately approved, exactly one controlled AI-generated candidate, with honest geometry/style QA and a human-reviewed decision whether a *small adjacent-window test* is worth doing. A citywide painting remains an entirely separate, not-yet-approved task.

---

## 7. Source notes to verify against local checkout

- Original project `AGENTS.md`: https://github.com/krasun/isometricworld/blob/main/AGENTS.md
- Upstream painter: https://github.com/krasun/isometricworld/blob/main/pipeline/src/paint.ts
- User's fork: https://github.com/jack982/isometricworld
- Prior local baseline: `docs/bologna-landmark-fidelity-report.md`, `docs/bologna-viewer-spike.md` and `docs/bologna-viewer-inputs.json`.

Upstream (at plan preparation) documents the four-input, 1024 px/896 stride painting model and experimental `--tag` capability; an older fork `paint.ts` has a smaller option set and retry behavior. The local `feature/bo-005p-local-viewer` checkout is the **authority** for executable flags, file locations and behavior. Do not blindly use example commands copied from upstream.
