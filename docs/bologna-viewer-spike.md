# BO-005P — local navigable Bologna viewer

**Result: the current procedural patch is locally navigable.** Export, real browser interaction,
source attribution and engineering gates pass. Independent human acceptance is **NOT_TESTED**.
This does not change BO-003F's unresolved architectural-fidelity / no-painting conclusions.

Open **http://127.0.0.1:4375/bologna**. The task-owned loopback dev server is left running.
No R2/Cloudflare credentials, uploads, paid service, analytics or AI painting are used.

## Chosen inputs and safety

Base commit `0a63773`, branch `feature/bo-005p-local-viewer`. Initial tracked working tree clean;
only user-owned `plans/BO-005P-codex-task.md` was untracked. No active render/film/export/paint job
was observed in process inspection. No user's dev server was stopped. Existing assets were not
deleted or rerendered; all **990 input preservation hashes** still match.

Source: **`data/bo-003f-landmarks/derived/piazza-maggiore`**, the latest complete **normal** render,
with its engineering QA passing. It is not a neutral control or a painting. The source retains
BO-003F's four estimated shed roofs, unresolved clock/facade details and historical-arcade gaps;
no independent human architectural acceptance is inferred from its technical gate.

Frozen configuration: origin **44.4938, 11.343, h=0**; heading **315°**, pitch **45°**,
resolution **0.25 m/art-pixel**, render tile **1024 px**, geoid **39.647 m**;
bbox **[44.4893, 11.337, 44.4983, 11.349]**. The existing regions/cities and camera source files
are pinned unchanged. Tel Aviv/Stuttgart settings remain intact; **Zagreb is not configured**
in this checkout, so no route or data is invented for it.

[Input inventory](bologna-viewer-inputs.json) records source color/height hashes, camera, bbox,
attribution checks and the protected original files. It also validates the original data/docs
against all four earlier architecture/fidelity inventories. Historical source-code hashes that
predate later commits are not mistaken for immutable generated data.

All ten manifest color PNGs (1024²) and height PNGs (256²) are opaque and nonblank. The grid's
two upper corner cells **(-2,-2)** and **(1,-2)** are outside the manifest. They appear as the
page's dark background at overview; they are not failed tiles. Source scene/ground/trees,
712 courtyard rings and geographic data are untouched.

## Isolated export and integration

Fresh root **`data/bo-005p-viewer`**, created by `docs/bologna-viewer-prepare.ts`. It contains
verified copies of the selected render/height/ground/manifest, leaving every baseline root intact.
Preparation refuses an existing output root. Existing input pins can be reused only after all
their original hashes validate; the script never replaces them.

The existing `pipeline/src/export.ts` does the actual export, with one new opt-in flag:

```sh
PIPELINE_DATA_ROOT=data/bo-005p-viewer npm run export -- piazza-maggiore --local-preview
```

`--local-preview` requires cache and publication-state paths **inside an isolated data root**.
It disables remote tile fallback and fails if a required local tile is absent. It exports static
map/photo layers, retaining the existing AVIF encoder, negative global coordinates, hash indexes,
and parent resampling with neighbor margins. It does not process roads, trains, traffic or municipal
boundaries. The empty borders index is an **explicitly omitted layer** (`municipalBorders:false`),
not a failed download presented as an empty source. No new GIS data is fetched.

Two small-area issues were addressed only in this opt-in mode:

- The normal 760–2560 art-pixel edge fade is sized for large maps and would darken most of a
  ~1 km patch. Local preview keeps original brightness and the exact sparse manifest boundary.
  Stair-step outer edges are intentional for this finite spike, rather than falsely filling cells.
- The preview exporter used a fixed 25 m initial height. Local preview uses the region's existing
  **100 m ground estimate**, matching viewer positioning; the frozen camera/geoid/terrain do not change.

Normal exports keep their original fading, overlay generation and published-cache behavior.
The local output never touches `data/web` or `data/web-state`.

Export location: **`data/bo-005p-viewer/web/regions/bologna`**:

|Output|Count / schema|
|---|---|
|AVIF map tiles|70: z8=40, z7=10, z6–z2=4 each|
|AVIF photo tiles|70; identical procedural render pixels, retained for existing `P` toggle|
|Metadata JSONs|4: `world.json`, hashed map/photo indexes and hashed empty borders|
|Previews|2: 768×614 landscape and 480×1056 portrait, plus embedded tiny LQIPs|
|Region files total|**146**|
|Pending state|Separate `data/bo-005p-viewer/web/bologna.state.json`, never published|

