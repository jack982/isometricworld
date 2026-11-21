# BO-006P0 — Roof Truth & Visual Benchmark

**Project:** Isometric Bologna (`jack982/isometricworld`)  
**Agent:** Codex CLI, Node.js 24, reasoning High  
**Stage:** Evidence acquisition, roof-type classification, visual benchmarking. **NO production rendering changes.**  
**Region:** Existing Bologna paint window `(-1,-1)` and corresponding CTC municipal building parts.  
**Output:** Audit, reproducible 20-building sample, referenced visual comparison, provenance and human-review gate.  
**Status:** Proposed. **Do not claim that any roof is already verified.**

## 0. Mission and decision we need

We have a geographically grounded city representation based on municipal CTC footprint/eave data, but most roofs in the procedural render are simplified. The first AI-painted image looks substantially better, yet it turns some *procedural-flat* roofs into pitched roofs and is not geographically registered to the 1024² input. BO-004S-D classified that candidate `REFINE_REQUIRED` and **not** usable as a map tile. We now need an independent *roof truth* dataset for a bounded sample to distinguish:

1. An AI hallucination of a pitched roof **where the real building is flat**;
2. A plausible depiction of a pitched roof **where the procedural model is merely incomplete**;
3. A roof whose geometry **cannot be established from available evidence**.

This task establishes an **evidence-based reference and benchmark**, not a new map. Its output determines BO-006P1 (materials/textures), possible BO-006P2 (roof geometry) and whether a later painting test is justified.

### Non-negotiable constraints

- **Do not** invoke `codex exec` for painting, image-generation tools, OpenAI Images API, fal.ai, or any other paid image provider. **Zero new image-generation requests.**
- **Do not** run `paint`, modify the old `raw.png`, accept/register it, alter historical `FAILED_NO_RETRY`, export production tiles, publish, deploy, upload to R2 or commit.
- **Do not** change camera/origin/heading/terrain/tiles, CTC eaves/footprints, geometry adapters, renderer, viewer, other cities or existing baseline snapshots. Read-only on all existing project artifacts.
- **Do not** infer real roof shape from the AI painting. The painting is a visual comparison, *never* geographical evidence.
- Never use Google/Bing/Apple imagery, street-view screenshots or copyrighted photos as redistributable assets without checking specific rights. **Publicly accessible does not mean openly licensed.** No scraped imagery or bulk downloads from unapproved services.
- Retain attribution and licence provenance for each externally derived image/crop, including source URL, layer, provider, acquisition date and terms. Preserve timestamps separately for flight date vs data download date.
- If public geodata coverage, permissions, source IDs or projection cannot be verified, report `UNKNOWN` / `BLOCKED` and continue with the remaining sample. **Never invent identities, roof types, source values or measurements.**
- Work in a fresh, isolated `data/bo-006p0/` root and write only new `docs/bologna-roof-*` artifacts and, if needed, an isolated `docs/bologna-roof-*.ts` utility. Refuse overwrite of existing roots and never delete prior user data.
- Do not automatically commit. Report any existing dirty Git changes without modifying or staging them.

## 1. Preflight: repository, evidence chain, source availability (Gate 0)

1. Run and record `node -v`, `git status --short`, current branch/HEAD. Read `AGENTS.md` first. Switch to Node 24 **explicitly** using `nvm use 24` where available. Do not silently use Node 18/22.
2. Inspect the actual local implementation rather than relying on filenames alone:
   - `pipeline/src/places.ts`, `areas.ts`, `bologna.ts`, `bologna-geometry.ts`, `bologna-metadata.ts`, `bologna-roofs.ts`, `bologna-fidelity.ts` and any related roof/architectural files actually present;
   - scene, camera, projections, tile metadata and map/world transformations;
   - CTC source snapshots, `municipal-buildings.json`, `selection.json` and source-ID mappings, if present;
   - `docs/bologna-data-audit.md`, `docs/bologna-municipal-implementation.md`, `docs/bologna-architecture-audit.md`, `docs/bologna-landmark-fidelity-report.md`, `docs/bologna-paint-offline-report.md` and `docs/bologna-paint-offline-qa.json`, insofar as present;
   - authoritative 1024² procedural `input.png`, experimental painting original and offline diagnostic derivative, with input and output hash checks against existing manifests.
