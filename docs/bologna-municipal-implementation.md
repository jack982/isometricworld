# BO-002 implementation note

Work starts on the existing dedicated `feature/bo-002-municipal-adapters` branch, HEAD
`b5d0763` (BO-001R). Tracked files are clean. Untracked `plans/` and `bologna-review.zip`
belong to the user and remain untouched. No commit or reset is part of this task.

Extension points: add a Bologna-specific adapter and runner beside the existing pipeline CLI.
Keep `scene.ts`, `fetch.ts`, `ground.ts`, `osmlocal.ts` and the OSM-only manifests unchanged.
The runner consumes the audited municipal snapshots, copies BO-001R ground/OSM inputs into
fresh isolated data roots, builds compatible scene bins and invokes the existing render CLI.
An explicit `osm` mode remains available. Municipal building tuples add an optional fifth
item (interior rings) to the existing `b` array. Renderer walls, roof triangulation and rooftop
placement must respect these holes; old four-item tuples retain their existing behavior.

Use polygon-clipping (MIT) for polygon intersection/difference in ENU metres. Validate closed,
finite, simple rings before boolean operations; quarantine invalid topology with reasons.
Select actual footprint intersections against the area plus 0.002° scene margin, retaining
whole polygons, multiparts, holes and source properties. Defer canopies, porticoes, elevated
links, ruins, construction shells and historic walls. Never treat absolute municipal foot/eave
elevations as ellipsoid heights. Positive relative eave height takes precedence; reliable OSM
overlap supplies height/levels fallback, followed by the existing footprint/type heuristic.

Reconcile overlaps using actual polygon areas in projected metres, including holes. Municipal
solids take priority; subtract their coverage from OSM fallback footprints instead of leaving
duplicate volumes. Record pair matches and 1:N/N:1 cases, ambiguous matches, clipped residuals,
deferred/invalid records and overlap corrections. Sample terrain at outer/hole vertices and
edge midpoints, matching the renderer's bilinear grid interpolation; roofs use the highest
vertex ground plus relative height and walls extend below the lowest ground, as in the baseline.
Flag slope/embedding risk rather than claiming surveyed vertical accuracy.

Data migration: `data/bo-002-buildings/` and optionally `data/bo-002-trees/` are new roots;
scene directories must not exist before generation. No original scene directory is cleared.
Record a fresh preservation inventory of baseline artifacts and verify the original 82-entry
inventory. Source-code entries intentionally edited for attribution are reported separately;
all raw/derived/proof artifacts must remain byte-identical. Frozen origin/heading/geoid/bbox
are checked structurally. Dataset SHA-256/count/licence must match the saved audit; no redownload.

Credits: declare municipal source metadata in the Bologna region, use it conditionally in the
new manifest and viewer according to active data attribution, and print full source/licence/
adaptation notices on each municipal proof. Keep OSM/Copernicus credits. The only global
rendering change is backward-compatible optional holes; validate the OSM baseline output too.

Stage A must pass automated topology/attribution/tile checks and visual landmark/courtyard
review before Stage B. Any serious new masses, holes or floating geometry triggers the review
gate and is documented, without AI painting. Final commands, thresholds, counts and findings
will be appended here as implementation and validation complete.

## Outcome and exact implementation

**Stage A passed. Stage B ran separately and passed.** Automated and visual gates were completed
before advancing. This remains a procedural geographic foundation, not an architectural reconstruction.

- `bologna-geometry.ts`: ENU Polygon/MultiPolygon normalization, closed/finite/simple-ring and hole
  validation, 50 m bbox index, polygon intersection/difference. Whole selected components and holes survive.
- `bologna.ts`: classification, relative heights, spatial reconciliation, terrain diagnostics and tree adapter.
- `bologna-run.ts`: isolated preparation/build/render, snapshot verification, preservation hashes,
  compatible scene bins and conditional manifest credits. Modes: `osm`, `ctc`, `ctc-trees`.
- `bologna-credits.ts`: region-constrained source switching and source credit selection.
- Renderer: optional fifth building-tuple item for holes; inner walls, roof triangulation and rooftop
  clutter exclusion honor them. Existing four-item tuples render identically. `page/ground.ts` only
  extends its tuple type, without changing shading behavior.
- Region `creditsBySource` declares municipal credits without changing frozen geography/default sources.
  The viewer footer/video notices activate municipal publisher/dataset/CC BY/adaptation credits only
  when the artifact's attributions declare that source. No live/exported municipal site is produced.

Polygon-clipping **0.15.7** (MIT) was added to the pipeline dependency and lockfile. npm added
three packages and reported zero vulnerabilities. No municipal source was redownloaded/replaced.
Verified snapshot anchors:

