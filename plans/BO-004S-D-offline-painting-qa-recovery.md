# BO-004S-D — Offline Painting QA & Recovery

**Project:** Isometric Bologna / fork `jack982/isometricworld`  
**Agent:** Codex CLI, Node.js 24, reasoning High  
**Branch:** create `feature/bo-004s-d-offline-qa` from the current BO-004S-C recovery branch *after inspecting local Git state*  
**Execution:** fully offline/read-only with respect to the painter, with only isolated diagnostic outputs  
**Scope:** the **existing** painted candidate from window `(-1,-1)`, not a new generation  
**Decision:** `RECOVERABLE_FOR_OFFLINE_TEST` / `REFINE_REQUIRED` / `REJECT_CANDIDATE` plus a separate **HUMAN_ACCEPTANCE_REQUIRED** field

> **NON-NEGOTIABLE:** Do **not** run Codex image generation, `paint`, `image_gen`, Images API, fal.ai, retry a previous generation, publish, export production AVIF, or register this candidate into the live/local map. No commits. Do not alter or delete previous outputs, journal files, manifests, QA or logs. Treat the existing `raw.png` as a valuable immutable experiment artifact.

## Context and confirmed facts

- The original procedural painter input for Bologna window `(-1,-1)` is 1024×1024 pixels. It has four staged image inputs: `input.png`, `height.png`, `style.png`, `trees.png`. The prompt explicitly requests the **same camera, extents and pixel-aligned geometry**, with no changes to roofs, footprints, roads, courtyards, porticoes or trees.
- An authorized **one-outer-process** Codex CLI attempt was completed, using ChatGPT login, on November 20, 2026. The runner reported `exitCode: 0`, no stop signal, no timeout, and saved a `raw.png`; it nevertheless marked the run `FAILED_NO_RETRY` with `qaFailure: "WRONG_OUTPUT_DIMENSIONS"`.
- The local result manifest records:
  - `data/bo-004s-codex-recovery-r1/execution/result.json`
  - expected original candidate: `data/bo-004s-codex-recovery-r1/execution/raw.png`
  - recorded raw SHA-256: `4edf05309116fea5e631be83bc444f3795483f53028e3fef3e3353b6975c9458`
  - recorded raw bytes: `4393198`
  - displayed image dimensions: **1254×1254**, while the painter contract expects **1024×1024**.
- A separately shared image may have been re-encoded or modified during upload. **The original local `raw.png` and its checksum take precedence.** If the local hash or size differs, stop and explain rather than silently treating it as the same artifact.
- The result says `registrationApplied: false`, `internalImageToolCalls: UNKNOWN_NOT_HARD_CAPPED`, `allowanceChange: NOT_OBSERVED`, `usdCost: UNKNOWN_NOT_INFERRED`. Do not infer that exactly one internal image call occurred or assign a dollar cost.
- Initial human visual inspection suggests a strong Bologna palette and illustrated detail, but also **some flat roofs may have become pitched terracotta roofs**. This is a potential geometry/topology violation to investigate, not a passed fact.
- The prior BO-004S-C image QA compares edge maps at identical dimensions and uses edge correlation ≥0.45 as a **heuristic only**, not proof of correct geography or architectural fidelity.

## Exit criteria

We need to answer four questions with reproducible evidence:

1. **Why did the generator return 1254²?** Is this simply uniformly scaled same-content framing, added padding, a shifted crop, or actual layout distortion? Do not claim a causal explanation without evidence from CLI/prompt/tool-output logs.
2. **Can one deterministic, geometry-preserving conversion to 1024² be supported?** Diagnose; do not change or register the raw original. A plausible resize is not automatically safe.
3. **Which geometric and architectural features changed?** Distinguish appearance-only transformations from displaced outlines and new/removed structures, especially roofs, streets, courtyard voids, portico clearance and landmark towers.
4. **Should this candidate be kept for a second-window seam experiment, refined via procedural materials/prompt/reference changes, or rejected?** Recommendation must be supported by QA **and** explicitly await human acceptance.

---

## Gate 0 — Evidence inventory, integrity and isolation

