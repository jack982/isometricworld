# BO-004S-C — Codex CLI pilot preflight, Gate B STOP

**Status: PENDING_MANUAL_OPERATOR_EXECUTION. Gates0/A/B complete.** No real painting process,
image-generation request or new painted candidate was produced. GateC must be a separate, deliberate
operator action on their terminal; GateD and the conditional BO-006P backlog were not executed.

Base **826e0d1**, branch **feature/bo-004S-C-codex-original-painter**, Node **v24.22.3** via `nvm use24`.
The initial tracked tree was clean; the user's task plan was the sole untracked file. All work
is new experiment-only code/docs and a fresh **data/bo-004s-codex-native** root. No pre-existing
source, geometry, raw/derived data, tile, painting, proof, viewer/cache or dev server was modified,
deleted or stopped. No export, publish, deploy, archive, paid API request or commit occurred.

## New explicit choice, not a weakened old gate

This task explicitly accepts **at most one outer painting `codex exec` process**, **zero wrapper
retries**, concurrency1 and no wrapper model/provider fallback. It **does not** impose a hard cap
on internal image-tool calls or guarantee a financial ceiling. That residual risk requires the
operator's acknowledgement flag. The earlier native strict-cap blocker and the B1 optional API
runner remain byte-for-byte unchanged. Their old approval hashes are rejected by this new entry point.

The real Codex executable was used only for **version, help, login status and feature inspection**.
`exec --help` is a diagnostic process, not a painting/inference run; zero real *painting* execs ran.
Mock tests start a local fake CLI that copies existing input bytes, not a model. Preparation/tests
never supplied the live acknowledgement flag to the helper or launched its live branch.

## Gate0 — current source, authentication and compatibility

The checked-out `pipeline/src/paint.ts` is authoritative. It has a four-image `codex exec` call
with stdin prompt and a workspace-write sandbox. Its full `paintWindow()` retries up to3 times,
waits on limits, assembles tiles and removes working images after success. Bologna has no normal
LOCAL prompt. None of that runner was invoked or changed. The isolated helper retains the original
CLI image workflow and the existing BO-004S Bologna prompt instead of importing newer upstream code.

Installed **codex-cli 0.170.0**:

- Resolved executable: `/home/jacopo/.codex/packages/standalone/releases/0.170.0-x86_64-unknown-linux-musl/bin/codex`.
- Executable SHA-256: `880819aab735adcf16f36cd628940b9f1e652a36c01d10a5d32f83cc84902971`; 298,309,560 bytes.
- `login status`: **ChatGPT**, verified **2026-11-20T13:16:16.732Z**; no tokens/account data copied.
- CLI features advertise **image_generation stable true**. No generation was used to test actual
  quota/service availability. If the tool is unavailable or asks for API credentials at the future
  run, stop; no fallback is implemented. Driver default/image submodel are not resolved offline.
- Installed help supports four repeated `-i` attachments, stdin `-`, `-C`, `-s workspace-write`,
  skip-git check, JSON logs, ephemeral execution and ignoring user configuration.

The live wrapper rechecks authentication immediately before any painting attempt. A read-only
`login status` subprocess is distinct from the single subsequent painting exec. Wrong/missing
ChatGPT authentication stops before creating the attempt ledger or a painting process. Inspection
uses a non-forcing status check so it does not deliberately log out a mismatched account.