| Input in `data/raw/bologna-audit/` | Records | SHA-256 |
|---|---:|---|
| `buildings.geojson` | 65,735 | `38ed98285663d6c3080c1b2f9929e99455d422590af92bd8c3c071bbbb3e465e` |
| `trees.geojson` | 87,285 | `fa1a94f527b97a7afcef7ac2db4b5ef3695ee2d42966c1dd4c3d4a5184975a8d` |

Saved metadata must still declare CC BY 4.0. Building data update: 2026-10-22; trees: 2026-10-10.
Normalized records retain full source properties: identifiers, descriptions, origins, raw heights,
dates, species, classes and other provenance. Absolute foot/eave fields remain unused for placement.

## Building policy and results

Selection is **actual polygon intersection**, not centroid inclusion, against the frozen area plus
**0.002° on every side**. Coarse bbox rejection avoids projecting the entire municipality; selected
candidates receive full topology checks. Invalid records carry quarantine reasons. Nonintersecting
disjoint components are outside this experiment. Every selected component retains its interior rings.
Boolean inputs use a **1 mm ENU grid**, below the stated 54 cm survey tolerance, to avoid coincident
edge sweep failures from raw ECEF floating-point noise. This is numerical precision, not survey accuracy.

Solid categories are explicitly allowlisted. Deferred categories include porticoes, canopies, elevated
links, ruins, construction shells and historic walls. Selected deferrals: **78 canopies, 20 porticoes,
one historic-wall record and two unclassified records**. Their properties/geometry remain in diagnostics.

Pairs are screened by 50 m index cells and overlapping bboxes, then actual area in projected metres.
An overlap **>0.25 m²** records an association. Height fallback requires **≥50% of the smaller footprint**
covered; matches are ranked by intersection area. Mere proximity never supplies an unrelated height.
Many pairings are volume subdivisions within coarse OSM complexes, not literal one-building matches.

Finite positive `altezza_gr` ≤200 m wins as a **relative eave height**. The 200 m guard exceeds this
snapshot's 103.7 m maximum. Zero/nonfinite/out-of-range values fall back to a reliable matched OSM
height, then `building:levels ×3.2 +1`, then the documented 5/13/14 m or matched baseline estimate.
No geoid offset is added. `quota_pied`/`quota_gron` are never interpreted as ellipsoid heights.

CTC solids take priority. Shared CTC overlaps resolve by descending eave height and stable ID.
OSM fallback is the geometric difference from accepted CTC coverage and earlier fallback volumes.
**Municipal courtyard holes are also excluded from residuals of overlapping outer-only OSM footprints**,
so baseline hole loss cannot refill a surveyed court. A wholly unmatched separate OSM outbuilding
remains eligible fallback. Residuals <0.5 m² are logged and dropped; invalid generated parts quarantine.
Final QA independently checks emitted topology and overlapping footprint areas.

Examples in the full adapter report: `ctc/304/0` has a 1:1 association; `ctc/11010/0` has 1:N;
San Petronio, OSM `way/328013918`, has N:1 associations including CTC `17871` (47.3 m), `17875`
(27.8 m), `31864` (27.8 m) and other volumes. Edge contacts retain their reliability flags.

| Metric | Final buildings stage |
|---|---:|
| Source / selected buffered records | 65,735 / 6,268 |
| Solid CTC parts / emitted CTC parts | 6,167 / 6,167 |
| Positive CTC relative heights / documented estimates | 6,106 / 61 |
| Invalid selected source / invalid generated / generated quarantined | 0 / 0 / 0 |
| Deferred records | 101 |
| OSM volumes with CTC overlap / wholly unmatched | 3,006 / 22 |
| OSM residual parts / total volumetric parts | 3,234 / 9,401 |
| Preserved courtyard rings | 712 |
| 1:N associations / OSM footprints with N:1 associations | 2,929 / 2,716 |
| CTC overlap corrections / old OSM fallback overlap corrections | 3 / 277 |
| OSM footprints receiving courtyard exclusions | 374 |
| Dropped residual slivers / total area | 239 / 39.93 m² |
| Overlap pairs >0.05 m² / maximum numerical residual overlap | **0 / 0.0217 m²** |

The audit's 3,385 centroid records are a different population: the scene adds a margin and retains
crossing footprints whose centroids are outside. CTC polygons subdivide volumes; 9,401 emitted
parts are **not** 9,401 independent real-world buildings. Full matches, properties, deferrals,
exclusions, corrections and terrain diagnostics remain in each isolated `adapter-report.json`.