`world.json` preserves source attribution strings intact, including semicolons, and adds an
explicit local-preview record and `features.animations:false`. No animation code/data is activated.
Both source and exported metadata identify a procedural rendering; no measured-monument claim is added.

`LOCAL_MAP_ROOT` is the smallest dev override: a repository-relative or absolute export-cache root.
The existing Astro `/regions/` middleware serves it locally and returns **404** for absent assets,
with no R2 fallback. Malformed/traversal paths are rejected. SSR preloads and the browser share this
same root. Other unexported cities show an explicit local-unavailable page with a link to Bologna,
instead of making production requests. Outside this mode, ordinary cache/production behavior remains.
Build/preview commands explicitly reject `LOCAL_MAP_ROOT` so it cannot silently configure deployment.

## Start, stop and reproduce

From repository root, using the retained BO-003F source data:

```sh
nvm use 24
# Only when the BO-005P output root does not already exist:
node --import tsx docs/bologna-viewer-prepare.ts
PIPELINE_DATA_ROOT=data/bo-005p-viewer npm run export -- piazza-maggiore --local-preview

# For the already exported artifacts, just start the local viewer:
LOCAL_MAP_ROOT=data/bo-005p-viewer/web npm -w web run dev -- --host 127.0.0.1 --port 4375
```

The task ran Node **v24.22.3**, npm **11.19.1**, Astro **7.4.7**, Vite **8.3.7**,
OpenSeadragon **6.1.1**, sharp **0.35.5** and TypeScript **7.0.2**. `nvm.sh` was sourced from
the user's normal installation before commands. No dependency installation or remote account is needed.

Astro 7 starts a background dev process and prints its PID, URL and readiness. This task's start
reported **PID 829536**, recorded under `data/bo-005p-viewer/dev-server.json`. To stop **only this
task-owned process**, first verify the printed PID still belongs to this viewer:

```sh
ps -p 829536 -o pid,args
kill -TERM 829536
```

For a new start, use its newly printed PID, not the old example. Do not run a shared
`astro dev stop`, kill unrelated ports, or delete caches. This task leaves its own server running.
The dev port uses strict binding in local mode, so a busy port fails instead of replacing a server.

Actual export invocation used the equivalent direct workspace entry point:
`PIPELINE_DATA_ROOT=data/bo-005p-viewer node --import tsx pipeline/src/export.ts piazza-maggiore --local-preview`.
No normal `scene`, `ground`, `render`, `publish`, `deploy` or painting command was run for this spike.

## Browser acceptance and screenshots

[QA JSON](bologna-viewer-qa.json) records the full checks, requests, loaded bytes, links, view poses,
timing observations, screenshots/hashes, preserved data and manual-review flags.
[Engineering JSON](bologna-viewer-engineering.json) captures actual command exit statuses/logs.

|Acceptance|Result / evidence|
|---|---|
|Initial Bologna view|PASS: tiles fully load, frozen camera matches and no analytics script is present|
|Pan / wheel zoom|PASS: real mouse drag changes center; wheel changes zoom|
|Three meaningful levels|PASS: overview 1200 m, medium 520 m, close 200 m across desktop viewport|
|Touch|PASS: Chromium emulated pinch and single-finger pan change zoom/center; mobile credits wrap without horizontal overflow|
|Reload / share link|PASS: existing `#@x,y,zoom` survives reload within 2 art pixels and 0.02 zoom; `?at=lat,lon,km` also works|
|Raw render toggle|PASS: existing `P` control loads the local photo layer|
|Attribution|PASS: visible OSM, CTC/tree CC BY, Copernicus and conditional appearance-reference links, with no occlusion; OSM click event verified|
|Video credit mode|PASS: `V` retains active municipal/OSM notices and exact Copernicus text|
|Conditional references|PASS: browser-only metadata fixture omitting the BO-003F notice removes appearance-reference credits; no source/export file modified|
|Required network / console|PASS: no failed required assets, uncaught errors, console errors, external requests, production API or animation-data requests|
|Other configured routes|PASS: Tel Aviv/Stuttgart routes remain present and show local-unavailable UI in isolated mode; normal static build includes both|
|Zagreb|NOT_TESTED / NOT_CONFIGURED in actual repository source|
|Independent human acceptance|**NOT_TESTED**; agent image review is labelled separately|

Screenshots are raw browser captures including visible source notices:

