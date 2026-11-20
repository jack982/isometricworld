# BO-004S reproducible preflight — STOP BEFORE LIVE

Status: **PENDING_LIVE_APPROVAL / LIVE BLOCKED BY UNVERIFIED NATIVE CALL CAP**.
Preparation through Gate B is complete; no operational live-ready PASS is claimed while the
Gate 0 hard-call-cap prerequisite remains unresolved. **No image model was called.**

## Frozen selection and four inputs

Checkpoint `cec0a69`, branch `feature/bo-004s-paint-feasibility`, Node v24.22.3.
Area `piazza-maggiore`; normal source `data/bo-003f-landmarks/derived/piazza-maggiore`. All ten source render/height pairs validate,
not the BO-003F neutral controls or BO-005P AVIFs. Original camera/ENU/geoid/bbox remain unchanged.

Window **(-1,-1)** on the real 896-pixel painter grid: global bounds
**x=[-896,128), y=[-896,128)**; 1024×1024; nominal horizontal extent256m.
Intersected tiles: **(-1,-1), (0,-1), (-1,0), (0,0)**; coverage **100%**.
Approximate ground-plane centre **44.4933621,11.3419049**, ellipsoid~108.581m.
This centre is an inverse-projection estimate, not surveyed control. No missing corner cell occurs.

The candidate contains all nine retained church partitions, palace portions47682/61154, the open
square, 40 intersecting tree-crown centres and retained portico21018. In all, 297 conservative
projected building bounds intersect the crop. These are not an occlusion-aware segmentation count.
Full feature/CTC IDs, road/paving counts, alternative-window reasons and nine fixed QA anchors:
`data/bo-004s-paint/candidate/selection.json`.

|Attachment in order|Dimensions|Bytes|SHA-256|
|---|---|---:|---|
|`data/bo-004s-paint/input/input.png`|1024×1024|1,103,640|`4fe7341333fb3be87eb2750617d62de9ebbb95fc662a367b14619259492da2b0`|
|`data/bo-004s-paint/input/height.png`|1024×1024|388,406|`4f82a0825746efd275e623c8e066c1e0c85236e726a902ec27118ec7800ce6a2`|
|`data/bo-004s-paint/input/style.png`|2048×1024|5,161,730|`1baa9abbe2add8284933c6b29976036e9af4c4926ab4bf00859fb24a4a2ed97f`|
|`data/bo-004s-paint/input/trees.png`|1024×1024|2,084,513|`eb78909ec5679f4a26def56e3179a731b59caaef9a5127007affc99b168c3fee`|

Prompt: `data/bo-004s-paint/prompts/prompt.txt` · SHA-256
`0674b6b7424c30e80d229b783251dea2121bc69c3014cd49de495fbfcc62266e`.

Approval target: [docs/bologna-paint-input-manifest.json](bologna-paint-input-manifest.json) · SHA-256
**`449ae54fa10c297e2fdeabcbaa197d9f4ae562fb02c59149a0a84dfc2cef849d`**. The four inputs, prompt, original source copies, candidate evidence and wrapper source
are pinned. The live gate revalidates them and **1,410 prior files**, including old proofs/paintings,
raw/derived roots, BO-005P outputs, camera and other regions. Existing paths are not replaced.
Copies are regular files, with symlinks forbidden; old height PNG bytes are retained unchanged.

Height conversion follows the actual local painter: R/G packed centimetres plus heightBase−100m;
whole four-tile above-sea 5th percentile **108.58000183m** from
**262,144 samples**; sqrt-scaled60m guide, cubic256→1024, exact crop.
Colour is the original crop, with no photogrammetry CLAHE/lift or neighbour-strip substitution.
The grayscale guide is interpolated and not a precise courtyard/footprint mask; the prompt says so.

## Reference rights and scope

- Normal render inherits OSM ODbL, municipal CTC/tree CC BY4, the exact Copernicus notice and the
  BO-003F appearance-only CC BY-SA notices. All original attribution strings remain in the manifest.
- `pipeline/style/reference.png`: existing Dmytro Krasun project house style, CC BY4 plus data credits,
  documented in `ATTRIBUTION.md`. It supplies illustration style only, no Tel Aviv layout/materials.
- `pipeline/style/trees-stuttgart.png`: existing project sheet derived with Codex/ChatGPT, same
  documented project licence. Generic deciduous crown treatment only; no asserted Bologna species,
  palms, invented trees, automatic pink blossoms or spruce planting.
- No photo, Google/proprietary reference, new GIS source or newly generated style asset is used.
  BO-003F photographs are not attached. No new external source needs activation in region/footer code.

