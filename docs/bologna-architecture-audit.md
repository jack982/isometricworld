# BO-003 architectural fidelity pilot

Branch `feature/bo-003-architectural-fidelity`, reviewed base `e6c7b7e` (BO-002).
The working tree initially had only user-owned untracked `bologna-review.zip`,
`pipeline/src/pipeline.zip` and `plans/`; these remain untouched. No refetch or commit.

## Gate 0 findings — PASS before architectural modelling

The source pass fixes `baselineVolumes()` so bbox contact cannot donate OSM tags/name/ID.
Inheritance requires **>0.05 m² actual intersection and ≥1% of the smaller area**. Equal-area
competing source IDs within 0.05 m² are ambiguous and donate no metadata. Unmatched records get
a stable content-derived opaque fallback key plus duplicate occurrence counter; architecture
never selects by that key. Complete closed multipart outer members are considered. Fragmented
outer chains remain unresolved and do not acquire a guessed identity; accepted BO-002 files
are not retroactively recomputed.

`tuple(v, true)` adds optional **`b[5]`** metadata with verified `Volume.id`, CTC object number,
source, description and heightSource. The default remains a five-item tuple; old four-item OSM
and LoD2 paths remain independent. A CTC metadata/source-ID mismatch throws. The new pilot
addresses only source IDs through this channel, not tuple order or spatial/name guesses.

`architectureRoot()` permits only fresh `data/bo-003-architecture`, rejects all BO-001/BO-002
paths, traversal and an existing destination. `architectureSeamGate()` rejects unexplained
significant seam flags; the architectural QA must include this in its automated gate.

New Gate 0 tests in `pipeline/src/bologna-architecture.test.ts`: touching/disjoint bbox metadata,
true second multipart-outer intersection, opt-in/checked identity/default tuple equivalence,
allowed/forbidden roots, and seam-warning failure. Together with the existing adapter tests,
**19 tests passed** before architecture implementation.

The reproducible audit `docs/bologna-architecture-gate0.ts` verifies **214 protected files**
against `bologna-architecture-inputs.json`, including BO-001R and both BO-002 roots, scenes,
tiles, manifests, proofs, municipal snapshots and the user's ZIPs. Frozen camera/bbox/EGM2008
39.647 m remain unchanged. Source metadata has 6,167 unique CTC volume IDs, with 712 courtyard
rings and 784 baseline crowns. The inputs manifest pins hashes; Gate 0 JSON records the verified
identity mapping, and final QA verifies all 6,167 IDs and their identical metadata across scene bins.

Gate 0 source files are modified `pipeline/src/bologna.ts` and new
`pipeline/src/bologna-metadata.ts`, `pipeline/src/bologna-architecture-safety.ts`,
`pipeline/src/bologna-architecture.test.ts`, plus the read-only Gate 0 audit script/JSON.
Rendering hooks and the architecture runner were introduced only after this source gate passed.

## Source and reference sets; factual versus estimated