3. Resolve **precisely** the screen-space footprint of the fixed paint window `(-1,-1)` in geographic coordinates using the existing projection/camera/region implementation. Do not treat pixels as longitude/latitude, confuse geodetic/ENU, or independently reinvent the camera transform. Confirm the input `1024×1024`, known heading and 0.25 m/art-pixel configuration from code/manifests. Document camera and transform parameters, numeric round-trip error and orientation.
4. Determine how a **CTC volume part** relates to a **physical roof / coherent building**, and whether IDs may represent separate wings/volumes rather than entire buildings. Preserve original source IDs and dataset snapshot hashes; create a `roof_group_id` for sampling groups without asserting the physical identity is legally/cadastrally exact.
5. Inventory pre-existing snapshots and checksums, with exact locations and their protections. If they are missing, report exactly what is blocked; do not re-fetch huge raw datasets by default.
6. Validate sources below **before requesting images**: license, specific resource, latest GetCapabilities, layer identifier, allowed image formats, CRS, BBOX convention and coverage; test no more than a small preview. Request bounded spatial tiles/crops only, not complete orthophoto downloads.

### Verified source candidates to investigate (not yet sampled)

| Priority | Source | Exact official reference | Intended role / caveat |
|---|---|---|---|
| P0 | Regione Emilia-Romagna, **Ortofoto Comune di Bologna 2023 RGB**, WMS | https://geoportale.regione.emilia-romagna.it/servizi/servizi-ogc/elenco-capabilities-dei-servizi-wms/cartografia-di-base/copy_of_service-24 | The official catalogue describes RGB orthophoto **20 cm/pixel**, flown June 19–26 2023, and labels its WMS **CC BY 4.0**. Primary overhead visual reference for the candidate sample. |
| P0 | Official WMS endpoint | https://servizigis.regione.emilia-romagna.it/wms/comune_bo_2023_rgb?service=WMS&request=GetCapabilities | Discover exact layer names, WMS version, CRS, coverage and attribution. **Do not guess layer identifiers or swap axis order**. Respect service constraints; cache small bounded GetMap responses. |
| P0 | Comune di Bologna — CTC Edifici volumetrici | https://opendata.comune.bologna.it/explore/dataset/c_a944ctc_edifici_pl/ | Footprints and eave heights, **not** roof ridges, roof types or complete 3D meshes. Use existing locally validated snapshot, IDs and license. |
| P1 | Regione E-R, DTM Comune di Bologna 2023, 0.5 m, WCS/WMS | https://geoportale.regione.emilia-romagna.it/servizi/servizi-ogc/elenco-capabilities-dei-servizi-wms/altimetria-e-morfologia/service-21 | **Bare-earth terrain model**, explicitly **not** usable to infer roof surface or ridge heights. For context/terrain only. |
| P1 | Bologna 2023 LiDAR **coverage catalogue**, including DSM first return / LAS descriptions | https://geoportale.regione.emilia-romagna.it/catalogo/dati-cartografici/cartografia-di-base/quadri-di-unione/layer-1740409868.07 | Indicates such data were captured; **does not establish that actual DSM/LAS pixel values are publicly downloadable/reusable**. Investigate catalogue/available access and license. If unavailable, report `NOT_ACCESSIBLE`; do not imply the ridge height is measured. |
| P2 | Comune Bologna ortophoto tile-server directory | https://opendata.comune.bologna.it/explore/dataset/tile-server-ortofoto-comune-di-bologna/ | Versions through 2026 may exist. **Verify licence of the specific tile source** before fetching/repackaging; do not assume it inherits the regional 2023 WMS CC BY licence. |
| P2 | Regione E-R Geoportale 3D and regional 2023–24 ortho services | https://geoportale.regione.emilia-romagna.it/approfondimenti/rer23_24 | Optional contextual check where coverage and individual licence are confirmed. Do not conflate capture epochs. |

