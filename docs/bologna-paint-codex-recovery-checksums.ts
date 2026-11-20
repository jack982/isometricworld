/** Offline R1 handoff inventory. Includes archive, new staging, checks, audit and recovery sources. */
import assert from "node:assert/strict";
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { absolute, inventory, pin, read, verifyPins, type FilePin } from "./bologna-paint-support.ts";
import { RECOVERY_APPROVAL, RECOVERY_ROOT, validateRecovery } from "./bologna-paint-codex-recovery-core.ts";
const target = "docs/bologna-paint-codex-recovery-checksums.json";
assert(process.argv.slice(2).every(a => a === "--verify"), "CHECKSUMS_ONLY_OR_VERIFY");
const p = await validateRecovery();
if (process.argv.includes("--verify")) {
  const m = read<{ files: Record<string, FilePin> }>(target); verifyPins(m.files);
  console.log(JSON.stringify({ verifiedFiles: Object.keys(m.files).length, approval: pin(RECOVERY_APPROVAL), previousUsage: "UNKNOWN" }));
} else {
  assert(!existsSync(absolute(target)), "HANDOFF_ALREADY_FROZEN_VERIFY_ONLY");
  const docs = readdirSync(absolute("docs")).filter(f => f.startsWith("bologna-paint-codex-recovery") && f !== "bologna-paint-codex-recovery-checksums.json").map(f => "docs/" + f);
  const files = inventory([RECOVERY_ROOT, ...docs]);
  writeFileSync(absolute(target), JSON.stringify({ algorithm: "sha256", approval: pin(RECOVERY_APPROVAL), protectedBaselineFiles: p.protectedFiles,
    previousAttempt: "INTERRUPTED_UNKNOWN_USAGE", previousUsage: "UNKNOWN_NOT_ZERO", oldEvidenceFilesPreserved: p.archiveFiles,
    liveCommandExecuted: false, imageGenerationInvocationsDuringRecovery: 0, files }, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ files: Object.keys(files).length, approval: pin(RECOVERY_APPROVAL) }));
}
