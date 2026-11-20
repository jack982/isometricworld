# BO-004S-C-R1: interrupted native attempt recovery

Status: **PENDING_NEW_OPERATOR_APPROVAL**. Only window **(-1,-1)** is staged. No live painting command or image-generation tool was invoked during recovery. The previous attempt is **INTERRUPTED_UNKNOWN_USAGE**; its usage must not be treated as zero.

## Cause and available evidence

The operator reported manually interrupting the original execution. Its journal still contains exactly one event, `OUTER_EXEC_ATTEMPT_STARTED`, at **2026-11-20T14:24:50.025Z**. There is no finish event. Its 160 bytes have SHA-256 `9f5dd50dd6297e17f79f185171ba5fda95697cc3280c7cb8c6e1214ddbbdfb84`.

The unchanged native wrapper writes and fsyncs this event **before** spawning `codex exec`. It buffers child stdout/stderr in memory and persists them only after child close. It has no interrupt persistence handler. Abrupt parent termination can therefore leave this state either before or after spawn; the exact signal and progress of the original child are unknown. There is no evidence that the former Node version caused the interruption. `raw.png`, `result.json`, `qa.json`, both Codex logs and `work/out.png` remain absent.

The read-only local audit at **2026-11-20T15:30:04.678520Z** inspected thread metadata for the exact original work directory, session/archived-session metadata, log aggregates around the attempt and relevant process metadata. Results:

| Evidence | Finding |
| --- | --- |
| Threads with exact original work cwd | 0 |
| Retained rollouts with exact original work cwd | 0 |
| Image requests observed in matching rollouts | 0 **observed**, not measured usage |
| Local log rows in audit interval | 1,090 |
| Log rows mentioning exact original work cwd | 0 |
| Image-dispatch text matches in logs, unattributed | 2; cannot assign them to this attempt |
| Relevant local processes | None observed |
| Audit scan errors | None |

See [sanitized audit](bologna-paint-codex-recovery-evidence.json) and [audit script](bologna-paint-codex-recovery-evidence.py). The log query includes ten seconds before the recorded start. Text matches are not verified tool dispatches. The parent repository session is not evidence of a child invocation. No authentication store, private transcript or database was copied into this handoff.

The original command uses `--ephemeral`, so absence of retained sessions is inconclusive. No provider billing/allowance query was performed. Local process absence does not establish that remote work never started or stopped. **There is insufficient evidence to establish whether any image tool was invoked, whether an image completed, or whether usage was charged.**

## Evidence preserved and isolated staging

All original files remain at their original paths, byte for byte. Nothing was moved, removed, reset or appended to the original journal. The original approval SHA remains `9f96057db1c58a9acf889058e3723e1506945229db097ea4c27ee9d5ff9e5e9f`.

The verified archive contains **41 files**:

- All **28** original `data/bo-004s-codex-native/` files: journal, approval revisions, manifests, seven work files, inspections, preservation records and check logs.
- All **12** original `docs/bologna-paint-codex*` files excluding this recovery family, including the original checksum inventory.
- `plans/BO-004S-C-codex-original-painter.md`.

Archive copies live under `data/bo-004s-codex-recovery-r1/archive/evidence/<original repository path>`. The additive `archive/status.json` records `INTERRUPTED_UNKNOWN_USAGE`; it does not change the original journal. `archive/session-evidence.json` holds the sanitized audit. The new approval manifest lists every original and archived path, byte size and SHA-256. Original native checksum pins (**38** files), API checksum pins (**32**), the native approval's **110** prior files and **1,410** baseline protected files were verified unchanged.

New paths:

```text
data/bo-004s-codex-recovery-r1/
  archive/status.json
  archive/session-evidence.json
  archive/evidence/...
  approval.json
  execution/work/{AGENTS.md,input.png,height.png,style.png,trees.png,prompt.txt,invocation-prompt.txt}
  checks/<timestamp>/...
docs/bologna-paint-codex-recovery-approval.json
```

All seven work files were copied with exclusive creation and independently verified against the original work directory. No image conversion, recomposition, prompt rewrite or new reference source was introduced.

| Staged file | SHA-256 |
| --- | --- |
| input.png | `4fe7341333fb3be87eb2750617d62de9ebbb95fc662a367b14619259492da2b0` |
| height.png | `4f82a0825746efd275e623c8e066c1e0c85236e726a902ec27118ec7800ce6a2` |
| style.png | `1baa9abbe2add8284933c6b29976036e9af4c4926ab4bf00859fb24a4a2ed97f` |
| trees.png | `eb78909ec5679f4a26def56e3179a731b59caaef9a5127007affc99b168c3fee` |
| prompt.txt | `0674b6b7424c30e80d229b783251dea2121bc69c3014cd49de495fbfcc62266e` |
| invocation-prompt.txt | `4e6d294af147cb41c4a36cf9c3845e35575c0cd6812695f8b66a2547b1e422ae` |
| AGENTS.md | `c05c0ef6ac8ed59f4007763401021b81981ec07dc2d9cbea05b48a12b72349fc` |

The existing 2048×1024 style reference is retained; the other three images are 1024×1024. Frozen origin, heading, geoid, area and window geometry are unchanged. All existing attribution rules and reference provenance remain in force.

## New approval and execution protection

New approval SHA-256:

```text
78093fd8031876d2d039c7e5caace97e5dba29e8ee3acd870976ec204d3735ac
```

The original native painter, process backend, pipeline painter, API runner, `unusedOutputs()` and original validation remain unchanged. The old attempt remains locked. The recovery wrapper verifies the archive, original pins, unchanged CLI binary, staged bytes and three pinned recovery runtime sources, then applies the **original** unused-output guard to the **new** execution directory. Its original exclusive attempt journal still provides one-shot execution protection. Previous BO-004S, API and all native approval revisions are explicitly forbidden; possession of an old hash cannot authorize the new execution.

