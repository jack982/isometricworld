/** Gate B checks only. Never pass the acknowledgement flag or invoke the live entry point. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { absolute, digest, pin, REPO, verifyPins } from "./bologna-paint-support.ts";
import { NATIVE_ROOT, validateNative } from "./bologna-paint-codex-core.ts";

const p = await validateNative(), dir = `${NATIVE_ROOT}/checks/${new Date().toISOString().replaceAll(":", "-")}`;
mkdirSync(absolute(dir), { recursive: true });
const sources = readdirSync(absolute("docs")).filter(f => /^bologna-paint-codex[.-].*\.ts$/.test(f)).map(f => "docs/" + f);
const checks: [string, string, string[]][] = [
  ["pipeline-typescript", "node_modules/.bin/tsc", ["--noEmit", "-p", "pipeline"]],
  ["web-typescript", "node_modules/.bin/tsc", ["--noEmit", "-p", "web"]],
  ["pilot-typescript", "node_modules/.bin/tsc", ["--noEmit", "--target", "es2022", "--module", "esnext", "--moduleResolution", "bundler", "--allowImportingTsExtensions", "--strict", "--skipLibCheck", "--types", "node", ...sources]],
  ["regressions-and-mock-cli", process.execPath, ["--import", "tsx", "--test", "--test-reporter=spec", "pipeline/src/bologna.test.ts", "pipeline/src/bologna-architecture.test.ts", "pipeline/src/bologna-fidelity.test.ts", "docs/bologna-coverage-qa.test.ts", "docs/bologna-architecture-qa.test.ts", "docs/bologna-viewer.test.ts", "docs/bologna-paint.test.ts", "docs/bologna-paint-api.test.ts", "docs/bologna-paint-codex.test.ts"]],
  ["read-only-native-plan", process.execPath, ["--permission", `--allow-fs-read=${REPO}`, `--allow-fs-read=${p.m.cli.executable}`, "--allow-addons", "docs/bologna-paint-codex-plan.ts", "--dry-run"]],
  ["live-entry-dry-run", process.execPath, ["--permission", `--allow-fs-read=${REPO}`, `--allow-fs-read=${p.m.cli.executable}`, "--allow-addons", "docs/bologna-paint-codex-live.ts", "--dry-run"]],
  ["diff-check", "git", ["diff", "--check"]],
];
const results = []; let preflight: unknown;
for (const [name, executable, args] of checks) {
  const r = spawnSync(executable, args, { cwd: REPO, encoding: "utf8", timeout: 180000 });
  const text = (r.stdout || "") + (r.stderr || ""), log = `${dir}/${name}.log`;
  writeFileSync(absolute(log), text, { flag: "wx" });
  const tests = name === "regressions-and-mock-cli" ? Number(/\btests\s+(\d+)/.exec(text)?.[1] || 0) : undefined;
  const passed = r.status === 0 && (tests === undefined || tests >= 112);
  results.push({ name, command: [executable, ...args], exitCode: r.status, error: r.error?.message, status: passed ? "PASS" : "FAIL", tests, log, logSha256: digest(text) });
  if (name === "read-only-native-plan" && r.status === 0) preflight = JSON.parse(r.stdout);
  console.log(`${name}: ${passed ? "PASS" : "FAIL"}${tests ? ` (${tests} tests)` : ""}`);
}
verifyPins(p.m.priorFiles); const final = await validateNative();
const qa = {
  status: results.every(r => r.status === "PASS") ? "PENDING_MANUAL_OPERATOR_EXECUTION" : "FAIL_CHECKS", engineeringPassed: results.every(r => r.status === "PASS"),
  gates: { gate0: "PASS_OFFLINE_AUTH_FEATURES_AND_INPUTS", gateA: "PASS_MOCKED_ONE_OUTER_INVOCATION", gateB: "STOP_BEFORE_MANUAL_LIVE", gateC: "NOT_RUN", gateD: "NOT_RUN" },
  baseCommit: "826e0d1", branch: "feature/bo-004S-C-codex-original-painter", node: process.version, manifest: pin("docs/bologna-paint-codex-approval.json"),
  results, preflight, protectedFiles: final.protectedFiles, additionalPreservedFiles: final.additionalPreservedFiles, allPriorHashesUnchanged: true,
  actualPaintingExecProcesses: 0, realImageCallsMade: 0, internalImageCallsOnFutureRun: "UNKNOWN_NOT_HARD_CAPPED", riskFlagPassedByPreparationOrTests: false,
  diagnosticCodexCommands: ["--version", "exec --help (no inference)", "login status", "features list"],
  mockExecutablesOnly: true, mockSuccessImages: "Byte copies of existing input only, under /tmp; no model generation",
  authenticatingWith: p.m.cli.authentication, apiRunnerUsed: false, originalPaintersAndBlockersUnchanged: true,
  inputDimensionsDiscrepancy: "style.png is the original 2048x1024 reference; other three inputs and requested output are 1024x1024; no resize",
  observedAllowance: "NOT_OBSERVED_OPERATOR_STATUS_REQUIRED", usdCost: "UNKNOWN_NOT_INFERRED", paintedQualityAndHumanAcceptance: "NOT_TESTED", newResultOrComparisonProduced: false,
};
writeFileSync(absolute("docs/bologna-paint-codex-preflight-qa.json"), JSON.stringify(qa, null, 2) + "\n");
assert(qa.engineeringPassed, "See retained local check logs; do not run the operator command");