1. **Comune di Bologna CTC**: audited CC BY 4.0 snapshot, unchanged SHA-256
   `38ed98285663d6c3080c1b2f9929e99455d422590af92bd8c3c071bbbb3e465e`.
   Official footprint partitions, classifications and relative eaves. No measured ridge geometry,
   roof pitch, column spacing, clear height or absolute ellipsoid elevation is inferred from it.
   [Dataset](https://opendata.comune.bologna.it/explore/dataset/c_a944ctc_edifici_pl/).
2. **OpenStreetMap**: the pinned BO-001R raw snapshot, ODbL. Unique way IDs, Wikidata identities,
   geometries and roof/material tags are independent open references. Palazzo d'Accursio's
   way has brick, roof tiles, pyramidal roof and a roof color tag. Roof uplift remains an estimate;
   its OSM 14 m height does not override municipal eaves. No satellite imagery is consulted.
3. **ICCD / Ministero della Cultura**: official metadata record
   [0800262039](https://catalogo.beniculturali.it/detail/ArchitecturalOrLandscapeHeritage/0800262039)
   identifies Palazzo d'Accursio, Gothic town hall, Piazza Maggiore 6. The page explicitly licenses
   metadata CC BY 4.0. Consulted for identity/fidelity audit only; no photographs, attached cadastral
   images or unlicensed models are imported. These metadata do not supply roof/clock measurements.
4. The basilica's [official descriptive page](https://www.basilicadisanpetronio.org/la-basilica/)
   reports overall dimensions and side chapels. These are a factual sanity check only: no text/image
   reproduction or geometry is taken from the site. Its generic 44 m height is not a measured ridge
   control and does not resolve the CTC 47.3 m nave eave versus vault/facade/roof conventions.
   No image/model licence is assumed. Actual ridge measurements remain unavailable here.
5. The municipal [Bologna 3D repository](https://opendata.comune.bologna.it/explore/dataset/bologna-3d-open-repository/)
   describes historical/didactic models, including an eighteenth-century palace state. No asset is
   downloaded or treated as current measured geometry. It is not used to bypass provenance gaps.

The first two open primary datasets support the pilot; official reference metadata supplement
the audit without becoming image/mesh inputs. No proprietary reference, AI painting, copied pixels
or fabricated measured roof detail is used. Materials/roof uplifts must be labelled procedural estimates.

## Landmark identification and unresolved cases

Full geometry, area fractions, official CTC source cross-checks and metadata examples are in
`bologna-architecture-gate0.json`. A selected part must have the pinned OSM ID and Wikidata,
≥80% CTC part area within its named source footprint, and matching original CTC geometry/properties.

| Landmark | Unique reference | Verified CTC IDs | Pilot decision |
|---|---|---|---|
| San Petronio | way/328013918, Q810103 | 17871, 31864, 17875, 45799, 52776, 32021, 59850, 18063, 39022 | Explicit verified parts; nave/aisle roof estimates, bell tower retains its surveyed mass |
| Palazzo d'Accursio | way/149040859, Q2267154 | 47682 (85.5% coverage), 61154 (98.9%) | Two verified palace portions; complex boundaries require segmented fallback; do not invent clock-tower identity |
| Palazzo Re Enzo | way/149040903, Q604770 | 31866, 52922, 11313 | Audited stretch goal; no override in first pilot |
| Nettuno fountain | way/561636974, named open ground geometry | No CTC solid verified | Ground feature retained; no invented statue model |
| Asinelli | way/46965352, Q16511590 | 35701, 49630 | Audited stretch goal only; no new skyline model |
| Garisenda | way/46965353, Q5875446 | 35702 is only 58.6% overlap, not verified | Omit override; tilt/outline mismatch unresolved |

There is another OSM church bell tower also named Garisenda (way/148889976). It is not the
Q5875446 monument and must not inherit its override. Some peripheral CTC parts have only weak
contacts with a named complex; they remain generic. IDs 26676/56137 near the palace clock tower
are not a verified clock mapping. Source-ID scope is explicit and smaller than the full palace complex.

## Renderer inventory and bounded pilot plan

BO-002 `b` geometry uses flat eave caps, generic window-grid facades and modern water-heater/AC
roof clutter. Roofs use three.js hole-aware triangulation; inner walls and roof-clutter placement
respect holes. Terrain anchoring is max vertex ground + relative eave, with walls below min ground.
The separate `m` LoD2 path is Stuttgart-only and is left intact.

Architectural extension is metadata-driven, not scattered region tests. Only the two landmark
sets, two fixed ordinary examples and one verified portico are in the first pilot. Other volumes,
all 784 trees, camera, lighting and terrain remain the BO-002 inputs. No citywide palette rollout.

Ordinary gable/hip eligibility requires no holes, near-rectangular coverage ≥99.5%, appropriate
dimensions and a pinned source ID. Ridge orientation derives from the measured longest footprint
envelope, not a street/name guess. Complex/concave or courtyard footprints default flat; explicit
palace portions may use a continuous boundary-distance segmented hip estimate, triangulated
inside their actual partitions. All roof rise is bounded and labelled above the unchanged surveyed
eave; no ridge is represented as surveyed. No decorative roof clutter on pilot volumes.

## Portico and terrain risk audit

All 20 source Portico records are included below and in machine-readable Gate 0 JSON.
The solid-contact audit includes **both CTC and OSM residuals**. Candidate **28017** initially
looked safe against CTC alone, but intersects the 13 m OSM fallback `relation/2012855/piece0`
by **24.260 m²**; it is rejected without cutting that baseline building. The selected **21018**
is an L-shaped 84.244 m² source band, 22.54 × 6.20 m envelope (60.33% rectangular coverage),
relative eave 4.9 m, ground spread 0.314 m, zero overlap with any existing solid, inside the pilot
and adjacent to CTC 11105/53153. Its actual polygon is used, not its envelope. The open column/slab
run has 17 fitted 0.35 m square columns, approximately 4 m target bay spacing, a 0.3 m slab and
minimum sampled clearance **4.607 m**. These dimensions are estimates, not surveyed arches.
There is no full-height portico block, cut into neighboring mass, or fictitious arch opening.
Candidate 55924 is an unselected alternative; all other candidates stay audit-only.

The 239 dropped BO-002 residuals total 39.93 m². Their old log stores parent IDs/area but no
deleted-piece coordinates. Gate 0 records proximity from surviving parent geometry when possible,
and marks unresolved parents rather than inventing precise sliver locations. This is a risk audit,
not a claim to have recovered erased geometry. All twelve original slope warnings are mapped
below with source IDs and nearest verified landmark distances. No terrain/geoid correction is made.

The following complete tables are generated from the final all-source Gate 0 JSON. Full polygons,
source properties, contacts and neighboring IDs are retained there, including out-of-bbox candidates.

### All 20 deferred portico candidates

|CTC ID|Lat, lon|Envelope length × width m|Eave m|All-solid overlap m²|Ground spread m|Classification / decision|
|---|---|---|---|---|---|---|
|14177|44.494601, 11.346683|14.80 × 3.63|5.4|45.278|0.188|Solid contact; deferred|
|14178|44.496471, 11.335269|17.66 × 3.63|6.4|0.000|0.171|Outside inner pilot; deferred|
|21018|44.492907, 11.344014|22.54 × 6.20|4.9|0.000|0.314|Selected L-shaped open run|
|21019|44.495502, 11.342628|10.44 × 5.85|7.4|40.340|0.012|Solid contact; deferred|
|21020|44.494502, 11.335402|36.99 × 31.59|7.7|0.071|2.248|Outside inner pilot; deferred|
|28017|44.496313, 11.344338|12.94 × 2.82|4.3|24.260|0.175|Solid contact; deferred|
|35003|44.489214, 11.338780|50.48 × 4.66|5.4|177.121|1.027|Outside inner pilot; deferred|
|35004|44.497839, 11.342457|7.94 × 4.69|3|36.654|0.189|Solid contact; deferred|
|35081|44.489400, 11.349687|16.13 × 2.63|13.65|0.000|0.116|Outside inner pilot; deferred|
|41901|44.489157, 11.344741|42.00 × 5.05|5.9|99.937|0.580|Outside inner pilot; deferred|
|41906|44.494152, 11.335217|58.95 × 33.01|10.3|0.000|1.846|Outside inner pilot; deferred|
|48960|44.498824, 11.342313|14.99 × 4.10|5.5|0.000|0.703|Outside inner pilot; deferred|
|48961|44.489240, 11.344272|41.84 × 15.47|5.8|257.983|0.940|Outside inner pilot; deferred|
|55920|44.495583, 11.348933|14.46 × 4.09|8|26.261|0.344|Solid contact; deferred|
|55922|44.488682, 11.344223|61.10 × 48.74|5.1|686.446|3.078|Outside inner pilot; deferred|
|55923|44.496732, 11.348668|6.30 × 1.67|6.6|7.082|0.053|Solid contact; deferred|
|55924|44.492807, 11.343986|22.62 × 6.75|4.9|0.000|0.312|Unselected complex alternative|
|55925|44.494381, 11.342928|23.26 × 3.49|6.8|73.358|0.250|Solid contact; deferred|
|55972|44.499832, 11.334896|53.19 × 5.27|4.8|0.000|0.563|Outside inner pilot; deferred|
|62860|44.498361, 11.344371|8.87 × 4.95|4.6|28.986|0.243|Outside inner pilot; deferred|

### All 12 slope cases

|Source volume ID|Lat, lon|Spread m|Max embedding m|Nearest audited landmark, distance m|
|---|---|---|---|---|
|ctc/48123/0/piece0|44.500021, 11.339183|3.314|4.314|palazzo-re-enzo, 703.9|
|ctc/27146/0/piece0|44.499989, 11.335339|3.621|4.621|palazzo-accursio, 860.4|
|ctc/59867/0/piece0|44.491572, 11.342348|3.027|4.027|san-petronio, 139.9|
|ctc/30079/0/piece0|44.498152, 11.342315|3.009|4.009|palazzo-re-enzo, 425.2|
|ctc/59868/0/piece0|44.491943, 11.342636|3.233|4.233|san-petronio, 93.2|
|ctc/38793/0/piece0|44.488621, 11.344311|4.179|5.179|san-petronio, 468.0|
|ctc/61610/0/piece0|44.493913, 11.336010|3.286|4.286|palazzo-accursio, 490.1|
|ctc/26214/0/piece0|44.488466, 11.336214|4.101|5.101|san-petronio, 720.3|
|ctc/52794/0/piece0|44.488671, 11.344214|3.413|4.413|san-petronio, 460.9|
|ctc/27339/0/piece0|44.495823, 11.349611|3.029|4.029|garisenda, 277.7|
|ctc/12716/0/piece0|44.494494, 11.335455|3.430|4.430|palazzo-accursio, 537.1|
|relation/2015042/piece2|44.488682, 11.344223|3.078|4.078|san-petronio, 459.9|

## Implemented pilot and fidelity limits

This is the first stopped pilot, not a full reconstruction of either monument. The source-ID
overrides affect **13 of 9,401** volume parts: nine church parts, two verified palace portions,
and two ordinary roof examples. All 6,167 CTC parts carry verified identity metadata; only the
13 explicitly opted-in parts enter the new mesh hook. The 3,234 OSM residuals retain their plain
tuples and generic rendering. No source footprints, eaves, 712 courtyard rings or 784 crowns change.

|Subject|Factual input retained|Procedural estimate introduced|Unknown / deliberately omitted|
|---|---|---|---|
|San Petronio|Nine verified official partitions and relative eaves, including 47.3 m nave, 27.8 m aisles and 59.7 m bell-tower volume|Source-envelope gables: nave +3.5 m, two aisles +2 m; brick/terracotta and directional lower stone band; six flat caps|Measured ridge/pitch, chapel details, facade openings, actual marble boundary; discrepancy with the official page's generic 44 m height remains unresolved|
|Palazzo d'Accursio|Two uniquely joined CTC parts, relative eaves 24.8 and 26.6 m, true concave partitions; independent OSM identity/material hints|Continuous segmented boundary-distance hips, 2 m sampling grid and ≤2 m uplift; restrained brick and terracotta|Measured historical ridge network, complete complex coverage, clock-tower CTC identity, clock/sculpture geometry; unchanged generic tower is visible in comparisons|
|Re Enzo / Asinelli|Named OSM IDs, Wikidata and verified CTC intersections in Gate 0|None|Detailed silhouettes, roofs and ornament; retain baseline massing|
|Garisenda|Unique monument way/Wikidata; conflicting names and 58.6% CTC overlap recorded|None|Tilted outline/CTC association; omit override rather than choose a nearby tower|
|Nettuno|Existing named fountain ground geometry and open square|None|No verified solid, basin/statue/bronze mesh; no invented fountain model|
|Ordinary examples|CTC 61450 and 35700, hole-free near-rectangular geometry and relative eaves|One gable and one hipped roof, each +1.8 m; plaster/brick palette|Actual roof material, pitch and ridge elevations|
|Portico 21018|L-shaped official band, eave 4.9 m, adjacency, unchanged terrain and zero solid overlap|17 columns, 0.35 m width, target 4 m bays, 0.3 m slab, sampled clearance ≥4.607 m|Surveyed columns, arches, historic profile and actual clear height|

Roof inventory is **9,388 unchanged generic flat caps**, **6 opted-in flat caps**, **4 gables**,
**1 hip** and **2 segmented hips**. Estimated uplift histogram for the 13 parts: 0 m ×6,
1.8 m ×2, 2 m ×4, 3.5 m ×1. Ordinary concave/courtyard footprints fall back flat; only the
two explicit palace partitions use the segmented exception. No single-ridge shortcut spans
complex concavities. Upper gable walls close the space above the original eave, and modern
rooftop furniture is suppressed only on the 13 pilot parts. The palette is illustrative,
not a surveyed material map. Ground paving and the surrounding generic architecture stay baseline.

The mesh hook uses the same max-ground-plus-relative-eave anchor as BO-002. The 12 original
slope cases remain warnings, not new geometry fixes. Source absolute `quota_gron`/`quota_pied`
are unused. The terrain warning near the basilica (CTC 59868, ~93 m) and all 239 sliver log entries
remain in QA. Exact lost sliver positions cannot be recovered from that log; no tiny monument
detail is reconstructed from their surviving-parent proximity. DEM is not a surveyed bare-earth
city model and may explain part of the spread; vertical-reference mismatch remains unresolved.

## QA and visual review — first pilot only

All four gates **PASS for this bounded pilot**. This is an agent visual review, not user approval
or a claim of measured architectural fidelity. The machine checks and manual record are separate
in [bologna-architecture-qa.json](bologna-architecture-qa.json).

|Gate|Evidence and scope|
|---|---|
|0 — source hardening|Positive-area-only OSM joins; verified sixth-field CTC IDs; fresh-root rejection; seam gate; all protected original files unchanged|
|A — audit|All six landmark identities/gaps, 20 deferred porticoes, 12 slope cases and 239 slivers audited; two open primary source sets; portico 28017 conflict explicitly rejected|
|B — first visual pilot|San Petronio nave/aisles and two palace roof portions are materially more distinguishable than generic BO-002; one L-shaped canopy has visible narrow columns and open undercroft; stop here|
|C — automated evidence|10/10 color tiles and 10/10 height tiles valid/opaque; all 13 shared boundaries pass; 60/60 fresh baseline rerender hashes identical; source geometry, trees, terrain and required credits preserved|

Inspected all three credited JPEGs: [overview](bologna-architecture-proof.jpg),
[same-tile comparison](bologna-architecture-comparison.jpg), and
[six side-by-side crops](bologna-architecture-landmarks.jpg) (Piazza Maggiore, Nettuno,
Palazzo, basilica, courtyard CTC 43924, portico 21018). The squares remain open; the church
roof is seated on the retained tiered massing, with no observed floating cap or new skyline
spike. The palace pilot is visibly partial: the unverified clock tower and much of the long
frontage still use generic facades. The courtyard crop remains unchanged, while the portico
crop shows the new canopy inside an open courtyard band. The overview has no visible seam
bars. Beige cells **(-2,-2) and (1,-2)** are outside the ten-tile manifest, not missing renders.
This review does not verify facade detail or establish actual roof colors/ridge elevations.

Automated geometry checks cover finite/bounded triangle elevations, projected area error
< max(0.05 m², 0.1% of parent area), whole-triangle containment and pairwise roof overlap
<0.01 m² per part, including courtyard exclusion. Observed containment/overlap errors are
at floating-point noise (~10⁻¹² m²), with zero degenerate roof triangles. Every column foot
is ≥99.9% inside the source band; aggregate overlap with solids is 0 m². Independent triangle
clipping was added after unsnapped polygon-clipping failed on shared grid edges: that failure
was not converted into empty/successful geometry. Tests cover reversed winding, coincident
edges, partial overlap and coordinates far from the origin.

Seam warnings are a real gate: edge RGB MAE > max(12, 3 × adjacent-interior MAE) must have an
explicit explanation or automation fails. All 13 comparisons have `review: false`; maximum
edge MAE is 11.990. No manual pass flag is allowed to turn an automated failure into a pass.
Baseline attribution arrays are retained verbatim as a subset, with only an architectural
estimate notice appended. Proofs include full OSM, CTC/tree CC BY links and exact Copernicus text.

**27 tests pass**, including the 8 new architecture/source tests, 2 independent geometry QA
tests, 14 existing municipal tests and 3 coverage tests. Pipeline TypeScript and strict
TypeScript for all new QA scripts pass. `git diff --check` passes. Web TypeScript reports
the preexisting `web/src/scripts/map.ts(34,29): TS2339 Property 'env' does not exist on type
'ImportMeta'`; no web file was changed. No Tel Aviv/Stuttgart cache is available for full
region rerenders. Their source selection, LoD2 renderer/material and region configuration
were inspected and remain untouched; default tuple/render behavior is covered by the fresh
Bologna OSM/CTC/tree pixel-hash regressions, not claimed as a separate Stuttgart visual test.

## Reproducible commands and preserved outputs

Run from repository root with `source /home/jacopo/.nvm/nvm.sh && nvm use 24`
(actual Node **v24.22.3**, npm **11.19.1**). Read-only inspection used `git status --short --branch`,
`git diff`, `rg`, source/plan reads and image inspection. Core executed/reproduction commands:

```sh
node --import tsx docs/bologna-architecture-gate0.ts
node --import tsx --test pipeline/src/bologna.test.ts pipeline/src/bologna-architecture.test.ts docs/bologna-coverage-qa.test.ts docs/bologna-architecture-qa.test.ts

# Build exactly once, and only when data/bo-003-architecture does not exist.
PIPELINE_DATA_ROOT=data/bo-003-architecture node --import tsx pipeline/src/bologna-architecture-run.ts build
# Explicit software backend; Chrome/test worker launches may require sandbox approval.
CHROME_ARGS="--no-sandbox --use-gl=angle --use-angle=swiftshader --disable-dev-shm-usage" PIPELINE_DATA_ROOT=data/bo-003-architecture node --import tsx pipeline/src/bologna-architecture-run.ts render
CHROME_ARGS="--no-sandbox --use-gl=angle --use-angle=swiftshader --disable-dev-shm-usage" PIPELINE_DATA_ROOT=data/bo-003-architecture node --import tsx pipeline/src/bologna-architecture-run.ts regressions

node --import tsx docs/bologna-architecture-qa.ts
# Only after inspecting all three images; records agent review, separately from automation.
node --import tsx docs/bologna-architecture-qa.ts --visual-pass
node_modules/.bin/tsc --noEmit -p pipeline
node_modules/.bin/tsc --noEmit --target es2022 --module esnext --moduleResolution bundler --allowImportingTsExtensions --strict --skipLibCheck --types node docs/bologna-architecture-qa.ts docs/bologna-architecture-gate0.ts docs/bologna-architecture-geometry-qa.ts docs/bologna-architecture-qa.test.ts docs/bologna-architecture-checksums.ts
node_modules/.bin/tsc --noEmit -p web
git diff --check
node --import tsx docs/bologna-architecture-checksums.ts
```

Do not rerun build/regressions into their existing roots: those commands intentionally refuse.
The normal deleting `scene` command was not used. Ground binaries/features and raw files were
copied byte for byte from accepted BO-002 trees; new scene bins were constructed from its
accepted sidecar, without re-running reconciliation or acquisition. Initial setup hit an
`fs.cp` EEXIST from trailing slash semantics; its empty failed root was renamed to
`data/bo-003-setup-failed` and retained. The corrected build used the sole fresh architecture
root. No generated files were deleted and no baseline scene/render/proof was overwritten.
The initial sandbox test attempt could not run a child process; the approved retry passed.

Full original hashes/bytes: [bologna-architecture-inputs.json](bologna-architecture-inputs.json)
(214 protected files). New output/source hashes/bytes:
[bologna-architecture-checksums.json](bologna-architecture-checksums.json), generated by the
adjacent script. Per-tile color/height hashes and 60 baseline comparison hashes are in QA JSON.
The output root retains source copies, ground, scene, color, height, `architecture.json`,
`run.json`, and three separate verification roots. No data needs to be refetched for this pilot.

## Changed and new files; handoff

Modified tracked files: `ATTRIBUTION.md`, `pipeline/src/bologna.ts`,
`pipeline/page/renderer.ts`, `pipeline/page/ground.ts` (tuple type only).

New untracked implementation files (must be included when reviewing/sharing the patch):

- `pipeline/src/bologna-metadata.ts`
- `pipeline/src/bologna-architecture-safety.ts`
- `pipeline/src/bologna-architecture-frame.ts`
- `pipeline/src/bologna-roofs.ts`
- `pipeline/src/bologna-architecture-run.ts`
- `pipeline/src/bologna-architecture.test.ts`
- `pipeline/page/architecture.ts`

New untracked audit/QA files and supporting artifacts:

- `docs/bologna-architecture-audit.md`
- `docs/bologna-architecture-gate0.ts`, `docs/bologna-architecture-gate0.json`
- `docs/bologna-architecture-inputs.json`
- `docs/bologna-architecture-qa.ts`, `docs/bologna-architecture-qa.json`
- `docs/bologna-architecture-geometry-qa.ts`, `docs/bologna-architecture-qa.test.ts`
- `docs/bologna-architecture-checksums.ts`, `docs/bologna-architecture-checksums.json`
- `docs/bologna-architecture-proof.jpg`
- `docs/bologna-architecture-comparison.jpg`
- `docs/bologna-architecture-landmarks.jpg`

Preexisting user-owned untracked ZIPs and `plans/` remain untouched. `data/` artifacts are
ignored generated files and remain local. Nothing committed, painted, exported, uploaded,
published or deployed; no dev server stopped. No next phase has started.

Before any BO-004 painting, highest-value work is independent review of these exact images,
measurement of church ridge/eave definitions and palace roof network, and a verified mapping
for the palace clock volume. Obtain explicitly licensed current measured geometry if available;
do not fix an unresolved silhouette with painting. Portico columns/arches need survey/reference
verification before extending the pattern. Slope/sliver uncertainties remain as documented.
