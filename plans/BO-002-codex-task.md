# BO-002 — Bologna municipal GIS adapters (buildings first, trees second)

**Execution target:** Codex CLI in `jack982/isometricworld`, on a dedicated branch from the reviewed BO-001R baseline.

**Goal:** integrate the official Comune di Bologna CTC building polygons and relative eave heights into a separate, reproducible procedural map run, compare the new output with the frozen OSM-only BO-001R baseline, then optionally integrate municipal trees as a separately testable stage. This task is **implementation**, not only research or planning.

## Ground truth and prerequisites

Read `AGENTS.md`, `README.md`, `ATTRIBUTION.md`, `docs/bologna-data-audit.md`, `docs/bologna-data-validation.json`, `docs/bologna-coverage-fix.md`, `docs/bologna-coverage-source.json`, and the actual implementations of `pipeline/src/{places,areas,fetch,ground,scene,render,paths,osmlocal}.ts`. Follow the real repository types, data contracts, and script commands; do not assume the pseudocode below is the correct API.

Baseline available locally:

- Frozen region `bologna`, area `piazza-maggiore` bbox `[44.4893, 11.337, 44.4983, 11.349]`, WGS84 ENU origin `(44.4938, 11.343, h=0)`, heading 315°, pitch 45°, geoid 39.647 m. **Do not alter any frozen geographic/camera settings**.
- BO-001R complete surface snapshot under `data/bo-001r/`, including its isolated ground/scene/render and proof; original BO-001 in `data/raw/` and `data/derived/`.
- Municipal raw snapshot in `data/raw/bologna-audit/buildings.geojson` and `trees.geojson`, plus metadata. Validate counts/hashes against the audited JSON and source licensing. **Do not redownload unless a recorded snapshot is missing; never silently replace an audited snapshot.**
- Audit: 65,735 building polygons municipality-wide; 3,385 centroids within the test bbox, 3,330 with positive `altezza_gr`. This is an audit statistic, not a fixed expected count for *intersection + buffer* selection. `quota_gron` and `quota_pied` have an unresolved absolute vertical datum; `altezza_gr` is relative and may be used as such.
- BO-001R source OSM has 16,158 selected ground elements, 3,028 scene buildings (OSM) and 218 crowns; all 10 color/height tiles validate. The manifest has two intentional beige composition cells outside its tile set.

## Before editing

1. Inspect `git status`, base branch and working tree. **Do not overwrite or discard uncommitted BO-001R modifications or untracked documents.** If the working tree is not clean, stop operations that might overwrite work; report the condition and use a safely created new worktree/branch or request a human checkpoint. Do not commit automatically.
2. Read the current data contracts, triangulation/roof geometry logic, tree model and test infrastructure. Write a short implementation note in `docs/bologna-municipal-implementation.md` identifying the exact extension points, data provenance and migration strategy.
3. Use **new isolated data roots** (e.g. `data/bo-002-buildings/`, `data/bo-002-trees/`) via `PIPELINE_DATA_ROOT`; ensure baseline artifacts and all 82 preservation-inventory files remain unchanged. `scene.ts` may clean its own scene dir: never rerun it over earlier experiments without explicit verified backup.

## Stage A — Building integration (required)

### A1. Normalize and validate CTC source

- Build a Bologna-specific adapter, with unit tests, not a hardcoded mega-conditional throughout shared files. Reuse shared geographic helpers where possible. Keep a completely selectable **OSM-only baseline**.
- Load the audited GeoJSON snapshot and preserve `codice_ogg`, `descrizion`, `origine`, date/provenance and raw height fields. Validate geometry type, closed rings, coordinate bounds and finite values. Handle Polygon and MultiPolygon defensively if encountered.
- Select by **actual polygon intersection with bbox plus the existing scene/render margin**, not just centroid; preserve disjoint parts and *interior rings/holes*. Prevent courtyards from being filled by simplistic outer-ring handling. Report invalid/self-intersecting polygons, holes and overlaps. Reject or quarantine invalid records with reason codes rather than crashing or guessing.
- Source classification: do not extrude `Portico`, canopies, elevated links, ruins and other non-solid categories as ordinary full-height building boxes. Prepare deferred classifications for architecture/porticoes work, with transparent documented policy.
- Use positive `altezza_gr` as relative eave height. Zero/nonfinite/out-of-range values require explicit fallback and counters: OSM height where a reliable matched feature exists, levels where available, then the existing documented estimate. `quota_gron` / `quota_pied` must **not** be used as absolute WGS84 ellipsoid heights before establishing their datum. Do not add a geoid offset to a relative height. Roof shape is still an approximation, not surveyed geometry.
- Anchor buildings to the existing ground grid via a documented terrain sampling policy; sample/validate representative vertices, not just assume ground=0. Produce a diagnostic report for large height offsets, suspected floating/sunk buildings, and slope handling.

### A2. Reconcile CTC with OSM