- [Overview](bologna-viewer-overview.png) — full ten-tile patch, intentional corner cells and finite boundary.
- [Medium](bologna-viewer-medium.png) — Piazza Maggiore and surrounding procedural blocks.
- [Close](bologna-viewer-close.png) — retained church massing, original render resolution and portico context.
- [Touch](bologna-viewer-touch.png) — 390×844 emulated touch viewport and wrapped clickable credits.

Agent review finds consistent tile order/orientation, uniform scaling and no internal grid bars or
unexplained holes. The outer staircase/corners and panning into dark space are intentional boundaries
of the small test patch. Close overzoom reveals existing coarse geometry and source raster limits;
this spike does not repair those through geometry fitting or painting. Mobile attribution occupies
several lines by design to keep required notices readable. Independent human visual review remains open.

The first screenshot review caught the default Astro dev toolbar obscuring part of the footer.
It is now disabled **only** for local previews; all credit-link hit areas are checked unobscured.
The toolbar remains at its normal default for other development sessions.

External credit destinations are checked for correct URL, visibility and clickability; an intercepted
OSM click proves the link receives input without leaving the local-only test. External HTTP status is
**NOT_TESTED**, not silently counted as successful. The three reference authors and CC BY-SA 4.0 links
are activated only by the existing BO-003F attribution marker. No new source or licence is introduced.
Copernicus has a clickable source link and its full exact credit is visible in local mode and video mode.

## Asset QA and observed performance

All **140 AVIFs** decode at 512², have opaque pixels, correct codec and matching hash-index entries.
Sparse coordinates are independently derived from the ten original tiles at every level z2–z8.
The absent corner cells are never requested as required tiles. All **66 native web-tile boundaries**
pass the seam rule `edge MAE > max(20, 3×adjacent interior MAE)`; maximum observed edge MAE is
**18.481**. Worst native AVIF RGB error relative to its source crop is **4.570 /255**, consistent
with lossy encoding and well below the check's 15/255 darkening/distortion threshold.

The QA file distinguishes the **146 available region files** from the subset loaded by actual
navigation. The final browser run loaded **60 unique tile URLs**, with repeated requests across
desktop gestures, reloads, touch, other-route and conditional-credit fixture checks. Timing and byte
observations are recorded with their exact basis; they are not performance targets or WAN benchmarks.
The dev server was warm and Chromium contexts fresh, on loopback. Development module payload is
substantial compared with map assets; production bundle behavior is not inferred from dev transfers.
JS/GPU memory and frame-rate profiling are **NOT_TESTED**; no stall was observed during these gestures.

The final run observed first paint/contentful paint at **1004 ms** and its first tile-drawn event at
**1006.1 ms** after navigation. Across the complete scenario, **256 responses** contained
**21,356,490 decoded body bytes**, including **1,761,642 bytes** from 161 region responses;
140 tile responses included repeat requests. These are separate observations, not interchangeable
definitions of a completed view. The browser-only fixture is explicitly identified as a synthetic
metadata response. Detailed resource timings remain in the QA JSON.

Browser coverage is installed Chromium with AVIF support and emulated touch. Real mobile hardware,
Safari/Firefox and older browsers without AVIF support are **NOT_TESTED**. The isolated export does
not include a WebP fallback pyramid; the existing viewer's legacy fallback cannot provide those
missing assets in this local-only session.

## Engineering, failures and command record

**38 relevant tests pass** (34 existing Bologna/geometry/coverage tests +4 local-viewer integration
tests). Pipeline TypeScript, **web TypeScript**, strict QA-script TypeScript, normal five-page Astro
build and `git diff --check` pass. The separate negative build test returns expected exit **1** with
`LOCAL_MAP_ROOT is dev-only`; that is a tested guard, not a hidden build failure.

