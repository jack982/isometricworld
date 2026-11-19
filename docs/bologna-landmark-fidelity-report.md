# BO-003F implementation and fidelity gate

**Decision: REFINE GEOMETRY; NO GO for AI painting at this gate.** The technical proposal is
valid, but two-landmark recognizability has not been established by an independent human.
No measured-fidelity claim is made. The agent's image inspection is recorded separately.

Branch: `feature/bo-003f-landmark-fidelity`; user-checkpointed base
`1444694f9d9e08db7276b195ee894572f8557c62`. Node v24.22.3 / npm 11.19.1 via `nvm use 24`.
New output root: **`data/bo-003f-landmarks`**. Existing outputs and proofs remain intact.

## Gate results and implemented scope

|Gate / conclusion|Result|Evidence and limits|
|---|---|---|
|0 — source audit|Complete with scoped exceptions|473 initial preservation entries, original inventories checked before editing; stable CTC/OSM IDs, component roles and reference rights audited. Clock/body and full facade identity remain unresolved.|
|A — targeted implementation|Partial: four estimated roofs only|CTC **31864, 17875, 45799, 52776**, exact `/0/piece0` IDs only; no metric facade, clock, belfry, palace-ridge or arcade override.|
|B — recognizability acceptance|**Not accepted; human review and evidence required**|Normal and material-off comparisons expose the geometric change, but church still lacks sourced elevation rhythm and the palace/clock are unchanged. No overall fidelity PASS.|
|C — engineering|PASS|34 tests; pipeline and QA TypeScript; diff check; source/licence, mesh, terrain, tile, seam and baseline preservation checks pass. Web TypeScript retains its known error below.|
|Geometric validity|PASS for bounded proposal|Actual partitions/eaves retained; finite, contained, nonoverlapping roofs; all four new wall/roof shells close above their intentionally buried uncapped bases.|
|Architectural recognizability|Human validation required|Agent review sees outward-shed topology, not proof that either complete landmark can be recognized without color.|
|Measured fidelity|Unverified|Footprints/relative eaves remain municipal data. New 2 m roof rise, pitch and topology are procedural estimates, not surveyed ridges.|

The four roofs are one-sided planes aligned across the source nave axis and rising toward
the nave, replacing **two aisle gables and two flat chapel-band caps**. Their source relative
eaves stay **27.8, 27.8, 21.1, 20.9 m**, with bounded estimated rise **2 m**. Upper wall caps close
the raised perimeter. Actual CTC polygons, courtyard rings and building tuples' first five fields
are preserved; no footprint expansion, eave scaling or synthetic chapel subdivisions occur.
Only explicit metadata IDs may opt in. The plane generator retains holes and is independently
tested on holed input, even though these four actual partitions are hole-free.

The main nave, two palace portions, ordinary roof examples, all other buildings, clock,
17-column portico 21018, 784 crowns, ground textures/binaries and lighting remain BO-003.
Final roof inventory: 9,388 unchanged generic caps; 4 pilot flat caps; 2 gables; 4 sheds;
2 segmented hips; 1 hip. All 9,401 source parts, 6,167 CTC identities and **712 courtyard rings**
remain unchanged. Only normal tiles **(-1,-1)** and **(-1,0)** change, in color and height.

## Sources, factual findings and unresolved features

The [source audit](bologna-landmark-fidelity-audit.md) contains the complete URL/licence matrix,
factual/estimated/unknown distinctions and comparison against all three preserved BO-003 JPEGs.
[Audit JSON](bologna-landmark-fidelity-audit.json) retains component polygons and numerical joins.

- Church: OSM **way/328013918**, Wikidata **Q810103**. Stable CTC IDs: nave **17871**;
  aisles **31864/17875**; probable chapel bands **45799/52776**; probable facade lower strip
  **52777** (only 0.024% OSM overlap, excluded); probable apse **59850**; explicit bell tower
  **39022**; other church parts **18063/32021**. Subpart functional labels are distinguished from
  verified whole-church association. No repeated Gothic windows or buttresses are invented.
- Palace: OSM **way/149040859**, Wikidata **Q2267154**, verified CTC **47682/61154** at 85.52% /
  98.86% part overlap. Existing estimated roofs are retained; a current metric ridge network and
  whole west/south range assignments were not verified. No surrounding block is recolored.
- Clock site: OSM **way/149041465**, Wikidata **Q30888017**. CTC **26676** body's original
  outer outline has **64.64%** overlap, below the 80% identity threshold; accepted ring 48.97%.
  Nested candidates **56137, 35259, 49154** have strong plan overlap but uncertain functional
  elevation levels. A small matched top cannot prove the larger body. All remain unchanged.