The site-agnostic Bologna adapter is `BOLOGNA_PROMPT` in `docs/bologna-paint-support.ts`; it is **not**
installed in normal other-region prompts. It limits changes to illustrated surfaces within existing
geometry; preserves courtyards, streets, roofs, piazza and portico gaps; forbids invented towers,
clock faces, chapels, statues, signage, traffic and hidden principal facades. Roof rise, palace
transitions and monument details remain estimates/unverified. No restoration from model memory.

[Credited input preview](bologna-paint-window-input.png) · [QA-only overlay](bologna-paint-window-qa.png).
The overlay's footprint/roof/courtyard/road/tree lines and nine anchors are **not model inputs**.
Projected outlines are conservative and not occlusion-aware; overlay clutter is diagnostic rather
than a claimed ground-truth segmentation.

## Reproduce validation without a model

From repository root:

```sh
source /home/jacopo/.nvm/nvm.sh
nvm use 24
# Read-only: no filesystem write or child-process permissions; native sharp addon explicitly allowed.
node --permission --allow-fs-read=. --allow-addons docs/bologna-paint-plan.ts --dry-run
# Conventional Node/tsx equivalent, also has no provider dependency:
node --import tsx docs/bologna-paint-plan.ts --dry-run
# Engineering suite: fixed local checks and negative gate tests, no generation.
node --import tsx docs/bologna-paint-check.ts
```

The permission-mode invocation passes. Node warns that native addons are outside its JS permission
model; only the installed sharp addon is used. Module-graph tests also exclude process/provider/
network dependencies from repository preflight code. The validator prints destinations, hashes,
image count, overwrite=false and the blocked live status. It creates no run/output directory.

Preparation was `node --import tsx docs/bologna-paint-prepare.ts`; it refuses an existing experiment
root. **Do not rerun it here or delete the root to make it pass.** Its offline help/upstream inputs
and fresh-checkout preparation commands are documented in the feasibility report. Only read-only
validation should be rerun against this package. Input pixels/conversion reproduce byte-for-byte.

## Exact proposed single-window command — NOT EXECUTED

```sh
node --import tsx docs/bologna-paint-live.ts --window=-1,-1 --max-calls=1 --attempts=1 --workers=1 --approve=449ae54fa10c297e2fdeabcbaa197d9f4ae562fb02c59149a0a84dfc2cef849d --expires=2026-11-21T09:50:34.094Z
```

This is a **proposed approval target, currently fail-closed**, not a working image-generation
launcher. Even matching approval is refused with `BLOCKED_NATIVE_IMAGE_CALL_CAP`. It is included
so the named crop, manifest and policy are reviewable; **approval alone cannot resolve the cap**.
A verified native cap implementation would change pinned code and require a new manifest/hash and
fresh explicit approval. Do not substitute `npm run paint`, `codex exec` or another provider.
The displayed approval expires at the command's `--expires` timestamp; rerun the read-only preflight
for a fresh proposed expiry, which never itself constitutes approval.

Planned backend: installed **codex-cli0.170.0**, existing ChatGPT login, native image generation
feature enabled. CLI default driver model is not resolved by offline help; image submodel and
remaining allowance are unverified. No model/provider switch, API key or fal backend is configured.

|Policy / observable|Value|
|---|---|
|Intended image-call cap|**1 total**, must be enforced before provider execution|
|Retry cap|**0**; stop on error, quota or rate limit; no waiting/repaint|
|Parallel workers|**1**|
|Requested outputs|**1**, 1024×1024 opaque PNG|
|Enforceable current live allowance|**0**: wrapper refuses all provider execution|
|Observed image calls / provider requests|**0 / 0**|
|USD spend|**not applicable / unknown** for planned logged-in usage; no billable request made; no invented $0 price|
|Human painted-quality acceptance|**NOT_TESTED**|

Expected future outputs (none exists):
`data/bo-004s-paint/run/-1_-1/{raw.png,registered.png,events.jsonl,qa.json}`.
Raw output must survive registration; low match or darkness is a review/failure result, never an
automatic second call. No output is copied into normal paint, BO-003F, BO-005P or publication roots.

## Operator checklist and explicit stop

1. Inspect the credited crop, separate overlay, complete `prompt.txt` and input/licence manifest.
2. Confirm the window and limited architecture hypotheses; its back-facing main facade cannot be repaired.
3. Resolve/prove a native image-tool call cap and pin the resulting code with a **new** approval hash.
4. On a separate turn, explicitly approve that named window/hash and **one image-generation call**.
5. Inspect raw and registered output at matching scale; defer aesthetic/fidelity GO to independent human review.

**STOP BEFORE LIVE.** The plan's hard rule5 says preparation/dry-run only until explicit operator
authorization; hard rule6 requires at most one model image-generation call. Its mandatory stop
condition also applies when the tool cannot clearly operate within that cap. These requirements
come from [BO-004S](../plans/BO-004S-codex-task.md), not an extra approval flow invented here.