Exec-only overrides restrict authentication to ChatGPT and provider to OpenAI. User config is ignored,
API-provider credential variables are excluded from the child environment, and **CODEX_HOME is not
changed**. No API SDK, API runner, key, Images API endpoint, external provider or model-switch loop is
used. The [authentication guide](https://learn.chatgpt.com/docs/auth) distinguishes ChatGPT subscription
access from API-key billing; the [config reference](https://learn.chatgpt.com/docs/config-file/config-reference)
documents `forced_login_method`. These overrides apply to this invocation, not the user's config files.

The exact underlying argv is preserved in [preflight QA JSON](bologna-paint-codex-preflight-qa.json).
It is the original sequence `exec … -s workspace-write -C <new-root>/work -i input.png -i height.png
-i style.png -i trees.png -`, plus `--ignore-user-config --strict-config --ephemeral`, explicit
`image_generation`, ChatGPT/OpenAI restrictions and JSON logs. No trust/sandbox bypass flag or
additional writable directory is used. The working directory is the isolated staged work folder;
its local AGENTS instructions forbid edits elsewhere and API/provider fallback. Old hashes are
verified again after a future run. This does not claim control of provider-internal operations.

## Frozen inputs and prompt

Area **piazza-maggiore**, window **(-1,-1)**;1024px,896 stride,128 overlap; global bounds
**x=[-896,128), y=[-896,128)**. Existing validated BO-004S input snapshots are the sole sources;
not neutral controls, viewer AVIFs, new renders or transformed images. The frozen origin44.4938,
11.343,h=0; heading315°, pitch45°,0.25m/art-pixel, geoid39.647m and area bbox remain unchanged.
Source render/height pairs and coverage were revalidated against the preserved old manifest.

|Staged attachment, in order|Dimensions|SHA-256|
|---|---|---|
|`data/bo-004s-codex-native/work/input.png`|1024×1024|`4fe7341333fb3be87eb2750617d62de9ebbb95fc662a367b14619259492da2b0`|
|`data/bo-004s-codex-native/work/height.png`|1024×1024|`4f82a0825746efd275e623c8e066c1e0c85236e726a902ec27118ec7800ce6a2`|
|`data/bo-004s-codex-native/work/style.png`|2048×1024|`1baa9abbe2add8284933c6b29976036e9af4c4926ab4bf00859fb24a4a2ed97f`|
|`data/bo-004s-codex-native/work/trees.png`|1024×1024|`eb78909ec5679f4a26def56e3179a731b59caaef9a5127007affc99b168c3fee`|

**Material dimension discrepancy:** house-style `style.png` is the original **2048×1024** reference;
input/height/trees are1024×1024. All are copied byte-for-byte, with no resizing or AI transformation.
The **requested output is1024×1024**. An appearance reference need not have the output's dimensions;
forcing all4 to1024² would violate the instruction to preserve reference bytes.

Staged original prompt: **`data/bo-004s-codex-native/work/prompt.txt`**.
Original/staged SHA: **`0674b6b7424c30e80d229b783251dea2121bc69c3014cd49de495fbfcc62266e`**.

Stdin prompt: **`data/bo-004s-codex-native/work/invocation-prompt.txt`**.
SHA: **`4e6d294af147cb41c4a36cf9c3845e35575c0cd6812695f8b66a2547b1e422ae`**.
Only its destination string changes **run/-1_-1/raw.png → out.png**. The complete original prompt
is retained independently; no geometry, palette, tree, reference or anti-hallucination instruction
is removed. It asks for one tool call/image, but that instruction is **not an enforced internal cap**.

The prompt explicitly forbids copied reference buildings/layout/coastline/beach/palms and any added,
moved or merged building volume. That bans importing reference modern towers even though the exact
words “modern towers” are not present. It forbids invented belfries/clock faces/chapels/monumental
facades and protects streets, piazza, courtyards, roof outlines and portico clearance. The camera's
back-facing principal facade remains unseen; no landmark reconstruction from model memory is allowed.

House style and central-European trees are **appearance-only**, not architectural/botanical evidence.
They are existing project assets licensed in ATTRIBUTION.md, not assets downloaded from the live
website. Existing OSM, municipal CC BY4, Copernicus and BO-003F appearance-reference notices remain
in the source manifest. No new geographic/photo/style source was introduced. Any later public proof
must retain those data notices and identify AI painting; this task creates no new map imagery.

## GateA — helper, safety policy and offline tests

The helper stages inputs once into the fresh root and refuses an existing destination. The canonical
[approval manifest](bologna-paint-codex-approval.json) pins staged assets, prompts, local work instructions,
execution sources, the resolved CLI binary and earlier experiment inventories. The executable is a
resolved installation file; staged inputs/output paths never permit symlinks. The wrapper accepts
only this window/new hash, explicit execution and explicit risk acknowledgement; no bulk, force,
provider, model, root or concurrency flags are exposed.

An exclusive, append-only **attempt.jsonl** is fsynced, with its parent directory, before spawn.
At most1 outer painting spawn is attempted. A second invocation refuses the ledger/output even
when the first failed, timed out or made no image. The wrapper does not retry, repaint, sleep for
quota, resume a session, choose another window, run the full painter or start a fallback provider.
A15-minute timer or explicit quota/rate rejection terminates only its own process group. The helper
waits in the foreground and does not unref or schedule a background resumption. An already accepted
provider operation might continue despite client cancellation; internal image activity is not bounded.

Stdout/stderr are buffered with a16MiB limit, then credential-pattern-redacted before storage. An
oversized log ends the attempt. Keys, bearer strings, JWTs and named token assignments are redacted;
no credential store or API-key value is copied to metadata. Raw `out.png` is copied without alteration
to **raw.png**, including on nonzero exit or QA failure when a regular output file exists. Corrupt
raw bytes are retained for diagnosis. No registration, retouch, blending or tile import occurs.

Initial read-only image QA checks PNG1024², actual opacity, nonblank content, dark8×8 cells and
identity edge correlation (threshold0.45). Low similarity ends the attempt with no repaint. This
heuristic is **not** proof of geometric/historical fidelity or a human GO. Result status on initial
success is **RAW_CANDIDATE_SAVED_PENDING_HUMAN**, never architectural acceptance.

Current QA/registration tools were inspected: `pipeline/src/register.ts` exposes read-only
`register(reference,painted)` scoring/offset/scale; `applyRegistration` writes an aligned image and
is intentionally not called here. BO-004S/API diagnostic masks and9 anchors remain available for
future offline GateD review. Raw output must be assessed first. No live comparison, side-by-side,
new registered image or GO/REFINE/NO-GO report exists at GateB.

Final verification: **113/113 tests PASS** (94 previous regression/safety/API-mock tests +19 native
pilot tests), no skips. Pipeline, web and pilot TypeScript, `git diff --check`, the pure plan and
the helper's dry-run path under read-only/no-child permissions all pass. The trusted sharp addon
requires `--allow-addons`; Node's native-addon permission warning is retained. The read-only plan
also gets a read grant for the pinned CLI binary; it hashes that file and never executes it.

Mocks cover one outer spawn, nonzero exit with raw preservation, missing image, corrupt PNG,
timeout, quota rejection, staged hash mismatch, wrong window, missing/API-key auth, output/replay
refusal, API-key exclusion and credential redaction. Tests never pass the risk flag. A numeric429
usage/coordinate is not mistaken for a quota error; explicit HTTP429/limit rejection is detected.
Only local fake executables run during mock tests; successful mock images are copies under `/tmp`.

All **1,410 protected baseline files** and **110 earlier painting/API files** still match; no protected
root gained/lost files. The original painters/blockers and all BO-005P assets remain unchanged.
Detailed commands/log hashes: [QA JSON](bologna-paint-codex-preflight-qa.json).

## GateB — review this risk before manual execution

**One outer process is a best-effort usage boundary, not one internal image-tool call or a spending
ceiling.** The next command may consume the account's included Codex allowance and image/tool limits;
there is no reliable fixed per-image amount available from this preflight. The wrapper cannot
promise that only included allowance is used. Purchased ChatGPT credits may be consumed automatically
after included usage is exhausted. This is distinct from a separately billed Images API request;
the latter is not used by this helper. No USD amount or allowance reduction has been inferred.
[Credit usage explanation](https://help.openai.com/en/articles/12642688-using-credits-for-flexible-usage-in-chatgpt-personal-plans).

**Before executing**, the operator should open their Codex CLI and type **/status**, then inspect the
account's Usage/Usage & Billing page and credit settings. Check the current account, remaining
allowance/reset information and whether credit consumption is acceptable; quit that interactive
session before running the experiment command. [/status and session information](https://developers.openai.com/blog/mastering-codex-remote-for-engineering).
Image/tool activity may not all appear in the displayed chat usage, so do not treat that display as
an exact image-call counter. [Usage visibility](https://help.openai.com/en/articles/20001478-reviewing-work-and-codex-usage-and-using-personal-analytics-in-chatgpt-desktop).
Actual allowance and credit balances were **not queried** by preparation.

**Run this command yourself only if you accept those risks for this one experiment.** Running it is
conscious authorization of the newly pinned helper and this window; it does not authorize another
attempt, adjacent window, API run, citywide painting, publication or deployment. If you do not accept
the residual internal-call/credit risk, do not run it. No preparation agent or test has passed its
acknowledgement flag.

From **/home/jacopo/projects/isometricworld**, with `nvm use24` active:

```sh
node --import tsx docs/bologna-paint-codex-live.ts --execute --window=-1,-1 --approve=9f96057db1c58a9acf889058e3723e1506945229db097ea4c27ee9d5ff9e5e9f --acknowledge-internal-call-risk
```

New approval SHA-256: **9f96057db1c58a9acf889058e3723e1506945229db097ea4c27ee9d5ff9e5e9f**.
Both previous native/API approval hashes are explicitly rejected. The old strict blocker remains.
No Images API key should be supplied. Authentication is rechecked as ChatGPT immediately before
spawn; if it cannot be verified, the helper refuses. A changed binary, staged image, prompt,
source hash or existing attempt/output similarly refuses. Actual quota/tool availability is not
proved until that deliberate future attempt; tool absence/API credential requests must end it.

On initial success inspect **data/bo-004s-codex-native/raw.png**, alongside unchanged staged input.
Logs/result/initial QA are **codex.stdout.log**, **codex.stderr.log**, **result.json**, **qa.json** in
the same root. `work/out.png` also remains. The post-run preservation check writes
**preservation-after.json**. On failure inspect the retained files and stop: **do not rerun**, even
for quota reset, missing output, a prettier candidate, distortion or an invalid image. There is no
cleanup or silent override switch. External provider completion/allowance after cancellation may
remain unknown. Human quality/fidelity acceptance is **NOT_TESTED** until a real candidate is reviewed.

## Reproduction, sources and files

Safe commands (no live flag):

```sh
source /home/jacopo/.nvm/nvm.sh
nvm use 24
# Already completed once; refuses this existing root. Do not delete anything to rerun it.
node --import tsx docs/bologna-paint-codex-prepare.ts
# Safe read-only preflight, no Codex process:
node --import tsx docs/bologna-paint-codex-plan.ts --dry-run
# Helper defaults to dry-run, also no Codex process:
node --import tsx docs/bologna-paint-codex-live.ts --dry-run
# Fixed local checks and fake CLI only; never passes the live acknowledgement:
node --import tsx docs/bologna-paint-codex-check.ts
node_modules/.bin/tsc --noEmit -p pipeline
node_modules/.bin/tsc --noEmit -p web
git diff --check
node --import tsx docs/bologna-paint-codex-checksums.ts
```

Actual inspection used git status/log, source reads/rg, `file` on4 inputs, sharp/hash validation,
Codex version/help/features/login-status and public official documentation. Help with the chosen
ChatGPT config flags was checked without inference. No native generation, API call, auth switch,
credential extraction or allowance purchase was performed. Initial unit tests had17 passes and
one integration skip before staging existed; the final complete run has113 passes/no skips.
An initial complete112-test pass was followed by a targeted quota-detection fix: arbitrary429
numbers must not abort a legitimate turn. The full suite was rerun and passes113 tests. Logs and
the initial pre-approval manifest remain; source images and earlier data did not change.

Manifest runtime source hashes:

|File|SHA-256|
|---|---|
|`docs/bologna-paint-codex-core.ts`|`27193e7842aa0b739bc01e931b17e59ababbc4edfe814f6734979272cf5e0556`|
|`docs/bologna-paint-codex-process.ts`|`ab5d95fc76a86dc734d5c75a1f5e71038498538e994848e365e8e427fa999f90`|
|`docs/bologna-paint-codex-live.ts`|`f6bc8f718cc996a68811367eff9bcbe3e77bd6ada21b6c1a25359b48556274a1`|
|`docs/bologna-paint-codex-plan.ts`|`af7f9b5ca39117873ed49305d8ce52098e71bf7ee888ec8d68bbe85b9a6b63ef`|

The canonical manifest matches **data/bo-004s-codex-native/approval.operator-target.json**.
`approval.json` and `approval.initial.json` are retained pre-approval snapshots; use the canonical
docs file/hash. The original prompt is retained separately from the destination-only variant.
Full handoff inventory: [checksums](bologna-paint-codex-checksums.json).

No pre-existing tracked file is modified. New untracked files to include:

- `docs/bologna-paint-codex-core.ts`, `-process.ts`, `-live.ts`, `-plan.ts`, `-prepare.ts`
- `docs/bologna-paint-codex.test.ts`, `-check.ts`, `-checksums.ts`
- `docs/bologna-paint-codex-approval.json`, `-preflight-qa.json`, `-checksums.json`
- `docs/bologna-paint-codex-preflight.md`

The user's untracked task plan remains untouched. The ignored new root contains only copied
inputs/prompts, local instructions, CLI inspection evidence, preflight manifests and check logs;
there is **no real out.png/raw.png, attempt ledger or model result**. No source/painted asset was
deleted or replaced. No commit, export, publication, deployment, viewer change or BO-006P task.

**STOP AT GATE B.** [The task](../plans/BO-004S-C-codex-original-painter.md) requires the live command
to be a separate manual operator action. The deliberate risk acknowledgement is an explicit new
operator choice; it was not inferred from this implementation request.