Preparation verified **Node v24.22.3**, Codex **0.170.0**, native image feature availability and read-only **ChatGPT login status**. It did not run `codex exec`. The pinned CLI SHA is `880819aab735adcf16f36cd628940b9f1e652a36c01d10a5d32f83cc84902971`. API credentials are excluded by the existing backend; no API key route or fallback was added.

The execution policy remains one outer Codex exec, four images, the original invocation prompt, no application retries or fallback. Codex's internal image calls and allowance consumption are **not hard capped**. New execution could incur additional usage on top of unknown previous usage. The extra acknowledgement below makes that uncertainty explicit. Original interruption logging behaviour is also unchanged; another abrupt interruption could again leave unknown usage. This recovery does not promise otherwise.

**Manual command for explicit operator approval only — NOT EXECUTED:**

Run from the repository root with Node 24.22.3 active:

```sh
node --import tsx docs/bologna-paint-codex-recovery-live.ts --execute --window=-1,-1 --approve=78093fd8031876d2d039c7e5caace97e5dba29e8ee3acd870976ec204d3735ac --acknowledge-internal-call-risk --acknowledge-unknown-previous-usage
```

The new output directory is `data/bo-004s-codex-recovery-r1/execution/`; it currently has no attempt journal, raw image, result, QA or Codex logs. A subsequent operator-run attempt must use this location and new approval, never the old live command. Any generated candidate still requires human review; this authorization is not permission to publish.

## Verification and reproducibility

The scripts used, without any live painting command:

```sh
source /home/jacopo/.nvm/nvm.sh
nvm use 24
# Initial audit output was exclusively created, then frozen with approval pins:
python3 docs/bologna-paint-codex-recovery-evidence.py
# Already completed once; refuses to overwrite the prepared recovery:
node --import tsx docs/bologna-paint-codex-recovery-prepare.ts
# Offline mocks, TypeScript and read-only preflights:
node --import tsx docs/bologna-paint-codex-recovery-check.ts
# No writes or process/provider launches:
node --permission --allow-fs-read=/home/jacopo/projects/isometricworld --allow-fs-read=/home/jacopo/.codex/packages/standalone/releases/0.170.0-x86_64-unknown-linux-musl/bin/codex --allow-addons docs/bologna-paint-codex-recovery-plan.ts --dry-run
# Freeze once, subsequently verify only:
node --import tsx docs/bologna-paint-codex-recovery-checksums.ts
node --import tsx docs/bologna-paint-codex-recovery-checksums.ts --verify
git diff --check
```

The audit initially used exclusive shell output creation (`test ! -e ...` followed by redirection); do not overwrite its frozen JSON on a later inspection. Run a later audit to a distinct new path. Preparation itself is single-use and refuses an existing recovery root or approval file. The handoff inventory also refuses replacement; `--verify` is read-only.

The check runner records exact commands, exit codes and log checksums in [QA JSON](bologna-paint-codex-recovery-qa.json). It runs pipeline and web `tsc --noEmit`, strict recovery-script TypeScript, the relevant Bologna geometry/coverage/viewer/native/API mock suites, both read-only recovery preflights, and `git diff --check`. Both project TypeScript checks pass in this checkout; the earlier `ImportMeta.env` issue does not reproduce.

Final result: **125/125 selected tests passed**, including all **13** recovery tests (112 applicable previous tests plus 13 new tests). Pipeline, web and strict recovery TypeScript checks, both read-only preflights, preservation validation and whitespace checks all passed. The old unused-root test described below is deliberately outside this count.

Regression coverage includes interruption **before** and **after** actual mock process spawn using the unchanged backend, preservation and checksum mismatch rejection, symlink and overwrite rejection, fresh approval enforcement, all previous-hash rejection, original one-shot guard rejection, a process/provider-free plan graph and no automatic execution. Mock interruption tests only launch local Node scripts, preserve their journals and verify that a second attempt is rejected before authentication or spawn. They never launch the installed Codex executable or contact an image service.

One original test is explicitly excluded: `new manifest and staged references validate; dry-run cannot start Codex`. It asserts the old native root is unused, which is no longer true. Its first observed failure correctly reported `PILOT_ALREADY_ATTEMPTED_OR_OUTPUT_EXISTS`. Its source and the guard were preserved. Recovery tests separately verify the old guard rejects and the new isolated directory validates. Initial filtering/test-harness failures and subsequent corrections are retained in timestamped logs and previous QA snapshots; no original evidence was edited to make checks pass.

## Files and handoff

No tracked file was modified. All additions for R1 are under `docs/bologna-paint-codex-recovery*`:

- `core.ts`, `prepare.ts`, `plan.ts`, `live.ts`: verified archive, staging and manual-only authorization.
- `evidence.py`, `evidence.json`: sanitized forensic audit.
- `bologna-paint-codex-recovery.test.ts`, `check.ts`, `qa.json`: regressions and supporting check results (all use the recovery prefix).
- `approval.json`, `checksums.ts`, `checksums.json`, this Markdown report: reviewable authorization and complete SHA-256 inventory.

The 12 original native Codex docs and original task plan were already untracked on entry and remain untracked and unchanged. The new data root is ignored by git; keep it with this local handoff. [Checksum inventory](bologna-paint-codex-recovery-checksums.json) covers the new archive, staging, checks and recovery documentation; it also indirectly pins originals through the approval's preservation map. Retain it before any future live command changes the execution directory.

No generated data, original proof, source data, native/API runner, unrelated region, web file or dev server was changed. No image generation, paid request, live painting, publishing, deployment or commit was performed. Remaining uncertainty is previous image/allowance usage; this task stops at preparation of the new authorization.
