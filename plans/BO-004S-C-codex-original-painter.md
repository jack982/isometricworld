# BO-004S-C — Original Codex CLI painting pilot

**Project:** Isometric Bologna  
**Execution:** Codex CLI, authenticated with ChatGPT, using Codex's integrated image tool, **not** OpenAI Images API  
**Scope:** one existing 1024×1024 painting window, `(-1,-1)`  
**State:** implementation and verification task; live invocation must be a deliberate, separate operator action  
**Outcome:** one raw painted candidate, side-by-side comparison, QA and GO / REFINE / NO-GO recommendation

## Why this task

The procedural map and local navigable viewer (BO-005P) work. BO-004S Gate B produced a validated input window (`-1,-1`), the four input assets and Bologna-specific prompt. BO-004S-B1 prepared an optional Images API runner, but we now **prefer the project's original Codex CLI path** to test the included ChatGPT allowance before introducing separately billed providers.

The public fork's `pipeline/src/paint.ts` calls `codex exec` with four images and stdin prompt. However, its `paintWindow()` has up to **three application-level attempts** and quota backoff. Invoking that full runner unchanged is **not** an acceptable one-attempt pilot. A single `codex exec` process is the intended compromise: it prevents application-level retries but **does not guarantee** that the internal image tool is invoked exactly once. That residual risk must be shown to the human operator before execution.

## Invariants

1. Read `AGENTS.md`, current `pipeline/src/paint.ts`, `docs/bologna-paint-preflight.md`, `docs/bologna-paint-feasibility-report.md`, `docs/bologna-paint-api-preflight.md` (if present), and the already-prepared Bologna prompt and asset manifest. The **local checked-out code is authoritative**; do not assume public `main` exactly matches this branch.
2. Keep the frozen Bologna region/camera/bbox, BO-001/BO-002/BO-003/BO-003F/BO-005P outputs, raw snapshots, hashes and local viewer unchanged. No deletions, replacements, automatic commits, export, publish or deployment.
3. **Never use `OPENAI_API_KEY` or the Images API or an external paid image provider.** Verify Codex's current authentication route is ChatGPT login without printing tokens or secrets. If that cannot be verified, stop.
4. Preserve the original painter. Add a small isolated pilot helper only if needed; do not remove or weaken the pre-existing B1 safety blocker. Any override must be an explicit **new** operator choice, not reuse an old approval hash.
5. Prepare inputs only from existing validated BO-004S snapshots, not re-rendered or AI-transformed versions. Validate 1024×1024 image dimensions and hash against Gate B. `prompt.txt` should be the pre-existing Bologna-specific prompt; retain current style and tree reference images as **appearance-only** references (not as Bologna architectural/botanical evidence).
6. **Maximum one outer `codex exec` process** during the whole pilot; zero automatic retries, concurrency 1, no fallback model/provider, no automatic next windows, and no background resumption. A failure/timeout/invalid image ends the experiment.
7. No new images until the human operator manually executes a single clearly presented command acknowledging that **the number of internal image-tool invocations cannot be hard-capped**.
8. Keep the raw returned image unchanged, even if QA fails. Record stdout/stderr logs with credentials redacted.

## Gate 0 — Short preflight (no image generation)

- Confirm repo branch/status, Node 24+, Codex CLI installation and ChatGPT-login authentication (`codex login status` or available equivalent), and show the operator how to inspect allowance with `/status`.
- Inspect the exact `codex exec` invocation, working-directory sandbox and attachment flags supported by the **installed** CLI. The known original command uses `codex exec --skip-git-repo-check -s workspace-write -C <workdir> -i input.png -i height.png -i style.png -i trees.png -` with prompt on stdin, but validate against local `codex exec --help`.
- Locate the four prepared inputs, prompt and manifest. Produce `docs/bologna-paint-codex-preflight.md` listing paths, SHA-256, asset dimensions, CLI version, and any material discrepancies.
- Verify no old painted output is overwritten; choose a newly created output root, e.g. `data/bo-004s-codex-native/`.
- Confirm the selected target is `(-1,-1)` and that the reference prompt clearly forbids the model from importing Tel Aviv coastline, modern towers, palms, or guessed Bologna architectural elements.
- Inspect current painting QA/registration tools and identify read-only checks that can run on the new image.
- If native image generation is unavailable under ChatGPT login or needs separately charged API credentials, stop and report this without invoking a provider.

## Gate A — One-invocation pilot helper (offline)

Implement the smallest isolated helper needed to:

- copy/stage `input.png`, `height.png`, `style.png`, `trees.png` and `prompt.txt` into a **new** pilot directory;
- validate the above hashes before allowing the call;
- invoke the same Codex CLI image workflow as the original painter, **exactly once at the outer process level**;
- request a single 1024×1024 opaque `out.png` via the pre-existing Bologna prompt;
- stop on missing output, timeout, quota rejection or any QA failure **without retrying**;
- keep `raw.png`, generated logs and QA artifacts without modifying production tile directories;
- require an explicit execution flag distinct from a dry run. A flag name such as `--acknowledge-internal-call-risk` is suitable. It must not be automatically passed by tests or the preparatory Codex agent.

Test offline with a mocked CLI executable: spawning once; non-zero exit; no generated image; timeout; corrupt PNG; hash mismatch; missing ChatGPT auth; wrong window; repeated invocation attempt. The mock must not launch a real image generator.

**Important:** one OS child-process invocation is a best-effort usage bound, not a provider-side spending ceiling and not proof of one internal tool call. Do not describe it as such.

## Gate B — Operator handoff (STOP before live)

