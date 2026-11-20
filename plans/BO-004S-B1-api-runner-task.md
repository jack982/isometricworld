# BO-004S-B1 — One-request Images API painting runner (PREPARATION ONLY)

## Mission

Implement an **optional** image-editing runner for the BO-004S Bologna pilot window `(-1,-1)` and stop after a verified, nonbillable preflight. The original `pipeline/src/paint.ts` and `docs/bologna-paint-live.ts` (currently fail-closed) must remain unchanged. Do not invoke a paid generation, upload input images to a provider, publish, deploy, delete previous data, or commit.

Repository branch: `feature/bo-004s-paint-feasibility`. Use Node 24 and inspect `AGENTS.md`, `docs/bologna-paint-compatibility.md`, `docs/bologna-paint-preflight.md`, `docs/bologna-paint-feasibility-report.md`, `docs/bologna-paint-input-manifest.json`, and existing `docs/bologna-paint-*.ts` first. Verify existing source snapshots and 1,410 protected-file pins before working. Keep the frozen region/camera unchanged.

### Frozen input contract

- Region/area: Bologna / `piazza-maggiore`.
- Window: `(-1,-1)`; painter grid 1024 px, stride 896, overlap 128.
- Isolated source: `data/bo-004s-paint/input/` containing `input.png`, `height.png`, `style.png`, `trees.png` in that order.
- Full original prompt: `BOLOGNA_PROMPT` in `docs/bologna-paint-support.ts`, or verified equivalent saved in `data/bo-004s-paint/prompts/prompt.txt`.
- Preserve all image bytes and SHA-256 hashes. Do not attach QA overlays or photography.
- The previous manifest SHA-256 (`449ae54fa10c297e2fdeabcbaa197d9f4ae562fb02c59149a0a84dfc2cef849d`) is **not a live authorization** for the new runner.

### Stage 1 — API capability and costs, no provider calls

1. Inspect **current** official Images API documentation, image-edit endpoint, supported model(s), support for four reference images, square 1024 px output, image input fidelity, quality, PNG output and single result `n=1`. Do not blindly reuse a legacy image model. Start by checking `gpt-image-2.6-sunburst` for precise editing, but select only a genuinely supported model/parameter combination and pin the exact model identifier (dated snapshot if supported). Report the actual version of the SDK used.
2. Confirm API access is a separate billing path from a ChatGPT/Codex login. Verify pricing with an authoritative current source and write a conservative cost estimate for **one** request with four images, including any uncertainty. Do not claim an enforceable dollar ceiling from `n=1` alone.
3. Inspect the actual local files (`file` and `sharp`) and ensure all model inputs meet limits. Do not display, log, or copy API keys. Only check key *presence*; an absent key is not a blocker to mocked preflight.
4. Adapt the existing prompt for a direct editing API: remove instructions aimed at an autonomous built-in image tool, while preserving geometry, void, monument, reference-image and no-hallucination constraints. The server request must not attach captions, credited proof JPG or the QA overlay.

### Stage 2 — Isolated execution boundary

Create a new, opt-in TypeScript runner under `docs/` (for example `docs/bologna-paint-api-live.ts`) and a pure preflight (`docs/bologna-paint-api-plan.ts`). Do not modify the normal multi-city painter.

Live runner requirements:
- Send at most **one application-initiated HTTP request** to the image-edit endpoint, using the four named PNG inputs and one output. Set `n=1`; set `maxRetries: 0`; disable SDK/client/proxy retries and any automatic model/provider fallback in controllable layers.
- Refuse attempts/workers greater than one, alternate windows, bulk flags, unspecified models, unsafe paths, pre-existing output destinations, expired/mismatched authorization and changed input hashes.
- Use a pre-execution, append-only attempt ledger (mark `ATTEMPT_STARTED` immediately before network I/O). If the response times out or fails ambiguously, do not retry that attempt or silently switch models. Treat every network attempt as potentially billable.
- Save the raw result once under a **new** isolated run directory, plus response metadata (model, request ID if returned, usage if returned, UTC time, input/output hashes, errors); never put secrets in metadata. Do not silently replace or register outputs; no second request on QA failure.
- Pin the exact model, request parameters, prompt hash, four input hashes, runner source hash, approval time/expiry and intended request count into a **new** approval manifest. The existing BO-004S approval hash must become invalid.
- Use a separate explicit user approval step: implement and test the runner **without** running it. Print an exact proposed command and stop with a status of `PENDING_OPERATOR_APPROVAL`.
- Clearly describe the guarantee correctly: one application-initiated request, not a provable single internal provider operation or a guaranteed final charge.

### Stage 3 — Offline negative tests and QA design

- Use a fake/mocked HTTP transport to assert exactly one outbound attempt for success, timeout, HTTP 4xx/5xx, invalid response, malformed PNG and ambiguous network disconnect. Test that no automatic retry, fallback or second request occurs.
- Verify approval mismatches, stale expiration, source/prompt/runner modifications, symlink tricks, already-existing run folder, absent credentials, unsupported quality/size/model and partial results all fail closed.
- Validate source provenance/credits; preserve all old hashes and the BO-005P viewer, including 1,410 protected files.
- Add a planned **post-generation** QA script (not executed live) comparing raw PNG to input: dimensions/opacity, image alignment/registration, road edges, roofs/footprints, courtyard voids, portico gap, tree locations, colour/style and newly invented objects. Include the nine existing QA anchors. Preserve both raw and registered images for independent human review.
- Run the full relevant TypeScript, offline tests and `git diff --check`, with no paid requests.

### Handoff and STOP

Produce `docs/bologna-paint-api-preflight.md` and `docs/bologna-paint-api-qa.json`, documenting: all changes, the exact image model & supported request parameters, current published pricing and an estimated one-request cost, how to supply credentials safely, all input/prompt/runner hashes, command for **one** future live run, approval expiry, error/retry policy, safety tests and limitations.

**STOP at this point.** Do not invoke OpenAI Images API, Codex native image generation, fal or any other paid service. Do not produce images or deploy. Await a **new explicit user authorization** tied to the final pinned manifest and command.

## Acceptance criteria

1. Exactly four existing source images are validated and not modified.
2. Dry-run and mocked HTTP transport tests pass and prove no more than one client-side HTTP request per authorized attempt.
3. Billing/model uncertainty is documented rather than concealed.
4. All pre-existing baseline hashes remain identical; no code outside the isolated spike is modified without explicit justification.
5. No live request, no output generation, no publication, no commit.
