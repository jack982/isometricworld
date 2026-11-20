/** Run engineering checks only. Child commands are fixed local checks, never a provider launcher. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { absolute, digest, EXPERIMENT, pin, REPO, validatePreflight } from "./bologna-paint-support.ts";

const dir = `${EXPERIMENT}/checks/${new Date().toISOString().replaceAll(":", "-")}`;
mkdirSync(absolute(dir), { recursive: true });
const results = [];
const checks: [string, string, string[]][] = [
  ["pipeline-typescript", "node_modules/.bin/tsc", ["--noEmit", "-p", "pipeline"]],
  ["web-typescript", "node_modules/.bin/tsc", ["--noEmit", "-p", "web"]],
  ["preflight-typescript", "node_modules/.bin/tsc", ["--noEmit", "--target", "es2022", "--module", "esnext", "--moduleResolution", "bundler", "--allowImportingTsExtensions", "--strict", "--skipLibCheck", "--types", "node", ...["support", "prepare", "plan", "live", "check"].map(n => `docs/bologna-paint-${n}.ts`), "docs/bologna-paint.test.ts"]],
  ["regressions-and-safety-tests", process.execPath, ["--import", "tsx", "--test", "--test-reporter=spec", "pipeline/src/bologna.test.ts", "pipeline/src/bologna-architecture.test.ts", "pipeline/src/bologna-fidelity.test.ts", "docs/bologna-coverage-qa.test.ts", "docs/bologna-architecture-qa.test.ts", "docs/bologna-viewer.test.ts", "docs/bologna-paint.test.ts"]],
  ["read-only-preflight", process.execPath, ["--permission", `--allow-fs-read=${REPO}`, "--allow-addons", "docs/bologna-paint-plan.ts", "--dry-run"]],
  ["diff-check", "git", ["diff", "--check"]],
];
let preflight: unknown;
for (const [name, cmd, args] of checks) {
  const r = spawnSync(cmd, args, { cwd: REPO, encoding: "utf8", timeout: 180000 });
  const log = `${dir}/${name}.log`, content = (r.stdout || "") + (r.stderr || "");
  writeFileSync(absolute(log), content, { flag: "wx" });
  results.push({ name, command: [cmd, ...args], exitCode: r.status, error: r.error?.message, log, logSha256: digest(content), status: r.status === 0 ? "PASS" : "FAIL" });
  if (name === "read-only-preflight" && r.status === 0) preflight = JSON.parse(r.stdout);
  console.log(`${name}: ${r.status === 0 ? "PASS" : "FAIL"}`);
}
const validation = await validatePreflight();
const summary = {
  status: results.every(r => r.status === "PASS") ? "PASS_PREPARATION" : "FAIL", node: process.version,
  results, preflight, preservation: { protectedFiles: validation.protectedFiles, allHashesUnchanged: true },
  manifestSha256: validation.hash, inputs: validation.m.inputs,
  promptSha256: validation.m.artifacts[EXPERIMENT + "/prompts/prompt.txt"].sha256,
  imageGenerationCalls: 0, providerRequests: 0, liveReady: false, nativeCallCapVerified: false,
  gates: { gate0: "SOURCE_AND_ISOLATION_PASS_NATIVE_CAP_BLOCKED", gateA: "PASS_PREPARATION", gateB: "PREFLIGHT_COMPLETE_STOP_LIVE_BLOCKED", gateC: "NOT_RUN_NOT_AUTHORIZED", gateD: "NOT_RUN", gateE: "NOT_RUN", gateF: "INCONCLUSIVE_NO_IMAGE_NO_HUMAN_REVIEW" },
  manualAcceptance: { independentHuman: "NOT_TESTED", agentInputReview: "PASS_CANDIDATE_ONLY_NOT_PAINTED_QUALITY" },
  beforeAfter: "NOT_TESTED: no generated output exists", usdSpend: "not applicable / unknown; no billable request made",
  intendedPolicy: validation.m.policy, blocker: validation.blocker,
  versions: Object.fromEntries(["sharp", "tsx", "typescript"].map(n => [n, JSON.parse(readFileSync(absolute(`node_modules/${n}/package.json`), "utf8")).version])),
  checkRunner: pin("docs/bologna-paint-check.ts"),
};
writeFileSync(absolute("docs/bologna-paint-preflight-qa.json"), JSON.stringify(summary, null, 2) + "\n");
assert.equal(summary.status, "PASS_PREPARATION", "See retained logs for actual failing checks");