Produce an **exact ready-to-run command**, with current paths, one isolated output directory, and the explicit acknowledgement flag. Keep it in `docs/bologna-paint-codex-preflight.md`, not in a background task.

Document next to that command:

- what Codex allowance the image may consume, with `/status` checked by the operator;
- that ChatGPT-plan use generally does not create a separately billed Images API request, but allowance and possibly purchased ChatGPT credits are consumed;
- that internal image tool calls cannot be strictly counted or bounded by this wrapper;
- the failure-stop policy and the file expected on success;
- that running the command is the operator's conscious authorization for this **one experiment**.

**The preparatory Codex agent must STOP here.** Do not run the live command as part of its preparation task.

## Gate C — Live one-window run (separate operator action)

Only after reviewing Gate B, the operator may execute the prepared command on their own terminal. The runner must call the original Codex CLI image workflow, not `client.images.edit()` and not the API runner from BO-004S-B1.

Do not assume a successful result. If no image is produced, record and stop. No automatic second attempts, even on poor quality or quota errors.

## Gate D — Post-run evaluation (offline)

If a single image was actually generated:

1. Compare `input.png` and `raw.png` at identical size and crop. Create side-by-side and optional transparency/edge-overlay comparisons. Do **not** retouch the image before assessment.
2. Review unchanged footprint/road layout, San Petronio roof/courtyards, Palazzo d'Accursio, portico opening, street widths, tree locations, image opacity, absence of invented buildings/towers and appearance of the Bologna palette.
3. Record edge similarity and any displacement, but do not treat a single automated edge metric as proof of architectural accuracy.
4. Evaluate artistic quality **and** geometric consistency separately, with human confirmation required.
5. Classify result:
   - **GO:** style improved substantially, geometry is mostly preserved, no critical fabrication. Next test: two adjacent windows for seams.
   - **REFINE:** aesthetically useful but introduces material/roof/portico distortions. Next: adjust Bologna-specific references or prompt and consider procedural material improvements.
   - **NO-GO:** major geometry distortion, bad quality or no reliable generation path. Next: prioritize procedural shader/material tasks.
6. Log elapsed time, visible Codex allowance change if known (do not guess or equate usage with USD), CLI/image-tool outcomes and exact files created.

Outputs: `docs/bologna-paint-codex-result.md`, `docs/bologna-paint-codex-qa.json`, `docs/bologna-paint-codex-comparison.png`, raw output in isolated `data/` folder. No publication or production import.

## Done criteria

- Gate 0/A/B provide a reproducible **non-generating** preflight, explicit operator live command and mocked negative-path tests.
- Gate C, if separately invoked by operator, launches **at most one outer** Codex CLI process.
- Gate D has an independently reviewable image+report or a transparent failure note; no false GO conclusion.
- Existing baseline and viewer remain unchanged; source diff and tests pass; no commit.

---

# Conditional procedural rendering backlog (only if needed)

Do **not** implement these tasks during BO-004S-C. Prioritize based on the painted-vs-procedural result. Each is designed as an isolated sprint with before/after artifacts and regression checks.

| Task | Focus | Concrete scope | Acceptance |
|---|---|---|---|
| **BO-006P0** | Visual benchmark & palette | Capture 3 reference views and 3 deterministic procedural views; define Bologna color/material palette, image-based acceptance criteria | Repeatable visual benchmark and documented material assumptions |
| **BO-006P1** | Roof materials & patterns | Terracotta tile shader/texture variations, ridge/eave shading, procedural wear by broad typology; respect existing verified roof planes and CTC volume IDs | More believable Bologna roofscape at overview and medium zoom; no height/footprint changes |
| **BO-006P2** | Façade materials | Warm plaster, brick and stone texture atlas, restrained wall detailing, deterministic variation; avoid inventing monument-specific features | Less generic facades without geometric drift or arbitrary historic ornamentation |
| **BO-006P3** | Streets, piazzas, porticoes | Stone paving and asphalt scales, improved kerbs, open portico lighting/shading; no filled voids | Better Piazza Maggiore sense of place; all pedestrian and portico clearances retained |
| **BO-006P4** | Vegetation | Temperate deciduous species families, canopy variation using available municipal height classes; no palms as default | Natural-looking, correctly located and plausibly sized trees; no extra tree creation |
| **BO-006P5** | Lighting, ambient occlusion & consistency | Calibrate directional light, AO, saturation and antialiasing for isometric views; avoid hard cast shadows across tile edges | Consistent visual tone and no tile seams at overview/close zoom |
| **BO-006P6** | Tile QA, performance & browser A/B | Stable material seed per building ID, pixel seam QA, GPU/SwiftShader validation, integration into 140 AVIF preview tile viewer | Reproducible tile sets, browser pan/zoom/touch performance and no baseline regressions |

## Decision rule

- If the **AI result is strong**: do **not** build all procedural shaders; make only minimal geometry/material fixes and test two neighbouring paint windows for seam continuity.
- If the **AI result is mixed**: target the highest-value 1–2 procedural tasks and recompare before choosing the final production pipeline.
- If the **AI result fails**: build P0 → P1 → P3 → P2 → P4 → P5 → P6, reviewing after every two sprints. Do not automatically launch all seven.

## Upstream and licensing

Preserve independent Bologna configuration/adapters and original `paint.ts` behaviour by default. Keep AI-painted outputs and license attribution distinct from OpenStreetMap ODbL, Comune di Bologna CC BY 4.0 and Copernicus DEM licence terms. New textures must have a documented permission/licence suitable for redistribution and eventual upstream contribution. Never copy protected art assets from the live Isometric World website without permission.
