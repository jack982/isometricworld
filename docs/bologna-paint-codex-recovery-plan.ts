/** Read-only recovery preflight: no Codex, process inspection or generation is launched. */
import assert from "node:assert/strict";
import { manualRecoveryCommand, validateRecovery } from "./bologna-paint-codex-recovery-core.ts";
assert(process.argv.slice(2).every(a => a === "--dry-run"), "RECOVERY_PLAN_ONLY_DRY_RUN");
const p = await validateRecovery();
console.log(JSON.stringify({ status: p.m.status, previousAttempt: "INTERRUPTED_UNKNOWN_USAGE", previousImageUsage: "UNKNOWN_NOT_ZERO", newApprovalHash: p.hash, executionDirectory: p.m.execution, window: p.m.window, copiedArchiveFiles: p.archiveFiles, protectedBaselineFiles: p.protectedFiles, policy: p.m.policy, observedPreviousImageToolRequests: p.evidence.imageToolRequestsObserved, modelCallsByRecoveryPreparation: 0, writes: 0, command: manualRecoveryCommand(p.hash) }, null, 2));
