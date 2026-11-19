# BO-003 — Bologna Architectural Fidelity, procedural pilot

Repository: `jack982/isometricworld` (fork of `krasun/isometricworld`)
Execution: Codex CLI, Node.js 24, reasoning High, dedicated feature branch.
Scope: ONLY the frozen `piazza-maggiore` pilot region, no citywide rollout.

## Goal

Make Bologna architecturally recognizable **without** AI painting. Keep the geographic accuracy and traceability achieved by BO-002: municipal footprint partitions, relative eave heights, 712 courtyard rings, OSM residual fallback and 784 crowns. Prioritize correct landmark massing, roofs and an initial portico treatment rather than indiscriminate decoration. This is a pilot for later isometric map tiles, a public navigable viewer, and possible upstream contribution. Preserve existing Tel Aviv, Stuttgart and other region behavior.

**Important:** This task is an implementation task, not just a research report. Complete an initial audit and then implement a narrowly scoped pilot. Stop at gates requiring visual review if fidelity is not defensible. Don't silently invent measured roof heights, skyline silhouettes, 3D models or monument detail.

## Preconditions and source inspection

1. Read `AGENTS.md`, `README.md`, `ATTRIBUTION.md`, `docs/bologna-data-audit.md`, `docs/bologna-municipal-implementation.md` and both municipal QA JSONs.
2. Inspect all actual new/untracked BO-002 source: `pipeline/src/bologna.ts`, `bologna-geometry.ts`, `bologna-credits.ts`, `bologna-run.ts`, `bologna.test.ts`, plus renderer, ground, geometry conventions, active scene bins, landmark identification and source attribution.
3. Check git status and present branch/HEAD. BO-002 artifacts may not be committed. Do not overwrite/destroy preexisting data, outputs, user files, or baseline render roots. Create a dedicated branch AFTER the user commits the approved BO-002 state, or work in the already dedicated new branch if user has prepared it.
4. Pin/reference BO-002 input hashes and camera, heading, origin, geoid, bbox, DEM, source snapshots and artifact hashes in a manifest. Treat municipal `altezza_gr` as relative eave height, never as ridge height. Don't use `quota_gron`/`quota_pied` as ellipsoidal altitudes until vertical datum is verified.

## Mandatory Gate 0 — BO-002 source hardening (before architecture implementation)

The five previously unreviewed BO-002 adapter files have now been inspected. Complete this small source-level correctness pass **before creating landmark overrides, roofs or porticoes**. Do not refetch inputs or change existing BO-001R/BO-002 artefacts. Work only in a fresh BO-003 branch/output root.

1. **Prevent false OSM metadata matches.** In `pipeline/src/bologna.ts` `baselineVolumes()` (around lines 25–38), `rawIndex.query()` is a bounding-box candidate search, not a proof of geometric intersection. Currently `matches[0]` can be chosen even if all overlaps are zero. Require a positive geometrical overlap (document a small tolerance and/or a proportion threshold) before inheriting OSM tags and ID. For unmatched footprints, preserve a stable, unique fallback identity; record the absence of an OSM match. Add a regression test with two touching but disjoint footprints and another with true multipart intersection, ensuring no unrelated landmark name/ID is inherited.
2. **Carry verified source identity into architectural rendering.** `tuple()` currently emits `[outer, height, style, groundHint, holes]`, whereas CTC volume ID, `descrizion`, source and `heightSource` exist only in the volume sidecar (`municipal-buildings.json`). Implement an **opt-in BO-003 metadata channel** from verified `Volume.id` to renderer styling/geometry, for example an optional trailing metadata field or a dedicated ID-indexed sidecar/mesh overlay. Avoid matching architecture by tuple sequence, stringified geometry or guesses from lat/lon. Preserve backward compatibility with 4-element OSM tuples, 5-element BO-002 tuples, and existing LoD2 meshes. Regression-test generic/default output unchanged and verified San Petronio/Palazzo d'Accursio IDs addressable with no ambiguity.
3. **Make architecture seam checks a true gate.** The BO-002 QA `docs/bologna-municipal-qa.ts` records `sharedBoundaries[].review` flags (around lines 33–38) but does not include them in `automatedPassed` (around line 69). For the new BO-003 QA, assert no unexplained significant seam warnings or explicitly fail the gate, while preserving details for visual manual review; tile opacity alone is insufficient.
4. **Allow an isolated BO-003 output root without weakening safety.** `pipeline/src/bologna-run.ts` currently accepts only `data/bo-002-*` destinations (line 19), and refuses existing roots (line 28). Extend or create a dedicated BO-003 runner that supports a single fresh architecture test root, rejects all baseline/BO-002 output roots, and does not mutate source snapshots. Test both allowed and forbidden roots.
5. **Record boundary cases, not fictional fixes.** The OSM baseline relation reader uses only its first outer ring; some OSM ID joins may remain ambiguous. Identify landmark volumes from audited CTC IDs plus authoritative source geometry, and document unresolved cases rather than choosing the nearest name. Re-check the 239 dropped slivers (39.93 m² total) near chosen monuments and the 12 terrain slope cases before custom modelling. These are risk audits, not blanket blockers.

