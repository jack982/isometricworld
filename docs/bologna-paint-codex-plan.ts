/** Read-only Gate B, without launching even a diagnostic Codex process. */
import assert from "node:assert/strict";
import { execArgs, proposedCommand, validateNative } from "./bologna-paint-codex-core.ts";
import { absolute } from "./bologna-paint-support.ts";
assert(process.argv.slice(2).every(a => a === "--dry-run"), "DRY_RUN_ONLY");
const p = await validateNative();
console.log(JSON.stringify({ status: "PENDING_MANUAL_OPERATOR_EXECUTION", gate: "B_STOP", manifestSha256: p.hash, inputs: p.m.inputImages, prompt: p.m.prompt, cli: p.m.cli,
  proposedCommand: proposedCommand(p.hash), codexArgv: [p.m.cli.executable, ...execArgs(absolute(p.m.work))], policy: p.m.policy,
  protectedFiles: p.protectedFiles, additionalPreservedFiles: p.additionalPreservedFiles, realOuterExecProcesses: 0, imageGenerationCalls: 0, writes: 0,
  risk: "The operator accepts UNKNOWN internal image-tool calls and possible ChatGPT credit consumption; one outer process is not a spending ceiling", allowance: "Operator must inspect /status and account usage before running; not observed in preflight" }, null, 2));
