# BO-003F landmark source and fidelity audit

Audit date: 2026-11-19. User-checkpointed base `1444694f9d9e08db7276b195ee894572f8557c62`,
branch `feature/bo-003f-landmark-fidelity`. Initial tracked tree clean; user-owned untracked
`bologna-review.zip`, `pipeline/src/pipeline.zip`, `pipeline/src/bologna-architecture.test.ts`
and `plans/BO-003F-codex-task.md` are preserved. Both earlier checksum inventories verified
without mismatches **before source changes**. New isolated root: **`data/bo-003f-landmarks`**.
No earlier audit/proof writer is rerun. No new phase or painting is authorized by these results.

## Gate 0 findings and scope decisions

The reproducible [audit script](bologna-landmark-fidelity-audit.ts) pins 473 original artifacts
and user files in [inputs](bologna-landmark-fidelity-inputs.json). Full source geometry, numerical
joins, camera visibility, classification and height fields are in [audit JSON](bologna-landmark-fidelity-audit.json).
All BO-001R, BO-002 and BO-003 generated roots and their checksum inventories remain immutable.
`places.ts` permits an explicitly documented source-credit-only addition; all existing regions,
cities and geographic parameters are compared with the [configuration snapshot](bologna-landmark-fidelity-configuration.json).

**Gate 0: audit complete with scoped exceptions.** A bounded, separately testable roof-topology
proposal is allowed on **CTC 31864, 17875, 45799 and 52776 only**. Their official partitions,
relative eaves and unambiguous joins to OSM way/328013918, Wikidata Q810103 are verified.
The functional aisle/chapel labels remain probable, inferred from the measured plan and licensed
appearance evidence. Four outward shed planes, ≤2 m estimated rise, will replace two aisle
gables and two flat chapel-band caps. The rise, pitch and segmentation are **not measurements**.
The original nave gable remains an estimate. No chapel bays, buttresses or windows are generated
from assumed spacing. No facade metric mesh, clock/belfry or historic portico arcade is approved.
The two palace roof portions retain BO-003 geometry: no current surveyed ridge network was found.

## Source and rights matrix