1. Read `AGENTS.md` and inspect the current local repo/branch and relevant files before editing:
   - `docs/bologna-paint-codex-core.ts`
   - `docs/bologna-paint-codex-process.ts` (especially `imageQa`)
   - `docs/bologna-paint-codex-recovery-live.ts` and recovery-related handoff docs, if present
   - `docs/bologna-paint-preflight.md`, `docs/bologna-paint-feasibility-report.md`
   - `docs/bologna-paint-input-manifest.json`
   - `docs/bologna-paint-codex-preflight.md`, if present
   - the actual input/prompt and the `result.json` of the recovery execution.
2. Confirm Node 24 is active. Do not silently switch versions. Inspect `git status --short` and record existing changes without staging or resetting them.
3. Identify **authoritative local paths** for the painted raw and its corresponding source input, height map and prompt. Prefer the exact staged inputs pinned by the **recovery** manifest; if those paths are different from previous spikes, document why. Avoid comparing candidates from different snapshots.
4. Compute SHA-256 and file length for the original raw PNG, original procedural PNG, height PNG, and prompt. Validate against the appropriate *existing* manifest where hashes are available. Validate image metadata (format, width, height, channels, opacity, ICC if present). Use the recorded raw hash and byte count above as a consistency check.
5. Verify the saved attempt journal, `result.json` and logs remain unchanged. Re-read the logs without leaking tokens/secrets. Identify any evidence of model-generated image dimensions or re-encoding; if absent, label root cause **unknown** rather than guessing.
6. Create a **new isolated** output directory such as `data/bo-004s-d-offline/`. Refuse to overwrite or delete an existing directory. Write the initial input inventory to `docs/bologna-paint-offline-inventory.json` with absolute/relative provenance, file sizes, hashes, and source path names, but do not copy secrets into it.
7. Confirm all subsequent steps work **without network access** and do not invoke a subprocess matching `codex exec`, any image generator or external service. If needed, design tests that mock any transport; do not actually generate.

**Gate 0 stop conditions:** missing raw/source image, provenance/hash mismatch without explanation, unreadable PNG, or an unresolvable source snapshot ambiguity. In that case produce an evidence-based blocker report, stop; do not repair or overwrite the source.

## Gate A — Dimension discrepancy and deterministic normalization experiments

Implement a small, isolated **diagnostic** script, e.g. `docs/bologna-paint-offline-qa.ts`. Reuse repo dependencies (`sharp`, test harness, existing geometry/QA helpers) where practical. Never edit the original image in place.

1. Inspect 1254×1254 candidate versus 1024×1024 procedural input. Test independent explanations:
   - **Uniform same-framing scale**: downsample to 1024×1024, preserving aspect ratio and the entire original extent. Use an explicitly documented interpolation kernel (e.g. Lanczos3).
   - **Extra border/padding**: check for a content bounding box, constant/near-constant margins, shifted framing and intentional 1254 canvas area; if evidenced, trial a well-defined crop to the same geographic extent followed by resizing **only as a separate hypothesis**.
   - **Nonuniform / locally inconsistent geometry**: seek evidence that no single global scale-and-translation fits multiple independent control points. Do **not** “fix” this with a local warp.
2. Save named, non-destructive outputs under `data/bo-004s-d-offline/diagnostics/`, such as:
   - `resized-full-1024.png` (always diagnostic, even if its visual quality looks good)
   - `center-crop-1024.png` **only** when objectively relevant
   - `alignment-hypotheses.json` (transforms, interpolation, edge/match metrics and uncertainty)
   - `raw-metadata.json`.
3. A diagnostic 1024 PNG is **not an accepted painted tile**. Never copy it to the painter's `out.png`, the original `raw.png`, the production painted tiles or the viewer. Preserve exact raw bytes and hashes.
4. Compare candidates using global and local measurements, not just visual similarity:
   - matched landmarks/corners/control points on roads and building footprints distributed across all quadrants;
   - alignment residuals after **one global** scale-and-translation hypothesis, reporting median, p95 and worst-case distance in input pixels, with spatial distribution;
   - gradient/edge correlation (and the original QA heuristic, for comparability), with clear caveat about differences caused by textures;
   - camera/framing consistency, overlap in each of the four borders, and absence of missing perimeter content;
   - opacity, black-band and valid PNG checks.
