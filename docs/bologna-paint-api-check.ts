/** Fixed offline engineering commands only. Does not import or execute the live runner/transport. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { absolute, digest, inventory, pin, REPO, verifyPins } from "./bologna-paint-support.ts";
import { API_APPROVAL, API_ROOT, environmentStatus, existsNoFollow, validateApiManifest } from "./bologna-paint-api-core.ts";

const p = await validateApiManifest();
const dir = `${API_ROOT}/checks/${new Date().toISOString().replaceAll(":", "-")}`;
mkdirSync(absolute(dir), { recursive: true });
const newSources = readdirSync(absolute("docs")).filter(f => /^bologna-paint-api[.-].*\.ts$/.test(f)).map(f => "docs/" + f);
const commands: [string, string, string[]][] = [
  ["pipeline-typescript", "node_modules/.bin/tsc", ["--noEmit", "-p", "pipeline"]],
  ["web-typescript", "node_modules/.bin/tsc", ["--noEmit", "-p", "web"]],
  ["spike-typescript", "node_modules/.bin/tsc", ["--noEmit", "--target", "es2022", "--module", "esnext", "--moduleResolution", "bundler", "--allowImportingTsExtensions", "--strict", "--skipLibCheck", "--types", "node", ...newSources]],
  ["regressions-and-mocked-http", process.execPath, ["--import", "tsx", "--test", "--test-reporter=spec", "pipeline/src/bologna.test.ts", "pipeline/src/bologna-architecture.test.ts", "pipeline/src/bologna-fidelity.test.ts", "docs/bologna-coverage-qa.test.ts", "docs/bologna-architecture-qa.test.ts", "docs/bologna-viewer.test.ts", "docs/bologna-paint.test.ts", "docs/bologna-paint-api.test.ts"]],
  ["read-only-preflight", process.execPath, ["--permission", `--allow-fs-read=${REPO}`, "--allow-addons", "docs/bologna-paint-api-plan.ts", "--dry-run"]],
  ["diff-check", "git", ["diff", "--check"]],
];
const results = []; let preflight: unknown;
for (const [name, command, args] of commands) {
  const result = spawnSync(command, args, { cwd: REPO, encoding: "utf8", timeout: 180000 });
  const log = `${dir}/${name}.log`, content = (result.stdout || "") + (result.stderr || "");
  writeFileSync(absolute(log), content, { flag: "wx" });
  const tests = name === "regressions-and-mocked-http" ? Number(/\btests\s+(\d+)/.exec(content)?.[1] || 0) : undefined;
  const passed = result.status === 0 && (tests === undefined || tests >= 90);
  results.push({ name, command: [command, ...args], exitCode: result.status, error: result.error?.message, tests, status: passed ? "PASS" : "FAIL", log, logSha256: digest(content) });
  if (name === "read-only-preflight" && result.status === 0) preflight = JSON.parse(result.stdout);
  console.log(`${name}: ${passed ? "PASS" : "FAIL"}${tests ? ` (${tests} tests)` : ""}`);
}
assert.equal(verifyPins(p.m.priorSpikeFiles), p.originalSpikeFiles);
assert(!existsNoFollow(absolute(p.m.run))); assert(!existsNoFollow(absolute(p.m.ledger)));
const qa = {
  status: results.every(r => r.status === "PASS") ? "PENDING_OPERATOR_APPROVAL" : "FAIL_CHECKS", engineeringPassed: results.every(r => r.status === "PASS"),
  baseCommit: "159f432", branch: "feature/bo-004S-BE1-api-runner-task", node: process.version,
  approvalManifest: API_APPROVAL, approvalManifestPin: pin(API_APPROVAL), preflight, results,
  inputs: p.imageChecks, prompt: p.prompt, runnerSources: p.m.sources, research: p.m.references,
  protectedFiles: p.protectedFiles, originalSpikeFiles: p.originalSpikeFiles, allPriorHashesUnchanged: true,
  credentialStatus: environmentStatus(process.env), providerRequests: 0, providerUploads: 0, modelOutputsGenerated: 0,
  mockOutputNote: "Success mocks reuse the original input bytes; malformed/alpha/size test fixtures remain only under /tmp. No image model or real HTTP transport ran.",
  sdk: { name: "none", transport: "Node built-in https", version: process.version, maxRetries: 0 },
  postGenerationQA: { implemented: true, executedOnProviderOutput: false, anchorCount: 9, automatedFidelityPass: false, semantics: "review triggers only; human validation required", rawAndRegisteredPreserved: "planned isolated QA files", independentHumanAcceptance: "NOT_TESTED", actualProviderUsage: "NOT_TESTED", actualBilledCost: "UNKNOWN_NO_REQUEST" },
  changes: newSources, unmodifiedNormalPainter: true, unmodifiedNativeLiveGate: true,
  commandsNotRun: ["Images API live request", "Codex image generation", "fal", "publish", "deploy", "export", "archive", "commit"],
};
writeFileSync(absolute("docs/bologna-paint-api-qa.json"), JSON.stringify(qa, null, 2) + "\n");
assert(qa.engineeringPassed, "See retained check logs; provider execution remains unauthorized");
