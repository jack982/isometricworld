# BO-004S-B1 Images API runner — preparation only

**PENDING_OPERATOR_APPROVAL.** The optional runner and nonbillable preflight are implemented.
**No provider request, input upload or model image generation was performed.**
The original `pipeline/src/paint.ts`, native fail-closed `docs/bologna-paint-live.ts`, old manifest,
Bologna inputs and BO-005P viewer remain unchanged. No export, publication, deployment or commit.

Checkpoint `159f432`, current branch **feature/bo-004S-BE1-api-runner-task**, Node **v24.22.3** via
`nvm use 24`. The task names the earlier branch; work stayed on the user's actual current branch.
Initial working tree was clean. This is a new optional API path, not a change to the normal multi-city
painter and not a claim that Codex's native call-cap blocker was resolved.

## Verified model, parameters and billing

As checked on **2026-11-20**, the official [Sunburst model page](https://developers.openai.com/api/docs/models/gpt-image-2.6-sunburst)
lists **gpt-image-2.6-sunburst**, text/image inputs and the image-edit endpoint. It publishes only that
undated identifier, so no dated snapshot is invented. The exact identifier is pinned, but provider
behaviour behind an alias can evolve. Account access and remaining quota are **NOT_TESTED**.

The [image-edit API reference](https://developers.openai.com/api/reference/resources/images/methods/edit)
supports JSON with ordered `images` references, including base64 data URLs, and up to16 inputs.
This request embeds exactly4 existing PNGs in one POST, without a Files upload, image URL fetch,
mask or markup. Each data URL is below its 20,971,520-character limit; prompt length3504 bytes is
below32000. The original files are all smaller than5.2MB, and no image bytes/dimensions are changed.

Pinned request to **`https://api.openai.com/v1/images/edits`**:

```json
{
  "model": "gpt-image-2.6-sunburst",
  "n": 1,
  "size": "1024x1024",
  "quality": "high",
  "complexity": "medium",
  "output_format": "png",
  "background": "opaque",
  "stream": false
}
```

`input_fidelity` is deliberately **omitted**: the reference documents it for older models rather
than as a controllable Sunburst setting. No unsupported fidelity flag or guaranteed geometry fidelity
is asserted. The [generation guide](https://developers.openai.com/api/docs/guides/image-generation)
separates complexity from rendering quality. Medium complexity is a bounded experiment choice;
it does not guarantee preservation. PNG/opaque/high quality, square size and n=1 are explicit;
no auto model/quality/size, streaming, partial-image or animated output is enabled.

**SDK used: none.** The runner uses built-in Node HTTPS, version **v24.22.3**, with
`maxRetries:0`, maxRequests1, redirects0, a private non-reused agent,10-minute total timeout and32MiB
response limit. No dependency/package/lockfile was changed. Proxy environment settings and
`OPENAI_BASE_URL` cause refusal; there is no SDK, proxy, account probe, fallback or retry machinery.
The supported API JSON form avoids a multipart SDK dependency while retaining all4 originals.

API usage has a separate authentication and billing path from a ChatGPT/Codex login.
[ChatGPT Plus does not include API usage](https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus).
Some Pro/Business subscriptions can claim [separately activated API credits](https://developers.openai.com/api/docs/guides/chatgpt-api-credits);
no eligibility, credit balance or funding is assumed. Only credential presence was checked:
**OPENAI_API_KEY absent**, proxies absent, custom endpoint absent. That does not block mocked QA.

[Current standard pricing](https://developers.openai.com/api/docs/pricing), consistent with the model
page: **text input $5/M tokens, image input $8/M, image output $30/M**. No cache/batch discount assumed.
For one request with all4 images, deliberately generous planning scenarios are:

|Scenario assumptions (not observed usage)|Estimated USD|
|---|---:|
|4000 text input +20000 total image input +5000 image output tokens|$0.33|
|4000 text input +100000 total image input +20000 image output tokens|$1.42|

A **$1.50 planning allowance** is conservative under these assumptions, **not an enforced ceiling**.
Actual token usage, charges, taxes, access and account-specific discounts/credits are unknown and
can lie outside this interval. Neither n=1 nor one application request caps internal provider work
or the final charge. Older-model fixed per-image tables and the calculator's default setting are
not substituted for this selected high-quality request. [Research record](bologna-paint-api-research.json)
pins sources, assumptions and the cost formula. Future response token usage is recorded if supplied;
actual billed dollars remain unknown unless independently reported, even on timeout/error.

## Frozen input and prompt contract

Bologna / `piazza-maggiore`; window **(-1,-1)**;1024-pixel window,896 stride,128 overlap;
global x/y **[-896,128)**. Source tiles (-1,-1),(0,-1),(-1,0),(0,0) cover it fully.
The normal BO-003F crop is used; no source/scene/ground/height was rerendered and no viewer AVIF
was substituted. All frozen region/camera/ENU/geoid/bbox settings are unchanged.

Attachments, in this exact order:

|Input|Dimensions|Bytes|SHA-256|
|---|---|---:|---|
|`data/bo-004s-paint/input/input.png`|1024×1024|1,103,640|`4fe7341333fb3be87eb2750617d62de9ebbb95fc662a367b14619259492da2b0`|
|`data/bo-004s-paint/input/height.png`|1024×1024|388,406|`4f82a0825746efd275e623c8e066c1e0c85236e726a902ec27118ec7800ce6a2`|
|`data/bo-004s-paint/input/style.png`|2048×1024|5,161,730|`1baa9abbe2add8284933c6b29976036e9af4c4926ab4bf00859fb24a4a2ed97f`|
|`data/bo-004s-paint/input/trees.png`|1024×1024|2,084,513|`eb78909ec5679f4a26def56e3179a731b59caaef9a5127007affc99b168c3fee`|

Adapted direct-edit prompt: **`data/bo-004s-api-runner/prompt.txt`**; SHA-256
**`49226438e9fd1d713ffc4f0349eba8ca2fb011154a1e8ceaeed9dbbbca71fdad`**. The original prompt is unchanged. Adaptation removes the
autonomous-tool/retry/file-copy instructions and retains every interior image description,
regional material hypothesis, geometry/void/road/roof/portico/tree constraint, back-facing-facade
warning and ban on invented monument/clock/chapel/traffic detail. The direct request asks only for
one image response; it does not instruct a model to execute shell/file operations.

Only the4 uncaptioned original PNGs are attached. No credited proof, QA overlay, photo or new
style sheet is sent. Original licences and notices are embedded in the approval manifest's
references: OSM ODbL, municipal CTC/trees CC BY4, exact Copernicus notice, existing project style
CC BY4 and inherited BO-003F appearance-only notices. Future proofs must retain those notices and
identify AI painting. No new geographic or reference source is activated.

## New approval target and exact future command

Manifest: **[docs/bologna-paint-api-approval.json](bologna-paint-api-approval.json)**.
SHA-256: **`83446ca2785d8c51d1065b551ace11f094e4d649a6744ab21718f360a95be437`**.

The previous BO-004S SHA `449ae54fa10c297e2fdeabcbaa197d9f4ae562fb02c59149a0a84dfc2cef849d`
is explicitly rejected by this runner and is **not API authorization**. The new manifest pins
request parameters, runtime/policy,4 input hashes, adapted prompt, all execution-source hashes,
prior spike inventory, original manifest, provenance and proposed approval window.

Runtime sources pinned by this approval (all are rechecked before execution):

|Source|SHA-256|
|---|---|
|`docs/bologna-paint-api-core.ts`|`ffb16c1b84ef592c38bdfb5d009b7083f06eb54bd6d76577df9f2bce1388764b`|
|`docs/bologna-paint-api-attempt.ts`|`73f3aa8ac5ff02d67bf887db902ec659cbb760615578ddc05d5b60e4f37c11a6`|
|`docs/bologna-paint-api-https.ts`|`2c6a570f336343eda76e7318a483289b0df0bf162a2da2acb0336353ed11ee5a`|
|`docs/bologna-paint-api-live.ts`|`9b633dc3c4a03a5e8ee5e134b8763036f878d99ad4185baf87e861b3643a3d49`|
|`docs/bologna-paint-api-plan.ts`|`72fa8ee4c2eb80a275456ca0d4e29a68d54f4923bf655ae2d0a1b1eeedf986f0`|
|`docs/bologna-paint-api-postqa.ts`|`cd82752f2f4656d1ea8d5211e1d1db3f229cf78c0d107719e3f473677a95007c`|
|`docs/bologna-paint-support.ts`|`25922e51bc84fd48ea7840fc8cc0b46df21206438afb92bf35c3ad873bfe883d`|
|`pipeline/src/camera.ts`|`e2fdac0e20bf9b0909bf75997d715191de1f589dfe1519a589e99876056444c2`|
|`pipeline/src/places.ts`|`3d3f0ed0de0e0f2d209f3874a0831ae574aec21b62f38a55010b2c8e415f2e98`|
|`pipeline/src/heights.ts`|`b6749a250e7c689cf2749285d6cd9c268f9813ee4525fd858687e2e2244ea9f5`|
|`pipeline/src/register.ts`|`095a9d801710a30b0066da6085e3530e543dda7d2275e6b5683a79334b41cde8`|
|`pipeline/src/paths.ts`|`60f1feae416be7396ea9c82d087fb1361c2248415dee30e6c198c287ef1ae25d`|

Proposed approval window starts **2026-11-20T12:04:22.801Z** and expires
**2026-11-21T11:04:22.801Z**. These are preflight proposal timestamps, not an observed human approval.
Actual command-entry time is recorded separately if later authorized. An expired preflight must
be renewed with new pins and a new explicit approval; it is never silently extended.

**Proposed command — NOT EXECUTED:**

```sh
node --import tsx docs/bologna-paint-api-live.ts --window=-1,-1 --model=gpt-image-2.6-sunburst --requests=1 --attempts=1 --workers=1 --approve=83446ca2785d8c51d1065b551ace11f094e4d649a6744ab21718f360a95be437 --approved-at=2026-11-20T12:04:22.801Z --expires=2026-11-21T11:04:22.801Z
```

This command must be approved **on a separate turn**, identifying its exact model/window/new hash
and one potentially billable application request. Do not run it merely because it appears here.
Unlike the native gate, this API entry point can perform a paid upload when explicitly authorized
and supplied with API credentials. Current absence of a key does not constitute a spending guard.

Set `OPENAI_API_KEY` securely in the operator's shell, never in chat, command arguments, docs,
logs or source control. For an interactive shell, a hidden input can be used:

```sh
read -r -s -p 'OpenAI API key: ' OPENAI_API_KEY
export OPENAI_API_KEY
```

No `.env` or Codex credential fallback is loaded by the API runner. Do not display the variable.
Unset proxy/custom-endpoint overrides if present; this spike does not support proxy-controlled
retries. Account permissions/funding must be checked by the operator without a trial generation.

Planned destinations, **currently absent**:

- `data/bo-004s-api-runner/attempt-ledger.jsonl`
- `data/bo-004s-api-runner/run-minus1-minus1/raw.png`
- `data/bo-004s-api-runner/run-minus1-minus1/metadata.json`
- After a separate offline post-QA step: `run-minus1-minus1/qa/registered.png` and `qa/qa.json`.

The base preparation root already exists; the run and ledger must not. Atomic no-overwrite creation,
regular-file/O_NOFOLLOW checks and symlink rejection protect output isolation. An append-only,
exclusively created ledger records **ATTEMPT_STARTED** and fsyncs the file and parent directory
immediately before transport. A crash, timeout, partial result, quota/rate error, HTTP failure,
invalid PNG, alpha hole or ambiguous disconnect consumes the attempt; no retry/resume, sleep,
model switch, repaint or second request follows. Existing run/ledger paths always refuse replay.

One private HTTPS request sends all4 inline images; responses/redirects never initiate another
request. Raw returned bytes are saved before image validation. Malformed raw PNG bytes remain for
diagnostics with a failure status. Raw output is never silently registered/replaced. Metadata
records requested/returned model when supplied, request ID, numeric usage if supplied, UTC times,
input/prompt/request/output hashes, status and sanitized errors. Arbitrary provider error text,
credential headers, response bodies and private configuration are not logged.

**Guarantee:** at most **one application-initiated HTTP request per pinned attempt**. This is not
proof of a single internal provider operation, no internal provider retry, successful geometry
preservation or a dollar ceiling. Every network attempt is treated as potentially billable.

## Offline verification and planned post-generation QA

[QA JSON](bologna-paint-api-qa.json) records **94/94 tests PASS**, comprising56 previous tests and38
new API tests. There are no skipped tests in the final run. Pipeline, web and spike TypeScript,
read-only preflight and `git diff --check` pass. All **1,410 protected prior files** and **77 BO-004S
spike files** match; protected-root membership is unchanged. Both painters, BO-005P assets and
old approval/QA/manifests were preserved. New handoff hashes: [checksums](bologna-paint-api-checksums.json).

Mocked success, timeout, rate/quota, disconnect, HTTP301/400/401/403/408/429/500/503, invalid JSON,
content type, partial/multiple/URL/base64 results, malformed PNG, wrong size, transparency and
unexpected model each cause at most one transport invocation, never another request or fallback.
Tests cover ledger-before-I/O, replay/overwrite refusal, symlink/dangling-link/parent tricks,
missing key, unsupported settings, old/wrong/expired approval, hash mismatch and secret redaction.
Success fixtures reuse existing input bytes; tiny invalid/alpha fixtures live under `/tmp` only.
No mock imports the real HTTP transport. A module-graph test checks that the pure preflight has
no HTTP/process/live-runner dependency; it also executes with filesystem writes and child-process
permissions disabled. Trusted native sharp requires `--allow-addons`; Node's warning about native
addons being outside its JS permission guarantees is retained.

`docs/bologna-paint-api-postqa.ts` is implemented but **not executed on provider output**. Its pure
metrics have identity/drift fixture tests. After a separately approved generation it validates raw
hash, dimensions/alpha, dark8×8 cells,4 exterior bands, colour statistics, raw/registered alignment,
registration correlation/offset/scale and all9 existing QA anchors. A greater-than4px anchor drift
triggers investigation; minimum correlation0.45 is only an engineering heuristic. Low-height edge
increase flags possible added structure but can also reflect texture; it is not a semantic roof mask.

Road/roof/footprint anchor metrics, courtyard voids, portico gap, tree positions, invented objects,
material plausibility and style must be compared against the input and existing QA-only overlay
by an independent human. Semantic topology/historical fidelity is **NOT_VERIFIED**, human visual
acceptance **NOT_TESTED**, automatic fidelity PASS **false**. Any added/removed/merged building or
road is a fidelity FAIL even if registration improves its score. Diagnostic registration writes a
new QA file, preserves raw bytes and raw drift, and cannot excuse hallucinations. One window cannot
certify painted-neighbour continuity. There is no aesthetic GO or historical-reconstruction claim.

## Commands, reproducibility and retained failures

Commands actually run included source/config/docs/process-safe file inspection, `git status/log`,
`file` on the4 inputs, Node/sharp validation and hashes, old nonbillable preflight, public official
web documentation reads and key-presence-only checks. No API authentication/model-list/quota
endpoint was queried. Main reproducible commands:

```sh
source /home/jacopo/.nvm/nvm.sh
nvm use 24
# Already completed once; refuses any existing root/approval file. Do not rerun here.
node --import tsx docs/bologna-paint-api-prepare.ts
# Safe to rerun: read-only, no provider import/request/upload/output creation.
node --permission --allow-fs-read=. --allow-addons docs/bologna-paint-api-plan.ts --dry-run
# Fixed local commands and injected mock transports; never calls the live entry point.
node --import tsx docs/bologna-paint-api-check.ts
node_modules/.bin/tsc --noEmit -p pipeline
node_modules/.bin/tsc --noEmit -p web
git diff --check
node --import tsx docs/bologna-paint-api-checksums.ts
# Future POST-GENERATION offline QA only, not run in this task:
# node --import tsx docs/bologna-paint-api-postqa.ts
```

QA JSON stores exact arguments, status and log SHA for each check; logs remain in the new root.
The sandbox test invocation initially reported only one file-level result, so it was not counted
as proof that the safety cases ran. Approved local child-process test execution produced the real
case results. An initial nonbillable full check failed the read-only test because symlink checking
tried to lstat `/home` outside the repository permission grant. Symlink checking now starts at the
trusted supplied workspace boundary; complete tests and read-only preflight pass. The earlier
failed logs and pre-final approval snapshots remain. Directory-fsync durability was also pinned
before final checks. No prior source or4 input bytes changed during preparation revisions.

The canonical current manifest equals `data/bo-004s-api-runner/approval.operator-target.json`.
Older files named `approval.json`, `approval.initial.json` or `approval.final.json` are preserved
pre-approval revisions, **not** the approved/current target. Inspect the canonical docs file/hash.
Reproduction in a fresh checkout can generate a fresh timestamp/hash; it must never delete or
replace this existing package to force preparation to pass.

## Changed/new files and remaining issues

No pre-existing tracked file was modified. All new source, tests and evidence are under `docs/`:

- `bologna-paint-api-core.ts`, `-attempt.ts`, `-https.ts`, `-live.ts`, `-plan.ts`, `-postqa.ts`
- `bologna-paint-api-prepare.ts`, `-check.ts`, `-checksums.ts`, `bologna-paint-api.test.ts`
- `bologna-paint-api-research.json`, `-approval.json`, `-qa.json`, `-checksums.json`
- `bologna-paint-api-preflight.md`

Generated preparation metadata/prompt, immutable manifest revisions and check logs are only under
new ignored `data/bo-004s-api-runner`. No live run directory or attempt ledger exists. New source/test
files are untracked and must be included in any handoff; `git diff` alone omits them.

Remaining: explicit operator approval of the new command/hash and estimated cost uncertainty;
API key/access/funding; actual provider behaviour/usage/charge; semantic and independent human
validation of any future output. No native Codex image call, paid request, provider upload,
render/scene/ground/fetch, painting, export/archive, publishing, deployment, deletion or commit was
performed. **STOP: await new explicit operator authorization tied to this manifest and command.**
