/** Manual operator entry only. Preparation and tests must never pass the acknowledgement flag. */
import { writeFileSync } from "node:fs";
import { absolute, verifyPins } from "./bologna-paint-support.ts";
import { operatorChoice, proposedCommand, validateNative } from "./bologna-paint-codex-core.ts";
const p = await validateNative();
if (!process.argv.slice(2).includes("--execute")) {
  if (!process.argv.slice(2).every(a => a === "--dry-run")) throw new Error("DRY_RUN_ONLY_WITHOUT_MANUAL_EXECUTION");
  console.log(JSON.stringify({ status: "DRY_RUN_NO_CODEX_PROCESS", proposedCommand: proposedCommand(p.hash), policy: p.m.policy }));
} else {
  operatorChoice(process.argv.slice(2), p.hash, p.m.previousApprovals);
  const { oneOuterInvocation } = await import("./bologna-paint-codex-process.ts");
  const result = await oneOuterInvocation({ root: absolute(p.m.root), work: absolute(p.m.work), approvalHash: p.hash,
    stagedPins: Object.fromEntries(Object.entries(p.m.staged).map(([path, v]) => [absolute(path), v])),
    prompt: (await import("./bologna-paint-codex-core.ts")).regular(absolute(p.m.work + "/invocation-prompt.txt")).toString(), executable: { file: p.m.cli.executable }, env: process.env });
  let unchanged = false;
  try { verifyPins(p.m.priorFiles); const original = (await import("./bologna-paint-support.ts")).read<{ preservation: Parameters<typeof verifyPins>[0] }>("docs/bologna-paint-input-manifest.json"); verifyPins(original.preservation); unchanged = true; }
  finally { writeFileSync(absolute(p.m.root + "/preservation-after.json"), JSON.stringify({ unchanged }, null, 2) + "\n", { flag: "wx" }); }
  console.log(JSON.stringify({ status: result.status, preserved: unchanged, raw: p.m.root + "/raw.png", result: p.m.root + "/result.json" }));
  if (!unchanged || result.status !== "RAW_CANDIDATE_SAVED_PENDING_HUMAN") process.exitCode = 1;
}
