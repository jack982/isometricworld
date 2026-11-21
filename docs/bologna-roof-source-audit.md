# BO-006P0 source and rights audit

Audit/fetch date: **2026-11-21**. Scope: the fixed Bologna `(-1,-1)` paint window, bounded source-linked roof benchmark only. No geometry, materials, region credits, renderer or viewer were changed. Source rights here authorize labelled diagnostic composites; they do not activate a new production map source.

## Rights, coverage and access matrix

| Source | Inspected evidence | Rights / role / limitations |
| --- | --- | --- |
| [Comune di Bologna 2023 RGB regional WMS catalogue](https://geoportale.regione.emilia-romagna.it/servizi/servizi-ogc/elenco-capabilities-dei-servizi-wms/cartografia-di-base/copy_of_service-24) | Cached catalogue, fresh GetCapabilities, 256² preview, one bounded 2048² GetMap | **CC BY 4.0** specifically stated for this WMS. Credit Comune di Bologna and Regione Emilia-Romagna; link source/licence and state reprojection, crops, annotations. Independent overhead visual observations only. |
| [Official WMS capabilities](https://servizigis.regione.emilia-romagna.it/wms/comune_bo_2023_rgb?service=WMS&request=GetCapabilities) | Actual XML version 1.3.0; layer **Comune_BO_2023_RGB**; PNG/JPEG and EPSG:3857 advertised | Service Fees/AccessConstraints fields are empty; licence evidence comes from the linked specific official catalogue, not the absence of restrictions. The preview and full response are valid PNGs, not XML exceptions. |
| [CTC volumetric buildings](https://opendata.comune.bologna.it/explore/dataset/c_a944ctc_edifici_pl/) | Existing full GeoJSON, metadata, accepted municipal parts and scene metadata; old hashes verified | CC BY 4.0, Comune di Bologna – SIT. WGS84 footprint/eave-volume source, **not roof types/ridges**. Dataset updated 2026-10-22; source original survey/individual dates may be much older. No municipal dataset was re-fetched. |
| [OSM](https://www.openstreetmap.org/copyright) | Existing frozen raw OSM; closed footprints and positive polygon intersections | ODbL; **© OpenStreetMap contributors**. Used for spatial group/landmark association; neither proximity nor AI color supplies identity or roof truth. Incomplete/open relation geometry is skipped, not joined by guessing. |
| [Bologna 2023 DTM catalogue](https://geoportale.regione.emilia-romagna.it/servizi/servizi-ogc/elenco-capabilities-dei-servizi-wms/altimetria-e-morfologia/service-21) | Catalogue and fresh DTM WMS capabilities | Catalogue CC BY 4.0, 0.5 m **bare earth**. No raster requested; cannot prove roof heights or ridge/eave differences. |
| [Bologna 2023 LiDAR coverage catalogue](https://geoportale.regione.emilia-romagna.it/catalogo/dati-cartografici/cartografia-di-base/quadri-di-unione/layer-1740409868.07) | Catalogue, `metadati_raster` capabilities, bounded GetFeatureInfo at window context | CC BY 4.0 **coverage metadata**. Layer `QU_ComuneBO_2023_LiDAR`; returned tile `32_686000_4929000`, LiDAR acquisition **2023-06-24**. Returned fields contain tile/date/content, no DSM/LAS URL or height values. Actual roof DSM/LAS: **NOT_ACCESSIBLE_FROM_INSPECTED_PUBLIC_RESOURCES**. This is not a claim of global unavailability. |
| [Municipal ortho tile-server directory](https://opendata.comune.bologna.it/explore/dataset/tile-server-ortofoto-comune-di-bologna/) | Official dataset metadata JSON lists 2017–2026 directories and EPSG:3857 | Catalogue metadata licence is **ODbL**. Specific tile-image rights were not established; **no tiles fetched or redistributed**. It does not inherit the regional WMS CC BY terms by assumption. |
| [Regional 2023/24 context](https://geoportale.regione.emilia-romagna.it/approfondimenti/rer23_24) | Official page cached | Separate 2023/24 and 2025/26 products mentioned. No contextual imagery/model retrieved; exact product rights not validated, **NOT_USED**. No epoch substitution. |
| Existing procedural source and old painting | Prior manifests, raw/derivative hashes, historical QA | Existing project imagery/source terms preserved. Painting is explicitly **NOT_REGISTERED / NOT_APPROVED** and never roof evidence. Historical run remains `FAILED_NO_RETRY`; offline decision remains `REFINE_REQUIRED`. |

Complete source URLs, exact request URLs, UTC dates, hashes, MIME types, response sizes, metadata and rights are in [source registry](bologna-roof-source-registry.json). A companion provenance JSON is retained beside the downloaded references. No proprietary imagery or new photographs were used.

## Image resource and request contract

The specific orthophoto catalogue describes 20 cm RGB resampling of 5 cm source photography, with flight interval **2023-06-19–26**. That is distinct from today's fetch date. The specific ortho tile flight day is **unknown**; the LiDAR coverage tile's June 24 date is not silently transferred to the photography.

Fresh capabilities XML: 6,414 bytes, SHA-256 `57f16240d97f7d51c352aa8a28d5b0bacd4347a2a85154a57157cbc48342af15`. Advertised service coverage in EPSG:3857 is `[1247962.907736,5530064.114891,1273838.080680,5553300.492715]`, which contains the bounded request.

Full GetMap:

```text
endpoint https://servizigis.regione.emilia-romagna.it/wms/comune_bo_2023_rgb
SERVICE=WMS REQUEST=GetMap VERSION=1.3.0
LAYERS=Comune_BO_2023_RGB STYLES= FORMAT=image/png TRANSPARENT=FALSE
CRS=EPSG:3857
BBOX=1262241,5541706,1262979,5542447
WIDTH=2048 HEIGHT=2048 EXCEPTIONS=XML
```

This is projected **east/north XY**, with screen raster y descending from max north. WMS 1.3 EPSG:4326 would require latitude/longitude BBOX axes; it is not used for imagery. WMS 1.1.1 EPSG:4326 XY ordering is separately tested to avoid conflation.

The full PNG is **9,237,589 bytes**, SHA-256 **`3f025fc4c310f3019385d38b466901586201e162e53e3e272e8cf6b283fb0ac8`**. Stored under `data/bo-006p0/references/ortho-cluster.png`. The service's advertised 20 cm product is requested at about **0.36 map m/pixel**, or **0.257–0.258 local ground m/pixel** after Mercator scale correction. It is not a new 20 cm survey. Anisotropic requested cell sizes differ slightly (738×741 map metres over a square raster); each axis is recorded. Board scale bars use horizontal local ground scale and are approximate.

One cluster services all twenty groups; no twenty duplicate GetMaps. Source pixel coordinates and affine georeferencing are retained. The orthophoto stays overhead/north-up and is **never stretched into the isometric camera**. CTC outlines are projected to WGS84 with the existing inverse ENU function, then EPSG:3857. Roof lean/parallax, source epoch/datum offsets and orthorectification errors are not “corrected” by image warping.

## Budget, failures and preservation

Application ledger: **25 attempted requests**, **11 successful**, **14 initial sandbox fetch failures**, **11,325,194 bytes** received. Requests are sequential, concurrency **1**, cached with SHA-256 and never replaced. Four initial browser-tool official URL opens (including a capabilities failure) are recorded separately; even conservatively adding those remains below 40 request actions. No image provider/model request occurred.

The first sandbox metadata run retried fetch errors once and produced 14 failure records with zero downloaded bytes. It was preserved. The transport was corrected to retry only transient HTTP 429/5xx responses at most once; non-HTTP exceptions are retained and stop that resource. Elevated bounded metadata/imagery requests succeeded. No failure was converted to an empty orthophoto success. Maximum 12 MiB per response, 40 application attempts and 50 MiB total are enforced. No further acquisition is required.

Before acquisition, **1,764 prior files** were pinned, including 1,645 protected BO-004S-D paths and all 53 offline handoff files plus production source trees. Existing CTC/raw/derived data, proofs, journal, approval/result/QA/logs, camera and all other regions remain read-only. All gates recheck preservation. New root creation and file writes refuse collision; draft cohort revisions are additive and retained.

## Gate 0 outcome and uncertainties

Primary imagery rights, actual layer, formats, projected axis convention and coverage are established. CTC and old-paint provenance match. Gate 0 is **PASS for the bounded ortho benchmark**, with explicit optional-source gaps: DSM/LAS pixels and ridge elevations unavailable from the inspected catalogue; municipal tile-image rights unknown/not used. No roof is already “verified” by these facts.

CTC `altezza_gr` is relative eave height. Absolute CTC vertical datum remains unresolved and unused. Existing ground U/terrain and geoid 39.647 m remain unchanged. A DTM is not a roof surface. Photography from 2023, municipal update in 2026, frozen OSM and old generic building partitions may disagree because of change, segmentation, lower/upper volumes or occlusion. Numerical projection precision is not survey accuracy. Every specimen retains **HUMAN_REVIEW_PENDING**.