Gate 0 acceptance: all new unit tests pass; a stable metadata-ID mapping is demonstrated for the two pilot landmarks or explicitly blocked with evidence; baseline BO-001R/BO-002 tiles remain byte-identical; source-derived labels are not inherited from zero-overlap candidates; no scene/data root overwrites. **Stop and report** if ID provenance cannot be made unambiguous; do not proceed with speculative architecture.

## Deliverable A — Architecture and reference audit

Create `docs/bologna-architecture-audit.md` including:

- Architecture inventory: generic roof/flat cap/facade/roof clutter generation and existing LoD2 conventions; extension points and estimated impact of change.
- Actual identities and source geometries for Basilica di San Petronio, Palazzo d'Accursio, Palazzo Re Enzo, Nettuno fountain, Torre degli Asinelli and Garisenda (only where in pilot area). Match via unique source IDs and verified spatial geometry; don't apply a style using a name/coordinate guess alone.
- At least two legally usable, attributable primary/official reference sets or explicitly document lack of suitable measurements. For each landmark, record what is factual vs approximate vs unknown. No copyrighted image ingestion for AI painting in this task.
- Roof topology candidate selection: flat, gable, hipped and complex/monument-specific, preserving holes and partition constraints. Document how ridge orientation is inferred and when to fall back to flat.
- Inventory of all **20 deferred portico records** in the selected BO-002 sample: geometry, position, relation to solid volumes, classification and which 1–2 representative short runs are safe as a pilot. Avoid extruding portico polygons as full buildings.
- Map all **12 BO-002 slope warnings** with CTC/OSM source IDs and local landmark proximity. The max reported ground spread is ~4.18 m and max wall embedding ~5.18 m; investigate terrain/model mismatch without changing absolute vertical references blindly.

Gate A: If a named landmark cannot be identified reliably, omit only that landmark and record the uncertainty. If no safe portico segment is geometrically available, implement just the analysis rather than fictional arches.

## Deliverable B — Architectural rendering pilot

Introduce opt-in, region-specific extension hooks or metadata. Do not add `region === 'bologna'` conditionals throughout general renderer code. Preserve backward compatibility with OSM-only 4-tuples, BO-002 five-tuples and LoD2 path. Use isolated output roots e.g. `data/bo-003-architecture/` and retain the BO-002 stage A/B render inputs and proofs unchanged.

1. Replace inappropriate modern rooftop clutter **for the pilot Bologna style**; keep other cities visually identical. Implement a restrained Bologna-inspired palette with material categories: roof terracotta where justified, plaster/brick/stucco surfaces, stone/paving. Keep surfaces recognizable and readable at 0.25 m/art-pixel without claiming actual roof colors per building.
2. Implement at least 2 procedurally different roof families (e.g. gable/hipped) for eligible ordinary footprints. Enforce valid triangulation, courtyard exclusion and no overlaps/seams. Avoid using a single ridge heuristic for complex concave polygons; use flat/segmented fallback and report counts. Do not raise the surveyed eave roof height as though it were surveyed ridge height; define and label bounded ridge uplift as an estimate.
3. Landmark-specific architectural massing: prioritize **San Petronio** and **Palazzo d'Accursio**. Reconstruct their identifying silhouette via explicit source-ID overrides/custom geometry where defensible, with roof/height/silhouette cues; verify that Piazza Maggiore and Piazza Nettuno remain open. Additional landmarks are stretch goals after review, not requirements for passing the first pilot.
4. Portico pilot: render 1–2 verified sections with a setback/open undercroft, arches/columns or a lower-detail equivalent, consistent with source geometry; do not create solid full-height blocks under porticoes. Maintain no open wall holes against a solid neighboring mass.
5. Optionally improve species-aware crowns after all essential architecture passes. Preserve municipal class-height provenance, deduplication and counts. Do not block release on botanical styling.
6. Use a distinct feature flag / data mode for the Bologna architectural pilot so BO-002 plain CTC remains selectable.