**Source rule:** Regionally licensed 2023 WMS may be used in diagnostic review composites with attribution and indication that crops were reprojected/annotated; the full repository must not silently adopt a different attribution or weaker image licence. Review the *actual* service metadata, not only this task. Particularly, a DTM never proves a roof ridge. A genuine DSM/point cloud, if **actually accessible and licensed**, could in a later task yield ridge elevations after checking horizontal/vertical datum and classification; it is optional here, and must not trigger a broad LiDAR pipeline.

**Gate 0 exit:** produce `docs/bologna-roof-source-audit.md` with a source/rights matrix, service capabilities check and blocking uncertainties. If regional WMS access is unavailable, still generate the sample template and mark visual classification blocked rather than fabricate observations.

## 2. Sample design: 20 roof groups, not 20 arbitrary volume records (Gate A)

### Target and geographic scope

Select **20 unique, coherent physical roof groups** (acceptable 15–25 only if justified), all intersecting the original paint window `(-1,-1)` with a margin sufficient for neighboring context. Use **CTC IDs from the actual municipal source** and preserve provenance; a group may reference multiple volume parts. Do not hardcode or claim that prior CTC IDs `31864`, `17875`, `45799`, `52776` belong to specific landmarks. Portico pilot ID `21018` is not necessarily a roof group.

Select reproducibly with a documented selection algorithm, fixed seed/ordering and explicit audit of manual exceptions:

- 4 landmark/architecturally sensitive roof groups, prioritizing **San Petronio**, **Palazzo d'Accursio / tower area**, and relevant adjoining historic volumes *only if ID and spatial association are verified*. It is fine if these comprise several parts.
- 6 `source-flat → AI-pitched` **conflict candidates** from NW, SW, central or palace crops in BO-004S-D. Sample only where a source building/roof can be uniquely tied to the actual CTC geometry.
- 6 ordinary residential or mixed-use blocks covering both simple and complex roof outlines, including some originally pitched/shed procedural roofs.
- 2 groups surrounding open **courtyard holes** where roof classification must not cover the void.
- 2 **negative/control cases**: clear-looking flat roofs/terraces or uncertain structures, and/or a portico-adjacent structure, without presuming that the real roof is flat.

Strata can overlap: the final sample must have **20 unique groups** (do not count one landmark twice). Balance sectors of the window and avoid selecting all samples from one tile or roof type. Include at least a few controls where the AI painting preserves overall mass rather than invents pitched roofs.

### Identification and coordinates

1. Produce the true original `input.png` pixel-to-ENU/geographic mapping for candidate centroids; use ray/ground or mesh-projection methods where necessary, respecting that the isometric view is not a naive plan view.
2. Intersect CTC roof group footprints with the footprint of the window in world coordinates (with context margin). Record area/bbox/centroid in both CRS and screen pixels **with explicit uncertainty**.
3. Verify landmark identity by CTC/OSM landmark spatial intersection and, where possible, official building references. Do not infer from a roof color or nearby label. If the tower corresponds to an unresolved source group, label it unresolved.
4. Produce `docs/bologna-roof-sample.csv` with **exactly 20 non-duplicate records** when available, and `docs/bologna-roof-sample.json` for structured multi-part IDs/observations; if fewer, document missing strata and make Gate A `PARTIAL`.
5. Do not treat apparent roof ridge segments in the AI painting as measured features. Painting-derived roof type may be recorded separately as an *observed illustrated outcome*, never ground truth.

**Required CSV fields** (use identical names or clearly documented lossless equivalents):

```csv
sample_id,roof_group_id,ctc_ids,landmark_name,selection_stratum,centroid_lat,centroid_lon,input_pixel_x,input_pixel_y,source_roof_type,painted_roof_type,observed_roof_type,roof_orientation,roof_material_observed,confidence,classification_status,source_ids,reference_year,review_status,notes
```