- Heights: official CTC relative eaves **47.3 /27.8 /59.7 m** are retained. Government tourism
  text distinguishes ~45 m central vaults and 51 m facade; the basilica site's generic 44 m
  remains undefined. The operator's ~46.2 m clock total differs from CTC terminal 49.6 m.
  No arbitrary scaling, absolute-CTC-to-ellipsoid conversion or geoid correction is applied.
- Facade: its northern outward normal is back-facing to the frozen southeast viewpoint.
  The before/after massing crop is the exact permitted alternative to a visible front-facade
  rendering. No north marble texture is transplanted onto the southern apse. Next requirement:
  an explicitly separate elevation study with reusable current outline/height controls.
- Portico: **21018** and all 17 columns/slab remain byte-identical in scene data. Actual open
  clearance remains ≥4.607 m at sampled columns; no historic arches or bay dimensions verified.
- Earlier 12 slope warnings and 239 dropped-sliver uncertainties remain documented in the source
  audit JSON. Unchanged surface-model terrain is not surveyed local building ground control.

The three original licensed photos were downloaded, validated as JPEGs with expected dimensions,
and SHA-256 checked. They are **appearance references, not metric geometry**. No pixels or
tracing enter the render. All use **CC BY-SA 4.0**:

|Reference / author|Photograph date|Original bytes|SHA-256|
|---|---|---|---|
|[Facade, Congolandia.g](https://commons.wikimedia.org/wiki/File:Basilica_di_San_Petronio,_facciata.jpg)|2019-02-24|2,307,441|`3bc5f21af225fd3cfa425da8543e197e4f34c2b98063710a99e37a999f20fe5d`|
|[Clock, Raffacossa](https://commons.wikimedia.org/wiki/File:Torre_dell%27Orologio_(Bologna).jpg)|2017-05-05|709,021|`24fd695eebd718f62f6ff3263cad662a6c0835e70dfbc54dea196cc8b249447c`|
|[Roof, Zairon](https://commons.wikimedia.org/wiki/File:Bologna_Torre_degli_Asinelli_Vista_su_Basilica_di_San_Petronio_2.jpg)|2022-04-27|7,563,050|`dacc5b9d80fba0f6b96e27456c3847b4e373603e722929c1a4ce96638ae543e9`|

Full original URLs, UTC download dates, licence URLs, authors and hashes are in
`data/bo-003f-landmarks/references/provenance.json` and embedded in QA JSON. Official texts
(basilica, ICCD, metropolitan guide, clock operator) are factual audit references only, with no
imported images/models. The large government guide exceeded the browser PDF size limit;
its indexed primary-source text was available. The clock operator PDF was readable. No survey
mesh was found with sufficient currentness, controls and reusable rights for a metric override.

## Renders, inspection and QA

- [Full proof](bologna-landmark-fidelity-proof.jpg)
- [Same central tile: color plus neutral geometry](bologna-landmark-fidelity-comparison.jpg)
- [Six before/after/neutral crop rows](bologna-landmark-fidelity-crops.jpg): church massing,
  palace, explicit candidate clock location, Piazza Maggiore, courtyard and portico.
- [QA JSON](bologna-landmark-fidelity-qa.json): separate conclusions, geometry, hashes,
  seams, references, preservation, clock/height gaps and decision matrix.
- [Original checksum pins](bologna-landmark-fidelity-inputs.json) and
  [new source/output checksum inventory](bologna-landmark-fidelity-checksums.json).

All images retain active OSM, municipal CTC/tree and exact Copernicus credits, plus appearance
reference authors/source/licence links. The neutral control uses one gray shader for all building
geometry, suppressing material colors, windows and facade masks; terrain and trees stay identical.
Camera, SS=2, sun and tile selection are unchanged. All **20 neutral height files** exactly match
their corresponding normal height files: the material switch does not alter geometry.

**Agent inspection:** the aisle high line now adjoins the nave and sheds outwards; the lower
chapel bands have a shallow outward fall. The change remains visible in gray and is limited,
not a new distinctive monumental silhouette. The main facade is occluded; blank church walls
and generic palace clock are not repaired by a red palette. No new floating roof, blocked square,
courtyard fill or seam bar was observed. Portico remains the open structure from BO-003. This
inspection is not independent human validation, and Gate B remains unaccepted.

Machine evidence:

- 10/10 proposal color and height tiles valid, opaque and nonblank; 20/20 neutral color/height
  controls valid. Two corner composition cells **(-2,-2), (1,-2)** intentionally absent from manifest.
- **39 shared boundaries** (13 each in normal proposal and both neutral controls), no significant
  unexplained warning. Maximum edge RGB MAE 11.990; rule `edge > max(12, 3 × adjacent-interior)`.
- Four changed roof shells have **zero exposed open edges** at 0.00001 m double-precision mesh
  tolerance (GPU coordinates are Float32, not a survey precision claim). Projected containment
  error 0 m²; internal overlaps at floating-point noise. Tolerance: outside/overlap <0.01 m²,
  projected-area error <max(0.05 m²,0.1% source area). Source eaves and terrain anchors unchanged.
- **100/100 fresh baseline tile hashes identical**: BO-001 original, BO-001R, BO-002 buildings,
  BO-002 trees, BO-003 architecture; 10 color +10 height files per baseline. Original baseline
  manifests/scene/raw/ground/proofs were never used as render destinations.
- 473 initial preservation entries retained, with the single explicitly allowed `places.ts`
  source-credit-only modification; all existing region/city configurations compare exactly after
  stripping that new credit key. Another 73 BO-001 data/doc entries match the old coverage pins
  (some overlap the main inventory). Existing checksum **files** are unchanged. Their old source
  hashes naturally differ for intentionally edited renderer/metadata/roof/attribution code;
  this is not reported as byte-identical historical source code. The base commit preserves that code.
- Tel Aviv/Stuttgart configurations and default paths remain unchanged. Those city caches are
  unavailable for full visual rerenders; tests and five Bologna baseline pixel regressions cover
  default generic behavior. No claim of a separately rendered Stuttgart test is made.

**34 tests pass** (27 existing +7 BO-003F), pipeline TypeScript passes, strict TypeScript for all
new QA/checksum scripts passes, and `git diff --check` passes. Web TypeScript reports only the
existing `web/src/scripts/map.ts(34,29): TS2339 Property 'env' does not exist on type 'ImportMeta'`.
The small web diff is source attribution only, conditional on the BO-003F manifest notice.
No local-viewer-readiness work or generic ImportMeta fix is included.

## Commands and reproducibility

Executed from repository root. Read-only inspection included `pwd`, `git status --short --branch`,
`git log -3 --oneline`, `git show --format=fuller --no-patch HEAD`, `git show --stat HEAD`, `git diff`,
`rg --files`, `rg -n`, source/plan reads, file hashes, `pgrep -af '[p]ipeline/src/film.ts'` (none),
and direct image inspection. No dev server was stopped. Source search/open URLs are the audit
matrix above. Initial photo `curl` DNS failed in the sandbox; approved network retry succeeded.

```sh
source /home/jacopo/.nvm/nvm.sh
nvm use 24

# Before source edits, verify BO-003's two inventories; then freeze the initial config.
# The handoff inputs/configuration JSONs retain those initial results.
node --import tsx docs/bologna-landmark-fidelity-audit.ts

# Licensed original downloads (actual URLs are deterministic Commons MD5 filename paths):
curl --fail --location --retry 1 --connect-timeout 20 --max-time 90 --user-agent IsometricWorld-BO003F-source-audit/1.0 --output /tmp/bo-003f-references/facade.jpg 'https://upload.wikimedia.org/wikipedia/commons/f/f4/Basilica_di_San_Petronio%2C_facciata.jpg'
curl --fail --location --retry 1 --connect-timeout 20 --max-time 90 --user-agent IsometricWorld-BO003F-source-audit/1.0 --output /tmp/bo-003f-references/clock.jpg "https://upload.wikimedia.org/wikipedia/commons/4/44/Torre_dell'Orologio_(Bologna).jpg"
curl --fail --location --retry 1 --connect-timeout 20 --max-time 90 --user-agent IsometricWorld-BO003F-source-audit/1.0 --output /tmp/bo-003f-references/roof.jpg 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Bologna_Torre_degli_Asinelli_Vista_su_Basilica_di_San_Petronio_2.jpg'

# The runner requires this exact root; init refuses an existing one.
export PIPELINE_DATA_ROOT=data/bo-003f-landmarks
node --import tsx pipeline/src/bologna-fidelity-run.ts init
node --import tsx pipeline/src/bologna-fidelity-run.ts build
export CHROME_PATH=/home/jacopo/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome
export CHROME_ARGS='--no-sandbox --use-gl=angle --use-angle=swiftshader --disable-dev-shm-usage'
node --import tsx pipeline/src/bologna-fidelity-run.ts render
node --import tsx pipeline/src/bologna-fidelity-run.ts neutral
node --import tsx pipeline/src/bologna-fidelity-run.ts regressions

node --import tsx pipeline/src/bologna-fidelity.test.ts
node --import tsx --test pipeline/src/bologna.test.ts pipeline/src/bologna-architecture.test.ts pipeline/src/bologna-fidelity.test.ts docs/bologna-coverage-qa.test.ts docs/bologna-architecture-qa.test.ts
node_modules/.bin/tsc --noEmit -p pipeline
node_modules/.bin/tsc --noEmit --target es2022 --module esnext --moduleResolution bundler --allowImportingTsExtensions --strict --skipLibCheck --types node docs/bologna-landmark-fidelity-qa.ts docs/bologna-landmark-fidelity-audit.ts docs/bologna-landmark-fidelity-geometry.ts docs/bologna-landmark-fidelity-checksums.ts
node_modules/.bin/tsc --noEmit -p web
node --import tsx docs/bologna-landmark-fidelity-qa.ts
# Records agent inspection only, never an independent human approval or a Gate B pass.
node --import tsx docs/bologna-landmark-fidelity-qa.ts --agent-reviewed
git diff --check
node --import tsx docs/bologna-landmark-fidelity-checksums.ts
```

The download commands were executed through a Node `execFileSync('curl', args)` orchestration,
with the same listed arguments; originals were preserved/copied and hashed, not re-encoded.
A 1400 px JPEG roof inspection preview was made only under `/tmp` using sharp. No preview/photo
is input to procedural rendering. `commands.ndjson` in the new root records completed runner
commands, times and Chrome backend. Build copies the accepted BO-003 raw/ground and scene bins;
it does not call the normal deleting scene command or recompute municipal reconciliation.

Failures are retained in this record: Git child process denied during first sandbox audit
(approved retry passed); missing default `/usr/bin/chromium` (resolved to installed Playwright
Chromium); crashpad socket denied in sandbox (approved SwiftShader retry passed); full suite
coverage child-process test denied in sandbox (approved retry: all 34 tests passed). No generated
data was deleted to recover. No other datasets or services were needed/refetched.

**Do not replay init/build/neutral/regressions into this existing root.** Init and control cloning
reject existing destinations; build rejects an existing scene. Reproduce in a fresh checkout/root
with the preserved BO-003 inputs, or inspect this completed output in place. No automatic commit,
AI painting, export, upload, publish or deploy was performed.

## Changed and untracked files

Modified tracked files:

- `ATTRIBUTION.md` — CC BY-SA appearance-reference provenance and limits.
- `pipeline/src/bologna-metadata.ts` — optional proposal evidence field and shed method name.
- `pipeline/src/bologna-roofs.ts` — prevent accidental use of generic builder for ID-gated sheds.
- `pipeline/src/places.ts` — conditional BO-003F source credits only; geographic settings frozen.
- `pipeline/src/render.ts` — validated opt-in `--materials neutral`; default URL unchanged.
- `pipeline/page/renderer.ts` — optional neutral building shader hook; default path unchanged.
- `web/src/scripts/map.ts` — conditional footer/video reference attribution only.

New untracked implementation files (include them when sharing; `git diff` alone omits them):

- `pipeline/src/bologna-fidelity.ts`
- `pipeline/src/bologna-fidelity-safety.ts`
- `pipeline/src/bologna-fidelity-run.ts`
- `pipeline/src/bologna-fidelity.test.ts`
- `pipeline/page/neutral.ts`

New untracked docs, scripts and QA evidence:

- `docs/bologna-landmark-fidelity-audit.md`, `-audit.ts`, `-audit.json`
- `docs/bologna-landmark-fidelity-inputs.json`, `-configuration.json`
- `docs/bologna-landmark-fidelity-geometry.ts`
- `docs/bologna-landmark-fidelity-qa.ts`, `-qa.json`
- `docs/bologna-landmark-fidelity-proof.jpg`, `-comparison.jpg`, `-crops.jpg`
- `docs/bologna-landmark-fidelity-report.md`
- `docs/bologna-landmark-fidelity-checksums.ts`, `-checksums.json`

Preexisting user untracked files are untouched: `bologna-review.zip`, `pipeline/src/pipeline.zip`,
`pipeline/src/bologna-architecture.test.ts`, `plans/BO-003F-codex-task.md`.
New ignored artifacts under the allowed root include originals/provenance, raw/ground/scene,
normal/neutral renders and heights, five verification roots, `proposal.json`, `run.json` and command log.

## Next-task decision matrix

|Choice|Decision|Evidence needed / approximate effort|
|---|---|---|
|GO AI painting pilot|**Not granted**|First obtain independent human acceptance of a source-backed silhouette; then explicitly authorize one small crop/single tile, not citywide painting.|
|REFINE GEOMETRY|**Recommended**|Current reusable elevation/roof plan and a bounded church roofline/facade study. Estimated 0.5–2 days after usable evidence arrives; avoid invented repeated Gothic detail.|
|BLOCKED BY MISSING EVIDENCE|Clock, metric facade, historic arcade|Conclusive clock-body join and height endpoints; licensed measured facade/portico controls. Acquisition/municipal response time unknown.|

Stop here. A successful engineering gate does not authorize BO-004 painting or establish measured fidelity.