|Source / exact URL|Coverage, currentness and reference system|Rights and use|Supports / does not support|
|---|---|---|---|
|[CTC Edifici volumetrici](https://opendata.comune.bologna.it/explore/dataset/c_a944ctc_edifici_pl/); [regional government catalogue](https://dati.emilia-romagna.it/dataset/carta-tecnica-comunale-edifici-volumetrici)|Pinned municipal export, 65,735 records. Selected original features have `data_istit=2004-07-27`, generally no later `data_varia`; not a fresh 2026 survey. Export lon/lat projected to the frozen ENU; absolute vertical datum unverified.|Comune di Bologna – SIT, CC BY 4.0. Existing attribution retained; no refetch.|Official partitions, class and relative eaves; 54 cm tolerance described in catalogue. No roof pitches, marble boundary, bay spacing, functional subpart labels or absolute ellipsoid heights.|
|[OSM San Petronio](https://www.openstreetmap.org/way/328013918), [palace](https://www.openstreetmap.org/way/149040859), [clock](https://www.openstreetmap.org/way/149041465)|Pinned BO-001R extract. WGS84 plan geometry; Q810103, Q2267154 and Q30888017 respectively. Clock OSM `height=20` conflicts with operator/CTC totals.|© OpenStreetMap contributors, ODbL. No geometry refreshed.|Unique site identities plus bounded intersections, not measured roof/elevation control.|
|[ICCD palace record 0800262039](https://catalogo.beniculturali.it/detail/ArchitecturalOrLandscapeHeritage/0800262039)|Official cultural heritage metadata for the whole palace; not a partition-level metric model.|CC BY 4.0 **metadata**; audit only. No attached photo/plan rights assumed.|Whole-site identity, no CTC clock join or surveyed roof network.|
|[Basilica official description](https://www.basilicadisanpetronio.org/la-basilica/)|Generic 132 ×60 ×44 m dimensions, 22 chapels; control surfaces and datum unspecified.|Factual audit only; no copied text, image, mesh or assumed reuse licence.|Overall description, not a measured 44 m ridge or instruction to scale CTC geometry.|
|[Metropolitan City visitor guide, p.21](https://www.cittametropolitana.bo.it/turismo/Engine/RAServeFile.php/f/Pubblicazioni/Guide/GUIDA_BO_ITA_web.pdf)|Distinguishes approximately 45 m central vault height from 51 m facade height; older tourism guide, not survey control.|Facts only; photographs/illustrations not reused. Browser full-PDF fetch exceeded its size limit; indexed government text was available.|Evidence that vault/facade/eave quantities differ. It does not resolve the official site's undefined 44 m or absolute datum.|
|[Clock operator safety document, p.2](https://www.bolognawelcomesrl.it/files/bologna-welcomeinformativa-e-duvritorre-orologiomanifestazione.pdf)|Operator states body 36.20 m plus about 10 m lantern; base 10.30 ×8.44 m. No survey coordinates or vertical datum.|Factual audit only; document is not imported as reusable geometry or an image.|Independent dimensional sanity check, not permission to fit/scale the CTC model.|
|[Congolandia.g facade photograph](https://commons.wikimedia.org/wiki/File:Basilica_di_San_Petronio,_facciata.jpg)|Own photograph, 2019-02-24, from Piazza Re Enzo. Perspective appearance, not an orthographic survey.|CC BY-SA 4.0; original retained locally with URL/date/hash. Inspected only; not traced, sampled as texture or sent to an image model.|Stepped facade, marble lower region, three portals; no inferred metric profile/portal heights.|
|[Raffacossa clock photograph](https://commons.wikimedia.org/wiki/File:Torre_dell%27Orologio_(Bologna).jpg)|Own photograph, 2017-05-05. Visible clock body, octagonal lantern, copper cap and open upper belfry.|Select CC BY-SA 4.0 from its dual licence; original retained locally. Inspection only; no clock mesh derived.|Appearance and topology vocabulary; does not settle source-body alignment or measured levels.|
|[Zairon roof photograph](https://commons.wikimedia.org/wiki/File:Bologna_Torre_degli_Asinelli_Vista_su_Basilica_di_San_Petronio_2.jpg)|Own photograph from Asinelli, 2022-04-27. Shows east-facing nave/aisle/chapel roof topology, with partial occlusions.|CC BY-SA 4.0; original retained. Appearance informs the explicitly estimated shed proposal; no pixels, tracing or photogrammetric dimensions enter the renderer.|Supports outward shed topology instead of independent side gables. No measured ridge positions, pitch, bay spacing or current 2026 condition guarantee.|
|Copernicus DEM GLO-30 and municipal tree snapshot|Identical BO-003 ground and 784 crowns; city surface-model terrain is not building survey ground control.|Existing exact Copernicus and municipal CC BY notices retained.|Anchoring and context, not a reason to correct unresolved landmark elevations.|

Photo download date, original byte counts, SHA-256, full original URLs, licence/author and
failed-download distinction are recorded in `data/bo-003f-landmarks/references/provenance.json`.
The only resized temporary inspection preview is separate from the preserved original. No
reference photographs appear in produced map/proof pixels. Source credits are activated only
for the BO-003F mode, including a conditional footer link; other map modes receive no new notices.

## Exact parts and confidence

|Site / role|CTC IDs and relative eaves m|Verification and limitation|
|---|---|---|
|San Petronio nave|17871: 47.3|Part geometry and church association verified (~99.2% overlap); central-nave role probable from central elongated plan.|
|West / east aisle|31864 / 17875: 27.8 each|Geometry and association verified (~99.2% each); aisle role probable. Only the estimated roof family changes.|
|East / west chapel band|45799: 21.1 / 52776: 20.9|Geometry and association verified (~99.3% /99.1%); chapel-band function probable. No invented repeated chapel partitions.|
|Northern facade lower strip|52777: 20.1|Official `Chiesa` strip follows northern frontage but only 0.024% intersects the named OSM polygon. Association probable by boundary adjacency; does **not** pass the 80% join rule. It cannot define the full 51 m facade. No override.|
|Apse|59850: 39.7|Verified church part; probable apse from southern faceted geometry. Metric facade and roof unknown; unchanged.|
|Bell tower|39022: 59.7|Verified church part and explicit `Campanile` classification; no spire/62 m rescaling.|
|Other church parts|18063: 21.6; 32021: 4.7|Verified association; functional attachment labels unknown. Unchanged.|
|Palace north/east L portion|47682: 24.8|85.52% within named palace OSM footprint; historical wing/function label probable. Not the whole west/south complex.|
|Palace southern portion|61154: 26.6|98.86% within named footprint; historical range name probable. Existing estimated segmented hip retained.|
|Clock body candidate|26676: 36.4|Original outer outline only **64.64%** within named clock OSM way, accepted ring only 48.97%. Below 80% rule; no lowering the threshold to obtain a clock.|
|Nested clock candidates|56137: 42.6; 35259: 45.2; 49154: 49.6|Octagonal/ring/cap source geometry verified. Outer overlap 93.46% /100% /100%; likely lantern hierarchy, but functional level and body's alignment remain probable. Upper-part matches cannot validate the entire body or justify invented openings.|

West/south palace ranges beyond the two verified portions are deliberately not assigned by
nearest-name matching: multiple adjacent OSM/CTC volumes have no unique whole-palace semantic join.
Full candidate/source polygons and raw/accepted coverage values are retained in audit JSON.

## Height semantics and actual visibility

For CTC 17871, `111.2 −63.9 =47.3 m`; the aisles have `91.7 −63.9 =27.8 m`; the bell tower
has `123.6 −63.9 =59.7 m`. These are relative eave attributes. The government guide's central
vault and facade heights are different surfaces, while the official basilica site's 44 m has
no exact endpoint definition. A plausible semantics explanation is **not** proof that 44 m
equals a particular vault/ridge. No correction, arbitrary scale or geoid adjustment is applied.
The clock's operator approximate total 46.2 m versus CTC terminal eave 49.6 m is another unresolved
endpoint/epoch inconsistency, not grounds for stretching or shrinking its nested volumes.

The frozen camera looks northwest from southeast. The inferred north-facing church front has
a negative normal dot product toward the viewer (numeric value in audit JSON). Its main marble
face is back-facing/occluded. A source-faithful facade cannot be made to face this camera by
moving its material to the southern apse. The proposed next facade deliverable is a separately
labelled elevation study with sourced outline and unknown metric controls, **not** a false mesh.

## Comparison against the three BO-003 JPEGs

- `bologna-architecture-proof.jpg`: red roof contrast identifies the changed church/palace sites,
  but the overview does not establish recognizability. Two top corner cells are outside the manifest.
- `bologna-architecture-comparison.jpg`: tiered massing and source placement improve over generic
  BO-002; independent aisle gables differ from the licensed outward-shed appearance. Facade is not
  demonstrated from this camera; palace clock remains a generic nested extrusion.
- `bologna-architecture-landmarks.jpg`: square/courtyard openings remain visible; portico 21018
  is an open 17-column L run, not a verified historical arcade. Church walls lack observed buttress
  and clerestory rhythm; dimensions/positions must not be invented from a generic repeated window rule.

Agent image inspection is not independent human validation. The BO-003 manual `PASS` is treated
as a bounded technical review only. BO-003F will report geometric validity, recognizability and
measured fidelity separately; a neutral-material comparison is required before any GO decision.