Use blank/`unknown` rather than guesses. Detailed evidence and rights must live in the JSON source registry (CSV can list source IDs). `ctc_ids` may be pipe-separated in CSV, array in JSON. All derived metrics, confidence, human decisions and licensing are independently auditable.

## 3. Acquire and interpret orthophoto evidence (Gate B)

### Bound the requests

- Inspect WMS GetCapabilities first; use correct layer/CRS/bounds. Request image `GetMap` crops per candidate or clustered candidates with controlled **geospatially exact BBOX**; document WMS 1.1.1 vs 1.3.0 axis order and `EPSG:4326` pitfalls, use appropriate projected CRS when possible.
- Prefer efficient clustered windows instead of 20 duplicate overlapping requests. **Initial budget: ≤40 requests and ≤50 MB downloaded** for this pilot; stop and document the exception if the service cannot satisfy the need within the budget. Rate-limit politely, cap concurrency ≤2 and retry only transient HTTP failures, bounded, with clear error logs. Reuse cached image by checksum; avoid repeated mass requests.
- Read the service response content type and validate actual PNG/JPEG bytes; never treat HTTP error/service exception XML as imagery. Record URLs or reproducible request parameters in a manifest (redact tokens if any), request date, aerial acquisition date and SHA-256.
- Store downloaded bounded crops only under `data/bo-006p0/references/`, with source credits and provenance JSON. Do **not** check in unlicensed or large source imagery. Ensure license and publication of derivative review composites remain authorized.
- Generate an **overhead orthophoto** for the same area and separate **isometric render** for visual comparison; orthophoto must not be stretched into pretending it uses the same camera. Any registration/control overlay must be geographically referenced, with transformations and error clearly stated.

### Roof classification taxonomy

Use `flat_or_terrace`, `single_pitch`, `gable`, `hip`, `multi_pitch`, `complex`, `other`, `unknown` (provide exact definitions). Evaluate independently for each sample:

- **Observed roof form** from official imagery: `observed_roof_type`, ridge direction if reasonably identifiable, roof segmentation, visible dormers/skylights, roof openings and courtyards; label uncertainty where the orthophoto lacks detail or exhibits occlusion.
- **Roof material appearance**, e.g. reddish clay tile vs light/grey surfaces, is a *visual inference only* unless corroborated by a separate material source. Never equate red coloration with confirmed terracotta material.
- **CTC/OSM/procedural geometry**: `source_roof_type`, source eave height and its coverage; whether a roof was flattened due to missing LoD2 data; sources of any pre-existing hand-tuned geometry.
- **AI painted output**, diagnostic Lanczos3 version only: `painted_roof_type`, ridge additions, altered edges, openings obstructed. Mark this separate from the observed real roof.
- **Confidence** as evidence-backed `verified / inferred / unknown`:
  - `verified`: direct, clear official/high-quality spatial evidence plus a second independent corroborating source or an authoritative explicit roof geometry/model; exact claim and uncertainty documented. A single orthophoto can support an *observation* but should not automatically imply metric verification.
  - `inferred`: plausible visual classification using one dated image/limited shadows; possible occlusion, rectification and time drift acknowledged.
  - `unknown`: inadequate imagery, indistinct or complex roof, identity uncertain, conflict between sources, source rights unclear.
- **Temporal consistency:** flag different 2023 aerial date versus latest CTC updates/OSM snapshot and any potential roof construction since imagery capture. Do not use a 2023 photo as if verified on 2026-11-20.

**Important limitations:** a nadir ortho can identify roof plan/appearance to varying degrees, **not** reliably establish ridge elevation or historically correct dormers without additional data. DTM is bare earth. Do not derive eave/ridge difference from a screenshot or assume roof angle from pixel hue. Mark measured ridge height `null` unless genuinely measurable licensed DSM/LiDAR is available with adequate vertical reference documentation.

## 4. Benchmark and visual review board (Gate C)

Produce a reproducible report **per sample** and an index contact sheet. Each specimen should have:

1. An *unmodified crop of the original 1024² procedural source* in its true isometric framing (with original pixel coordinates).
2. An *unmodified crop of the BO-004S-D diagnostic resized painting* for appearance comparison, explicitly labelled **not registered / not approved**. Do not recompose the painting into an accepted map tile.
3. A **separate overhead orthophoto crop with north arrow, date and scale** (do **not** disguise it as the same perspective). Include CTC footprint outlines transformed into the ortho CRS if geospatially valid, plus source IDs. No 3D silhouettes inferred from painted art.
4. Source links, license and current classification. Label `UNKNOWN` prominently where imagery or identity is inconclusive.
5. Mark if the AI's new pitched roof is **supported, contradicted or unresolved** by evidence, without declaring it pixel-aligned. Distinguish `procedural_is_incomplete` from `painting_topology_diverged`; both can be simultaneously true.
6. Each specimen must expose an explicit user-facing **HUMAN_REVIEW_PENDING** state. Agent-generated observations are provisional and do not count as independent validation.

### Deliverables for human review

```text
docs/bologna-roof-source-audit.md
docs/bologna-roof-sample.csv
docs/bologna-roof-sample.json
docs/bologna-roof-benchmark.md
docs/bologna-roof-benchmark-overview.jpg
docs/bologna-roof-benchmark-details.jpg
docs/bologna-roof-qa.json
docs/bologna-roof-checksums.json
```

Additional code/manifest artifacts as needed (bounded, testable, optional):

```text
docs/bologna-roof-source-registry.json
docs/bologna-roof-projection.ts
docs/bologna-roof-sampling.ts
docs/bologna-roof-benchmark.ts
docs/bologna-roof-qa.test.ts
data/bo-006p0/references/*.png
data/bo-006p0/manifest.json
```

`benchmark-overview.jpg`: numbered sample distribution and concise summary, plus **separately framed** procedural/painted/ortho overview. `benchmark-details.jpg`: contact sheet of 20 samples or multiple clearly named panels if resolution would be illegible. Preserve full-size individual source crops under the isolated output directory; thumbnails alone are not enough for review.

### Quantitative baseline

Record useful totals, **never invent a performance target by fudging classifications**:

- Groups sampled and stratification coverage; `verified / inferred / unknown` distribution.
- Original procedural roof-type distribution versus ortho-observed roof distribution.
- AI-painted roof transformations: supported / contradicted / unresolved counts.
- Conflicts around San Petronio, Palazzo d'Accursio, ordinary blocks and courtyard/portico candidates.
- Number of samples for which CTC source and orthophoto crop could actually be linked.
- Area coverage and location uncertainty; data/licensing coverage gaps.
- Estimated *technical opportunities* for procedural roof types, **not** a specification to modify geometry in this task.

**Avoid** reporting roof-type accuracy % unless the underlying denominator is a genuinely labelled and sufficiently independent sample. Unknown cases must remain in the denominator or be explicitly excluded with a justification.

## 5. Decision and work packages (Gate D)

Generate `docs/bologna-roof-benchmark.md` with a factual conclusion and **three independent gates**:

| Gate | States | Required evidence |
|---|---|---|
| Evidence sufficiency | `SUFFICIENT_FOR_PILOT / PARTIAL / BLOCKED` | Valid identities, source rights, coverage, spatial sampling, clear uncertainties |
| Roof truth | `VERIFIED_SUBSET / INFERRED_ONLY / UNRESOLVED` | Individual roof-group evidence. No blanket 'Bologna roofs verified' claim |
| Human acceptance | `PENDING / ACCEPTED / REJECTED` | **Always PENDING at task completion.** Approval must be given in a separate human review |

Then propose **separate follow-ups** ranked by value, risk and effort, **not executed**:

- **BO-006P1:** deterministic tile-safe materials, terracotta/warm render, masonry/facades/paving and realistic roof texture **without** inventing roof volume;
- **BO-006P2:** evidence-driven roof geometries (gable/hip/shed), **only** for source-linked, reviewed samples; preserve eaves, CTC holes and camera and regression tests;
- **BO-006P3:** optional source-specific landmarks/portico high-fidelity models, not bulk automated conjecture;
- **BO-004S-E:** optional second painting, **only after** its 1024² output dimensions/alignment constraints and geometry preservation are demonstrably controlled or explicitly bounded.

Write a proposed incremental roadmap with acceptance metrics and revert strategy for each; **do not** change the renderer or initiate them.

## 6. Engineering / safety QA (Gate E)

Implement small deterministic helpers and fixtures only where justified. Use repository dependencies and existing transformation logic; do not install broad GIS stacks or generate images via AI merely to produce diagrams. If QGIS/GDAL are already installed, they may be used *read-only* for verifying orthophoto georeferencing. If adding a dependency is required, document it and stop for review rather than silently adding a heavy GIS library.

Minimum tests/checks:

- Lat/lon ↔ existing region ENU ↔ window/screen coordinate round trip, within documented numerical tolerances; assert correct WMS CRS axis order and BBOX orientation.
- Stable CTC volume IDs, distinct roof groups and no false landmark identification through mere bounding-box contact.
- All 20 sample IDs unique, sample strata and geographic window eligibility; unchanged sample output given same source hashes and selection seed.
- WMS GetCapabilities and GetMap type/size checks; failure or lack of coverage **must not** silently become a blank ortho image.
- Correct mapping of official image metadata (2023 flight date vs local fetch date), provider rights, attribution and transformation notices.
- `flat / gable / hip / ... / unknown` taxonomy and confidence/rights validation; no automatic `verified` from a single ambiguous image; no empty source URL for a verified entry.
- Null/unknown handling for roof ridges, materials and obscured courtyards; no made-up metrics.
- Known non-verified source samples preserved as `HUMAN_REVIEW_PENDING`.
- No modification to previous painting diagnostics, raw files, approval logs, source exports or baseline manifests, verified through protected inventories/hashes where available.
- TypeScript checks for any new tools and existing pipeline/web; `git diff --check`, selected tests, source and deliverable checksums. If a check is skipped because of a missing dataset/tool, record **SKIPPED/BLOCKED**, not PASS.
- No agent-invoked image painter, no provider credentials, no production export, no writes to viewer/renderer and no remote storage operations.

### Handoff contract

Produce an operator-ready summary containing:

- Gate 0–E status including any `PARTIAL` / `BLOCKED` state;
- Exact CTC source IDs and grouping decisions for all sampled roofs;
- Real sources visited, download dates, layer URLs, observed license and restrictions;
- File list including new/untracked files and any changed tracked file (none expected);
- Exact commands/tests run, exit codes and output SHA-256;
- Source evidence classification per sample and human acceptance status;
- Three representative `supported / contradicted / unknown` example specimens, if the evidence supports all three;
- What BO-006P1 may safely texture now, what BO-006P2 could alter **only after human approval**, and what remains unknown;
- All unresolved GIS mapping, source rights, rooftop, dated imagery and landmark-ID issues.

**STOP at the human review gate.** Do not start BO-006P1, alter roofs, rerun Codex painting or deploy until the user reviews the benchmark.

---

## Codex launch instructions for operator

```bash
cd ~/projects/isometricworld
nvm use 24
git status --short
codex
```

In Codex CLI select a capable coding model with **High** reasoning and paste the complete Markdown task. Additional instruction:

> Execute BO-006P0 autonomously through Gate E, within the explicitly bounded sampling/download budget. Inspect the real repository and official source capabilities. Produce evidence, tests, audit and contact sheets. Do not implement roof geometry/material modifications or make any image-generation calls. Do not commit, publish, deploy, delete or overwrite existing data. Mark missing evidence as UNKNOWN/PARTIAL and stop for human acceptance.

**Estimated scope:** bounded pilot, 20 groups; not full Bologna and not a guarantee that 20 roofs can be independently verified. Network access is permitted only for the public, verified-license GIS sources used to document observational evidence, **not** any model generation or API billing.
