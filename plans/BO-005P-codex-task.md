# BO-005P — Local navigable viewer spike (Codex CLI)

## Objective

Turn the currently best accepted Bologna **procedural** pilot into a locally navigable map, to validate the actual end-user experience (zoom, pan, tile loading and attribution) before committing to citywide painting or more speculative geometry.

This is a limited, local-only spike. Do **not** publish, deploy, upload to R2, turn on paid services, AI-paint any tiles, or make unrelated changes.

## Context to read first

- Repository `AGENTS.md` and `README.md`; `ATTRIBUTION.md`.
- `docs/bologna-landmark-fidelity-report.md`, `docs/bologna-landmark-fidelity-qa.json`, `docs/bologna-architecture-audit.md` and relevant earlier BO-001R/BO-002 reports.
- The actual implementation of pipeline `export`/tile manifest and Astro/OpenSeadragon viewer and routing. Do not infer routes or scripts from earlier conversation if the source differs.
- Existing pipeline output roots `data/bo-003f-landmarks`, `data/bo-003-architecture`, and previous baselines. Identify the **best present complete usable render** and use it without modifying its scene/ground/tiles.

## Gate 0 — Safety, reproducibility and baseline selection

1. Inspect `git status`, current branch, tracked/untracked changes and active render jobs. STOP on ambiguous workspace state and report it; do not delete caches.
2. Inventory files and hashes for chosen color/height tiles and manifest. Verify all expected tile coordinates, alpha and source attribution. The two blank upper-corner canvas cells are known to lie outside the manifest and must not be treated as missing tiles.
3. Create a **fresh isolated** output location e.g. `data/bo-005p-viewer` (or a proven existing export-safe location); do not rerun an in-place script that wipes scenes or replaces preserved baseline assets.
4. Record in a short report which source snapshot, output root, config and fixed Bologna camera are used.

## Gate A — Local export and viewer boot

1. Read the repository export workflow, then produce the necessary tile pyramid/AVIF and `world.json`/manifest for the Piazza Maggiore Bologna test area **only**. Adapt to current scripts and documented options rather than inventing CLI commands.
2. Serve tiles **locally** via an appropriate static server or local route. Avoid remote Cloudflare credentials and assume neither R2 nor Workers are available.
3. Make the existing Astro/OpenSeadragon application load the Bologna region from the local asset origin in dev mode. Do not hardcode a user's local file path or break Tel Aviv/Stuttgart/Zagreb routes/configurations.
4. If the viewer expects a published full-world layout, implement the smallest configurable dev-mode asset override and document it. Keep this override isolated and upstream-friendly.
5. Resolve the persistent `web/src/scripts/map.ts` `ImportMeta.env` TS2339 with the canonical Vite/Astro typing/configuration for the installed toolchain. Avoid broad `any`, `@ts-ignore`, or blind declaration hacks. Confirm `tsc --noEmit -p web` passes.

## Gate B — Functional acceptance

Use browser automation/screenshots if locally available, plus manual checklist:

- Open Bologna at its initial viewpoint; tile pyramid loads and camera orientation matches the frozen render.
- Pan and zoom at three meaningful levels; verify no broken grid borders, stretching, unusual blank patches or incorrect tile order.
- Test pointer/mouse wheel, touch or emulated touch if available, and browser reload.
- Test a shareable deep link including location/zoom if supported by viewer; if absent, note the gap and implement only a modest optional mechanism if safe.
- Check console/network: no missing required assets or uncaught errors; no unexpected production API calls.
- Verify visible, clickable, accurate OSM/municipal/Copernicus credits; appearance-only reference credits are conditional on using BO-003F.
- Measure first visual response and loaded asset byte counts as observations (do not fabricate targets or benchmarks); note large memory or performance issues.
- Check other-city routes/configurations via tests/build if feasible; no destructive reload of their datasets.

## Gate C — Deliverables and tests

Produce:

- `docs/bologna-viewer-spike.md`: exact commands, chosen input root/version, generated outputs, URL/route, known limitations, full QA and screenshots.
- At least three screenshots `docs/bologna-viewer-{overview,medium,close}.png` (or document why screenshots are unavailable).
- `docs/bologna-viewer-qa.json`: expected/loaded asset counts, screenshots/hashes, link checks, console errors, and manual acceptance with PASS/FAIL/NOT_TESTED flags. Do not mark an agent's own visual review as independent human acceptance.
- Reproducible dev start/stop commands that do not require R2 or Cloudflare account.
- Source code and tests for necessary viewer/export integration, minimally invasive and documented.

Run the project test suite relevant to changed files, `pipeline` and `web` TypeScript checks and `git diff --check`. Summarize updated/added/untracked files and whether baseline inventories remain unchanged. Do not auto-commit. Do not do AI painting, remote publish, public upload or VPS configuration.

## Non-goals

No live TPER/GTFS integration, Umami tracking, traffic or birds yet. No new surveyed-monument claim, facade invention, roof fitting, camera rotation or source GIS acquisition. This task answers: **is our current Bologna map actually navigable in a browser and what breaks at different zoom levels?**

## Follow-up options (do not execute)

- `BO-004S`: controlled single-tile AI painting feasibility, with anti-hallucination tests and explicit cost logging.
- `BO-005`: production hosting on Hetzner, versioned tiles in R2, private source snapshots and Umami.
- A separate bounded monument study only after sourcing credible measured geometry or carefully labelled manual reconstruction.