The persistent `ImportMeta.env` TS2339 is **fixed** with canonical
`web/src/env.d.ts` → `/// <reference types="astro/client" />`. The installed Astro client types
already import Vite's ImportMeta definitions; no broad `any`, `@ts-ignore`, or replacement interface
was added. See [Astro's environment typing documentation](https://docs.astro.build/en/guides/environment-variables/).

Executed inspection used `pwd`, `git status --short --branch`, `git log -3 --oneline`, `rg`, source
reads, file inventories/hashes and process inspection. The implementation was based on actual
export/paths/hosting code, Astro routing, component preloads and OpenSeadragon source; no guessed route
or CLI from older conversation was used. Further commands:

```sh
# Export and start commands are listed above.
node --import tsx docs/bologna-viewer.test.ts
node_modules/.bin/tsc --noEmit -p pipeline
node_modules/.bin/tsc --noEmit -p web
node_modules/.bin/tsc --noEmit --target es2022 --module esnext --moduleResolution bundler --allowImportingTsExtensions --strict --skipLibCheck --types node docs/bologna-viewer-browser.ts docs/bologna-viewer-prepare.ts docs/bologna-viewer.test.ts docs/bologna-viewer-check.ts docs/bologna-viewer-checksums.ts
node --import tsx --test pipeline/src/bologna.test.ts pipeline/src/bologna-architecture.test.ts pipeline/src/bologna-fidelity.test.ts docs/bologna-coverage-qa.test.ts docs/bologna-architecture-qa.test.ts docs/bologna-viewer.test.ts

# Set CHROME_PATH only if your installed Chromium differs from Playwright's known executable.
node --import tsx docs/bologna-viewer-browser.ts http://127.0.0.1:4375 --agent-reviewed
# An actual static-build regression using only the task's local asset server:
LOCAL_MAP_ROOT= TILES_ORIGIN=http://127.0.0.1:4375 npm -w web run build
# Captures real test/typecheck/build/guard/diff results and verifies preservation/screenshots:
node --import tsx docs/bologna-viewer-check.ts
git diff --check
node --import tsx docs/bologna-viewer-checksums.ts
```

The browser used installed Playwright Chromium with SwiftShader, `--no-sandbox` and
`--disable-dev-shm-usage`. Actual calls supplied its installed executable through `CHROME_PATH`;
the QA script also resolves Playwright's executable by default. Tool sandbox approval was needed
for the dev server, browser and child-process test runner. The first sandbox dev launch exited before
readiness; the approved retry started the task-owned server. No dataset/cache was deleted to recover.

One extended browser attempt failed because its own early auxiliary-tab closure caused three
`net::ERR_ABORTED` speculative module preloads. The harness was corrected to keep those pages alive
until teardown. Active-session failures remain a strict gate; expected teardown cancellations have
a separate recorded array. The final run passes with no active failed requests. This failure history
is retained in QA JSON. No failed test was relabelled as a pass without correction and rerun.

Exact final engineering invocations, expected/actual exit codes and stdout/stderr log hashes are in
`docs/bologna-viewer-engineering.json`; logs remain under `data/bo-005p-viewer/checks/`.
Successful normal build emits `/`, `/404`, `/bologna`, `/tel-aviv-yafo`, `/stuttgart` into ignored
`web/dist`. It was not deployed. No paid service, public upload, R2 write or VPS configuration occurred.

## Files and handoff

Modified tracked files:

- `README.md` — local-only start/export instructions and link to this report.
- `pipeline/src/export.ts` — opt-in static local export, no remote read/fade, source-preserving metadata.
- `web/astro.config.mjs` — configurable cache root, no-fallback route, dev-only guard, local toolbar off.
- `web/src/components/MapPage.astro` — local SSR preloads/unavailable states, preview label, mobile credits.
- `web/src/scripts/map.ts` — declared feature flag stops animations; full linked terrain credits.

New untracked source/tests (include these; `git diff` alone omits them):

- `pipeline/src/export-mode.ts`
- `web/local-map.ts`
- `web/src/env.d.ts`
- `docs/bologna-viewer.test.ts`
- `docs/bologna-viewer-prepare.ts`
- `docs/bologna-viewer-browser.ts`
- `docs/bologna-viewer-check.ts`
- `docs/bologna-viewer-checksums.ts`

New untracked evidence:

- `docs/bologna-viewer-spike.md`
- `docs/bologna-viewer-inputs.json`
- `docs/bologna-viewer-qa.json`
- `docs/bologna-viewer-engineering.json`
- `docs/bologna-viewer-checksums.json`
- `docs/bologna-viewer-overview.png`
- `docs/bologna-viewer-medium.png`
- `docs/bologna-viewer-close.png`
- `docs/bologna-viewer-touch.png`

The original untracked task plan is untouched. Generated copies, tile pyramid, pending export state,
server marker and command logs live only under the new ignored root. The [checksum manifest](bologna-viewer-checksums.json)
includes these outputs, screenshot evidence and all new/changed source files; the original input
inventory remains separate and unchanged. No auto-commit, source-render mutation, data deletion,
painting, publishing, deployment, traffic/birds/transit work or follow-up phase was performed.