- Implement a configurable geographic source path for Bologna without altering Tel Aviv/Stuttgart behavior, region camera settings or the existing BO-001R OSM-only run.
- **Avoid duplicate buildings:** match CTC geometries to existing OSM volumes by overlap and proximity in projected metres, with auditable matching thresholds and examples (1:1, 1:N, N:1). Prefer CTC for matched solid buildings. Retain OSM buildings only where CTC offers no usable coverage; never remove unmatched OSM landmarks silently.
- Report matched, replaced, retained fallback, filtered non-solid, invalid and ambiguous geometry counts; verify that duplicate footprints and obvious vertical intersections are not introduced.
- Respect source licensing and attribution: when CTC actually contributes geometry, include **Comune di Bologna – SIT**, dataset link, **CC BY 4.0** link and adaptation notice in the map/viewer credits, render manifest, any generated proof and `ATTRIBUTION.md`, along with the already active OSM/Copernicus notices.

### A3. Run and compare

- Hold the same area, camera, terrain/ground surface input, lighting, procedural style, rendering parameters and OSM version as BO-001R. Change **building data only**.
- Build `data/bo-002-buildings/` in isolation, generate the scene and render with SwiftShader where necessary. Produce `docs/bologna-municipal-buildings-proof.jpg`, a paired side-by-side reference comparing the **same central tile**, and a QA JSON with counts and diagnostics.
- Confirm all expected **10/10** color and height tiles exist and are nonblank/opaque; verify the manifest matches the frozen BO-001R coordinates and check the 13 existing shared boundaries for visible seams. Do not treat the two out-of-manifest beige montage cells as failed tiles.
- Inspect specific geography: Piazza Maggiore, Piazza Nettuno, Basilica di San Petronio, Palazzo d'Accursio, and a block containing an interior courtyard. Annotate known procedural inaccuracies (roofs/facades/porticoes/monuments) distinctly from geometry or height errors.
- **Stop here for a review gate** if the municipal buildings introduce serious holes, duplicated masses, floating buildings, a broken renderer, or inconsistent attribution. Do not conceal problems by AI painting.

## Stage B — Municipal trees (secondary, only if A passes)

- Normalize the audited municipal points (`num_pt`, `classe`, `cl_h`, coordinates), keeping original provenance, species and source date fields. `cl_h` is a **height class**, not a measured numeric height. Use labelled default midpoint/range heuristics and document the open-ended top class; do not invent precise measured heights or canopy radii.
- Deduplicate municipal points against OSM point trees with a documented spatial tolerance in metres; keep OSM park/woodland polygons and trees not matched by a valid municipal observation.
- Keep the tree shapes procedurally generic in BO-002; species-dependent styling belongs to BO-003. Report freshness limits and missing/private tree coverage.
- Build a **separate** `data/bo-002-trees/` from the approved buildings stage and compare its central tile against buildings-only. Update credits if needed (Comune di Bologna – Settore Ambiente e Verde, CC BY 4.0) and QA.

## Tests and acceptance gates

- Unit tests: ring/hole preservation, multi-part geometry, malformed/zero heights, non-solid categories, CTC/OSM overlap edge cases, spatial selection, tree height classes/dedupe, datum-safe relative heights, source attribution and source switching.
- Golden/regression checks: BO-001R source and files untouched, frozen bbox/camera/ENU unchanged, OSM-only run still selectable, Tel Aviv and Stuttgart source behavior unchanged. Run project TypeScript checks and relevant tests; note the pre-existing `web/src/scripts/map.ts:34` `ImportMeta.env` error separately, without conflating it with new regressions.
- Acceptance: a CTC-derived municipal building layer demonstrably used; valid in-area buildings have preferential CTC heights where positive; topology/courtyards not destroyed; duplicate buildings controlled and quantified; original baseline preserved; complete declared attribution; manifest-based render and seam QA pass; comparison images and metrics produced; remaining known defects explicitly listed.
- No fixed requirement that municipal CTC feature count equal the 3,385 *centroid* count: intersection/margin/category selection changes the population. Explain and quantify the difference.

## Deliverables

1. `docs/bologna-municipal-implementation.md` with exact architecture, source schema, classification/matching policies and run commands.
2. `docs/bologna-municipal-qa.json` and reproducible, tested QA scripts, including source attribution and topology diagnostics.
3. `docs/bologna-municipal-buildings-proof.jpg` plus `docs/bologna-buildings-comparison.jpg`; optionally tree proof/comparison for Stage B.
4. New isolated datasets/render under `data/bo-002-buildings/` and, if completed, `data/bo-002-trees/` (gitignored, preserved). Report snapshot SHA-256 and setup requirements.
5. Written handoff: changed/tracked/untracked files, commands, counts before/after, passed/failed tests, critical visual findings, known limitations, recommendations for BO-003.

**Strict exclusions:** no AI painting, no public deployment, no publish/export, no camera orientation change, no unrelated source rewrites, no deletion/replacement of BO-001/BO-001R artifacts, no automatic commit. If a requirement cannot be fulfilled, document the limitation and complete everything safely achievable instead of declaring success without evidence.

**Execution instruction:** Implement this task now in the current repository. Do not return only a plan. Perform Stage A fully first; proceed to Stage B only if Stage A's automated and visual checks pass. In the final CLI response explicitly say whether Stage A passed, whether Stage B ran, and what artifacts to send for external review.