5. **Do not invent authoritative correspondences.** If control points cannot be matched reliably by deterministic CV techniques, create an annotated overlay for operator review and report alignment as uncertain. Avoid extracting geometry from the painted texture as though it were a surveyed footprint mask.
6. Produce side-by-side and 50% transparency overlays; optional difference and edge overlay. Preserve the originals in a read-only evidence chain.

**Important:** simply rescaling 1254→1024 is insufficient to claim geometry preservation. The model could have redesigned roof shapes and the street grid while keeping the general isometric look.

## Gate B — Geographic topology and architectural QA

Inspect images at identical geographic extents **only where the alignment hypothesis is defensible**. Include both *whole-window* comparisons and high-resolution, named detail crops. The model-generated appearance is not authoritative geometry.

For each item, record `PASS / FAIL / UNCERTAIN`, severity (`blocking / major / minor`), evidence crop and brief explanation:

| Check | What to inspect | Typical failure |
|---|---|---|
| Road centre lines and edges | Road axes, corners, widths, intersections, entrances | Roads widened, moved, missing, invented |
| Building volume topology | Outer footprint boundaries and distinct blocks | Merged/subdivided/new or removed buildings |
| Roof planes | Existing pitched/flat planes and roof outline | Flat roof turned into sloped roof; extra ridge or height |
| Courtyards | Interior voids and their connectivity | Covered courtyards and invented roof mass |
| San Petronio | Silhouette, large roof segmentation, perimeter | Extra bell tower/roof, changed visible massing |
| Palazzo d'Accursio | Volume articulation and tower area | Invented clock/tower or altered roof transitions |
| Pilot portico | Open span, supports, underpass clearance | Columns moved, openings filled, fake arches |
| Trees | Presence and positions versus input | Invented/removed trees, palms added |
| Image framing | Same edges, scale, camera and crop | Center shift, padding, missing boundary |
| Visual language | Warm Bologna colors, materials, detail level | Tel Aviv modern towers/coastline or unsupported historic claims |

- Annotate **specific regions**, not just whole-image similarity. Prepare at least 5–8 relevant crops distributed across the window, with before/after paired images and coordinates recorded in a manifest. Use real image-pixel coordinates in the *original 1024 reference frame*, not guessed CTC IDs.
- If existing height/structure guides or verified CTC IDs can be used reliably, compare roof edges and no-build voids against those. Document limitations: height guide is an interpolated raster, **not** cadastral roof segmentation.
- If an edge metric rates the candidate as passing but one critical topology case fails, the final structural gate **fails**. If there is not enough evidence to know, mark **UNCERTAIN**, never PASS.
- Do not add or remove geometry, recolor, mask or inpaint to “improve” the candidate during QA.
- Do not treat newly illustrated facade detail as historical fact. Distinguish aesthetic appeal from geographic fidelity.

## Gate C — Offline recovery decision, without registration

Separate **file-format recoverability**, **spatial recoverability**, **architectural fidelity** and **artistic quality** in the decision matrix:

1. **Format:** can a deterministic 1024×1024 derivative be produced? If yes, `FORMAT_RECOVERABLE` does not mean QA PASS.
2. **Alignment:** is a single globally documented transform enough to recover the exact original footprint/road framing? `PASS / FAIL / UNCERTAIN`.
3. **Topology:** any critical changed building mass, roof plane, portico void, or courtyard? `PASS / FAIL / UNCERTAIN`.
4. **Style:** strong/medium/weak match to Isometric World appearance and Bologna's color palette, based on human-readable evidence.
5. **Readiness:** one candidate cannot demonstrate between-window seam continuity, scalability or cost. Those are **NOT_TESTED**.

Use these decision labels:

- **`RECOVERABLE_FOR_OFFLINE_TEST`**: an independently inspectable 1024 derivative fits the same source framing, no **known** major topology failures remain, and evidence is adequate to justify a later human visual decision. **No registration/publication permitted** without further approval.
- **`REFINE_REQUIRED`**: the painting is visually promising but has meaningful geometric changes, mismatches, or insufficient proof; retain it as a reference for targeted shader/material improvements and prompt/reference refinement. This is a useful technical experiment, not a usable map tile.
- **`REJECT_CANDIDATE`**: major geometry deformation, unresolvable framing mismatch, corrupt evidence, or other blocking error.