Terrain and ground features are copied **byte-for-byte from BO-001R**, as are OSM/roads inputs.
Bilinear sampling matches the renderer. Outer/hole vertices and edge midpoints are diagnosed.
Anchoring retains the baseline convention: roof at highest vertex ground + relative height,
walls to lowest vertex ground −1 m. There are **12 slope warnings** with vertex range >3 m,
maximum approximately 4.18 m (up to ~5.18 m high-side embedding). No sampled floating gap exceeds
0.5 m. The unchanged filtered DSM is not a surveyed DTM; slope/base refinement remains future work.

## Stage A visual gate

**10/10 color and height tiles** decode, vary and are fully opaque (1024²/256² respectively).
Camera/bbox/tile coordinates match BO-001R; all 13 shared boundaries pass seam screening and montage
inspection. Both out-of-manifest beige corners remain intentional. All required credits appear in
manifests and proofs. The gate was marked passed only after inspecting the montage, central tile
comparison and all five pairs in `bologna-municipal-buildings-landmarks.jpg`:

- Piazza Maggiore and Piazza Nettuno remain open ground; point-in-footprint checks at their reviewed
  centers find no solid mass. Taller surveyed neighboring volumes occlude more ground detail.
- San Petronio becomes multiple CTC eave-height volumes. Flat stepped caps, generic window grids
  and rooftop clutter are procedural inaccuracies, not surveyed roof/facade reconstruction.
- Palazzo d'Accursio has more articulated masses/open courts. Portico clearance, clock and historic
  facade detail are not modeled. Monument/fountain sculpture is not reconstructed.
- Courtyard `ctc/43924/0/piece0` is open in roof geometry and protected from OSM refill. Inner walls
  render. Soft contact shadows still use outer footprints and may darken courts, without filling roofs.

No serious new masses, unexpected tile holes, duplicate footprints, broken renderer or sampled
floating buildings remained. Fine fringe residuals, generic architectural details and the twelve
slope cases are explicit limitations for external review, not concealed with painting.

## Stage B — separately tested trees

Only after Stage A passed, the tree stage built in `data/bo-002-trees/`. Its normalized buildings
are byte-identical to Stage A, and ground/surface/OSM/camera remain unchanged. Municipal points
retain source fields and are selected in the same buffered area. OSM point trees are matched to
the nearest municipal point within **3 m**; unmatched OSM trees and park/woodland polygons remain.

| Source class | Height estimate |
|---|---:|
| <6 m | 4 m labelled low-class default |
| 6–12 m | 9 m midpoint |
| 12–16 m | 14 m midpoint |
| 16–23 m | 19.5 m midpoint |
| >23 m | 26 m open-ended default |
| Missing/malformed | 9 m labelled fallback |

Radius is `clamp(0.22 × estimated height, 1.5, 5)` m. Neither value is a measured canopy model;
the existing crown-center parameter is derived from this generic approximation. Species styling
is deferred. The low-class provenance label was clarified after rendering without changing any
size/position; a hash-verified copy of the earlier adapter report is retained beside the corrected report.

622 municipal points were selected, none invalid. **56** OSM points matched and **162** remained,
giving **784 crowns**, versus 218 in buildings-only. Classes: 183 low, 167 class 2, 155 class 3,
91 class 4, 26 open-ended. Six lack species, 536 lack planting date, 77 lack update date and
**392 have updates before 2010**. This maintenance inventory omits private/unrecorded trees and
is not complete current canopy coverage. Stage B passes the same ten-tile/thirteen-edge checks
and visual comparison; added park/court trees and estimated crown-size changes are visible.

## Commands and reproducibility

Run at repository root with the audited snapshots and BO-001R local data intact. A destination root
must **not exist** before `build`; overwrite is refused. Current experiment roots must be retained.
Use a fresh checkout/data copy with those destinations absent to reproduce these exact QA paths.
No ground regeneration is performed when holding the accepted terrain/surface constant.

```bash
source "$HOME/.nvm/nvm.sh"
nvm use 24
# Executed dependency addition, pinned by package-lock.json:
npm install -w pipeline polygon-clipping@0.15.7
PIPELINE_DATA_ROOT=data/bo-002-osm-check node --import tsx pipeline/src/bologna-run.ts build osm
PIPELINE_DATA_ROOT=data/bo-002-buildings node --import tsx pipeline/src/bologna-run.ts build ctc
# Render each prepared root with unchanged SS=2, -j 2 and this Chromium/SwiftShader setup:
PIPELINE_DATA_ROOT=data/bo-002-buildings \
  CHROME_PATH="$HOME/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome" \
  CHROME_ARGS=--use-angle=swiftshader node --import tsx pipeline/src/bologna-run.ts render
# Render the osm-check root with the same environment before QA.
node --import tsx docs/bologna-municipal-qa.ts ctc
# After inspecting proof, comparison and landmark pairs:
node --import tsx docs/bologna-municipal-qa.ts ctc --visual-reviewed
PIPELINE_DATA_ROOT=data/bo-002-trees node --import tsx pipeline/src/bologna-run.ts build ctc-trees
# Render the trees root with the same environment.
node --import tsx docs/bologna-municipal-qa.ts ctc-trees
node --import tsx docs/bologna-municipal-qa.ts ctc-trees --visual-reviewed
node --import tsx --test pipeline/src/bologna.test.ts docs/bologna-coverage-qa.test.ts
node_modules/.bin/tsc --noEmit -p pipeline
node_modules/.bin/tsc --noEmit -p web
node_modules/.bin/tsc --noEmit --target es2022 --module esnext --moduleResolution bundler \
  --allowImportingTsExtensions --strict --skipLibCheck --types node docs/bologna-municipal-qa.ts
git diff --check
```