Gate B: Stop after the first architecturally recognizable **two-landmark pilot** and 1 safe portico run, and generate comparative renders before any wider procedural style rollout.

## Deliverable C — QA and comparisons

- Render with the exact same frozen camera, bbox and terrain. Use explicit SwiftShader where needed. Output `docs/bologna-architecture-proof.jpg`, `docs/bologna-architecture-comparison.jpg`, `docs/bologna-architecture-landmarks.jpg` with side-by-side crops of San Petronio, Palazzo d'Accursio, Piazza Maggiore/Nettuno, portico sample and at least one courtyard. Include all required active-data credit lines.
- QA JSON (`docs/bologna-architecture-qa.json`) must include: building/roof counts by method, estimated ridge uplift histogram, courtyard-preservation counts, landmark source IDs and manual reference gaps, portico source IDs, slope cases, tile alpha/hash validation, all expected tile count and seam checks, geometric invalidity/overlap tolerances, attribution, and original artifact checksums.
- Assert OSM-only BO-001R hashes are unchanged; assert plain BO-002 buildings/tree output and attribution are unchanged; assert frozen geography and municipality source count/hole topology are unchanged unless explicitly documented. Regression-test other region modes where practical.
- Do not conflate manual visual review `--visual-reviewed` with independent automated evidence. Record exactly what was inspected and what remains unknown. For any visibly wrong landmark (floating roofs, absurd silhouette or blocked square), mark the gate failed and stop rather than polishing it with textures.
- Run automated tests (incl new roof and portico tests), pipeline TypeScript, QA-script TypeScript, `git diff --check`; report preexisting web `ImportMeta.env` error separately unless this task introduced further errors.

## Out of scope

No AI painting, no general animated traffic/birds/tram, no real-time transit, no public viewer or deploy, no R2 uploads, no redesign of the city-wide data pipeline, no changes to frozen geographic settings, no full Bologna expansion, no auto-commit. Preserve R2/upstream eligibility by isolating data, styles, UI analytics and future public-hosting configuration from the common engine.

## Handoff

Include a standalone **Gate 0 findings** section with changed source files, exact new tests and proof of identity propagation.


Deliver:

1. `docs/bologna-architecture-audit.md` (sources, fidelity matrix, 12 slope cases, 20 portico candidates).
2. Architectural images and QA JSON.
3. New/changed code and tests, including **untracked source files**, with clear paths; do not provide only `git diff` if files are untracked.
4. A reproducible command log and checksum manifest, with original BO-002 scene and render outputs intact.
5. A PASS/FAIL for each gate, limitations and highest-value next steps before BO-004 AI painting.

## Acceptance

- Gate 0 source hardening complete, with no zero-overlap OSM metadata inheritance and opt-in verified CTC-ID architectural styling.

- The pilot produces an **obviously more Bologna-like** San Petronio / Palazzo d'Accursio than the BO-002 procedural reference without degrading geography.
- One accurately grounded pilot portico section shows actual opening/clearance (or the task stops at a documented block if source geometry is inadequate).
- No new missing/transparent tiles, significant seams, accidental courtyard fills, duplicate solids or unexplained terrain/floating errors.
- Other regions and accepted OSM/BO-002 baselines remain unchanged.
- No fabricated measured geometry, uncontrolled image licensing, or premature upstream claims.

At the end return a concise implementation report and **stop**, without automatically starting a new phase.