A **failed original QA is never reclassified as a successful live invocation.** `result.json` stays `FAILED_NO_RETRY`, and the independent offline assessment has its own status and provenance. No editing of `result.json`, `qa.json` or the previously computed checksums.

**Final human gate:** explicitly set `humanAcceptance: "PENDING"`. Codex may recommend; it must **not** self-approve geographic/architectural fidelity or recommend copying the result into public tile storage before review.

## Gate D — Implementation quality, regression and handoff

- Implement read-only processing of source evidence and write only to the new isolated data/output root and new `docs/bologna-paint-offline-*` files. No changes to the production renderer, `paint.ts`, viewer, tile manifests, approvals or live wrappers unless a strictly necessary fix is independently justified and approved.
- Tests (offline / fixture-based) should cover at least: source hash mismatch; immutable raw; no automatic invocation; 1254→1024 diagnostic; boundary/padding versus full-frame scale; global translation detection; locally distorted geometry detection; opacity/black bands; missing control-point evidence; report classification; no output collision; no production writes; no attempt to repair historical `FAILED_NO_RETRY`.
- Run relevant tests, TypeScript checks for pipeline/web/QA scripts, and `git diff --check`. Record actual commands and results; do not claim complete passing tests if they have not run.
- Verify previous protected paths unchanged using their original manifests/hashes where practical; record counts and any exceptions.
- Document total cost of this task as **zero new provider/image-generation requests** (if true). Do not infer a precise prior cost or internal image-tool call count.
- Do not commit, delete datasets, publish, use remote APIs, create an extra painted image, or launch a background task.

### Required deliverables

Produce all of the following (use these exact basenames when practical):

```text
docs/
  bologna-paint-offline-report.md          # findings, images, decision, limitations, next steps
  bologna-paint-offline-qa.json            # machine-readable measurements + per-region pass/fail
  bologna-paint-offline-inventory.json     # pins / provenance of raw, input, prompt, guides
  bologna-paint-offline-comparison.jpg     # original input vs 1024 diagnostic (labelled)
  bologna-paint-offline-overlay.png        # alpha/edge overlay on fixed 1024 coordinates
  bologna-paint-offline-crops.jpg          # paired zoomed details, labelled
  bologna-paint-offline-checksums.json     # hash inventory of new outputs
  bologna-paint-offline-qa.ts              # reproducible read-only QA / diagnostic script
  bologna-paint-offline-qa.test.ts         # offline mock/fixture-based tests

data/bo-004s-d-offline/                    # isolated, gitignored diagnostic outputs only
  diagnostics/
    resized-full-1024.png
    alignment-hypotheses.json
    raw-metadata.json
    # additional explicitly labelled hypotheses only if justified
```

Report sections:

1. **Executive decision** (format / alignment / topology / style / human gate).
2. **Source evidence** (local paths, sizes and hashes; account for any mismatch).
3. **Why 1254×1254** (evidence-supported explanation or `UNKNOWN`).
4. **Transform comparison** (image dimensions, variants, global/local residuals, edge metrics, caveats).
5. **Geographic and architectural QA** (table of pass/fail/uncertain for each feature and severity; references to annotated crops).
6. **Recommended path**: keep for future seam test, improve procedural roof/facade/street materials, adjust prompt/references, or reject. State the smallest next experiment and any gating human decisions.
7. **Engineering results**: tests, typecheck, hashes, changed/untracked files, original statuses preserved.
8. **Copy/paste artifact list** for external review, excluding the large raw datasets.

## Final response expected from Codex

Return a concise summary with:
- source and derivative SHA-256/size/dimensions;
- `FAILED_NO_RETRY` retained for historical live run;
- best alignment hypothesis and objective reasons;
- 3–5 most important geographic/architectural findings;
- offline `RECOVERABLE_FOR_OFFLINE_TEST` / `REFINE_REQUIRED` / `REJECT_CANDIDATE` decision, **human acceptance pending**;
- number of tests/checks actually run;
- exact deliverables created and any blockers;
- confirmation: **zero new image-generation/provider calls, zero commits, zero publishing.**

**STOP after the offline report. Do not proceed to another image generation, registration, export, or deployment.**