`--visual-reviewed` records deliberate completed review, not automatic acceptance of a new result.
The tree build requires passed Stage A QA and exact building equality. `render` skips existing tiles
and never clears scenes. For another experiment choose a fresh `data/bo-002-*` root; QA's explicit
experiment paths can be reviewed/adapted. No original pipeline `scene` command was rerun over old data.

## Validation, preservation and limitations

**17 tests passed**, covering rings/holes/multiparts, malformed geometry/heights, relative datum,
classifications, actual selection including an empty courtyard, 1:N/N:1 reconciliation, pre-existing
OSM overlaps, courtyard anti-refill, terrain sampling, tree classes/dedupe, credits/source switching,
manifest corners, blank/transparent/missing tiles and data-root isolation. Pipeline TypeScript and
strict checking of the QA script pass. Web reports only the pre-existing `map.ts:34` TS2339
`ImportMeta.env` error; no unrelated typing fix is included. `git diff --check` passes.

The re-rendered OSM-only regression matches **all ten color and ten height PNG hashes exactly**
against BO-001R. Every BO-001R file is hashed in each new root's `preservation.json` and rechecked.
The original 82-entry inventory has **81 unchanged entries**; its sole intentional source-code
exception is `pipeline/src/places.ts`, where attribution requires conditional municipal credits.
Frozen geography is separately verified unchanged. Every original raw/derived/proof artifact is
preserved; claiming the old source-file hash was unchanged would be inaccurate. `fetch.ts`,
`scene.ts`, `ground.ts`, `camera.ts`, `areas.ts`, `osmlocal.ts` and `render.ts` are unchanged.
TLV/Stuttgart source branches and default geography remain intact; their cities were not rerendered.

Intermediate attempts are retained in `data/bo-002-buildings-attempt1` through `attempt4`: an empty
copy-directory failure, an unsnapped boolean sweep failure, a legacy-OSM-overlap candidate and a
courtyard-refill candidate with three invalid fallback rings. Each directory was relocated intact
before building in a fresh root. No baseline/generated directory was deleted. The final adapter
resolves these observed failures and reports zero invalid emitted polygons.

## Handoff and external review

Send together:

1. This note, `bologna-municipal-qa.json` and `bologna-municipal-trees-qa.json` (counts, hashes, gates).
2. `bologna-municipal-buildings-proof.jpg`, `bologna-buildings-comparison.jpg`,
   `bologna-municipal-buildings-landmarks.jpg`.
3. `bologna-municipal-trees-proof.jpg`, `bologna-trees-comparison.jpg`,
   `bologna-municipal-trees-landmarks.jpg`.
4. `bologna-municipal-qa.ts`, new `pipeline/src/bologna*.ts` files and the tracked patch.
5. For detailed matching/provenance, each gitignored root's `adapter-report.json`, `run.json`,
   `preservation.json`, normalized municipal building JSON, manifest, scene and color/height files.

Tracked modifications: `ATTRIBUTION.md`, `package-lock.json`, `pipeline/package.json`,
`pipeline/page/ground.ts`, `pipeline/page/renderer.ts`, `pipeline/src/places.ts`,
`web/src/scripts/map.ts`. New adapter/test/proof/QA files are untracked for review. The user's
pre-existing `plans/` and `bologna-review.zip` remain untouched. No automatic commits.

BO-003 priorities: facade/roof vocabulary and portico clearance, monument/fountain/clock details,
removal of inappropriate rooftop clutter, review of fringe residuals and twelve slope cases,
then species-aware styling without representing class estimates as measured canopies. Resolve the
absolute municipal datum before using foot/eave elevations for positioning. Viewer attribution is
implemented and manifests tested, but no exported/live municipal site or video was end-to-end tested.
No painting, export, publish, deployment or public messaging occurred.
