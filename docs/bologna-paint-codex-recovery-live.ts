/** New manual authorization only. Does not resume, clear or replace the previous attempt. */
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { absolute, read, verifyPins, type PaintManifest } from "./bologna-paint-support.ts";
import { operatorChoice, regular } from "./bologna-paint-codex-core.ts";
import { approveNewHash, manualRecoveryCommand, validateRecovery } from "./bologna-paint-codex-recovery-core.ts";
const p = await validateRecovery(), args = process.argv.slice(2);
if (!args.includes("--execute")) {
  assert(args.every(a => a === "--dry-run"), "DRY_RUN_ONLY"); console.log(JSON.stringify({ status: "DRY_RUN_NO_EXECUTION", command: manualRecoveryCommand(p.hash), previousUsage: "UNKNOWN" }));
} else {
  assert(args.includes("--acknowledge-unknown-previous-usage"), "UNKNOWN_PREVIOUS_USAGE_ACKNOWLEDGEMENT_REQUIRED");
  approveNewHash(args.find(a => a.startsWith("--approve="))?.slice(10), p.hash, p.m.forbiddenApprovalHashes);
  operatorChoice(args.filter(a => a !== "--acknowledge-unknown-previous-usage"), p.hash, p.m.forbiddenApprovalHashes);
  const { oneOuterInvocation } = await import("./bologna-paint-codex-process.ts");
  const r = await oneOuterInvocation({ root: absolute(p.m.execution), work: absolute(p.m.work), approvalHash: p.hash,
    stagedPins: Object.fromEntries(Object.entries(p.m.staged).map(([path, v]) => [absolute(path), v])),
    prompt: regular(absolute(p.m.work + "/invocation-prompt.txt")).toString(), executable: { file: p.parent.cli.executable }, env: process.env });
  let preserved = false;
  try { verifyPins(p.m.preservation); verifyPins(p.parent.priorFiles); verifyPins(read<PaintManifest>("docs/bologna-paint-input-manifest.json").preservation); preserved = true; }
  finally { writeFileSync(absolute(p.m.execution + "/preservation-after.json"), JSON.stringify({ preserved }, null, 2) + "\n", { flag: "wx" }); }
  console.log(JSON.stringify({ status: r.status, preserved, previousUsage: "UNKNOWN", result: p.m.execution + "/result.json" }));
  if (!preserved || r.status !== "RAW_CANDIDATE_SAVED_PENDING_HUMAN") process.exitCode = 1;
}
