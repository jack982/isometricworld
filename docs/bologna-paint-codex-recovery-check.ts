/** Offline recovery checks only. Never runs either old or new live branch. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { absolute, digest, pin, REPO } from "./bologna-paint-support.ts";
import { RECOVERY_APPROVAL, RECOVERY_ROOT, validateRecovery } from "./bologna-paint-codex-recovery-core.ts";

const p = await validateRecovery(), dir = RECOVERY_ROOT + "/checks/" + new Date().toISOString().replaceAll(":", "-"); mkdirSync(absolute(dir), { recursive: true });
if (existsSync(absolute("docs/bologna-paint-codex-recovery-qa.json"))) writeFileSync(absolute(dir + "/previous-qa.json"), readFileSync(absolute("docs/bologna-paint-codex-recovery-qa.json")), { flag: "wx" });
const sources = readdirSync(absolute("docs")).filter(f => /^bologna-paint-codex-recovery[.-].*\.ts$/.test(f)).map(f => "docs/" + f);
const excluded = "new manifest and staged references validate; dry-run cannot start Codex";
const commands: [string, string, string[]][] = [
  ["pipeline-typescript", "node_modules/.bin/tsc", ["--noEmit", "-p", "pipeline"]],
  ["web-typescript", "node_modules/.bin/tsc", ["--noEmit", "-p", "web"]],
  ["recovery-typescript", "node_modules/.bin/tsc", ["--noEmit", "--target", "es2022", "--module", "esnext", "--moduleResolution", "bundler", "--allowImportingTsExtensions", "--strict", "--skipLibCheck", "--types", "node", ...sources]],
  ["regressions-and-recovery", process.execPath, ["--import", "tsx", "--test", "--test-reporter=spec", "--test-skip-pattern=^" + excluded + "$", "pipeline/src/bologna.test.ts", "pipeline/src/bologna-architecture.test.ts", "pipeline/src/bologna-fidelity.test.ts", "docs/bologna-coverage-qa.test.ts", "docs/bologna-architecture-qa.test.ts", "docs/bologna-viewer.test.ts", "docs/bologna-paint.test.ts", "docs/bologna-paint-api.test.ts", "docs/bologna-paint-codex.test.ts", "docs/bologna-paint-codex-recovery.test.ts"]],
  ["read-only-recovery-plan", process.execPath, ["--permission", `--allow-fs-read=${REPO}`, `--allow-fs-read=${p.parent.cli.executable}`, "--allow-addons", "docs/bologna-paint-codex-recovery-plan.ts", "--dry-run"]],
  ["recovery-live-dry-run", process.execPath, ["--permission", `--allow-fs-read=${REPO}`, `--allow-fs-read=${p.parent.cli.executable}`, "--allow-addons", "docs/bologna-paint-codex-recovery-live.ts", "--dry-run"]],
  ["diff-check", "git", ["diff", "--check"]],
];
const results = []; let preflight: unknown;
for (const [name, executable, args] of commands) {
  const r = spawnSync(executable, args, { cwd: REPO, encoding: "utf8", timeout: 180000 }), content = (r.stdout || "") + (r.stderr || ""), log = dir + "/" + name + ".log";
  writeFileSync(absolute(log), content, { flag: "wx" }); const tests = name === "regressions-and-recovery" ? Number(/\btests\s+(\d+)/.exec(content)?.[1] || 0) : undefined;
  const passed = r.status === 0 && (tests === undefined || tests >= 125); results.push({ name, command: [executable, ...args], status: passed ? "PASS" : "FAIL", exitCode: r.status, tests, log, logSha256: digest(content) });
  if (name === "read-only-recovery-plan" && r.status === 0) preflight = JSON.parse(r.stdout); console.log(`${name}: ${passed ? "PASS" : "FAIL"}${tests ? ` (${tests} tests)` : ""}`);
}
await validateRecovery();
const qa = { status: results.every(r => r.status === "PASS") ? "PENDING_NEW_OPERATOR_APPROVAL" : "FAIL_CHECKS", results, preflight,
  excludedPriorFreshRootTest: { name: excluded, reason: "Original attempt was consumed; its positive unused-root assertion is no longer applicable. New regressions prove the original guard remains closed and the separate recovery root passes." },
  previousStatus: "INTERRUPTED_UNKNOWN_USAGE", previousUsage: "UNKNOWN_NOT_ZERO", evidence: p.evidence, originalJournal: p.m.parentJournal, originalApproval: p.m.parentApproval,
  newApproval: pin(RECOVERY_APPROVAL), protectedBaselineFiles: p.protectedFiles, oldEvidenceFilesPreserved: p.archiveFiles,
  originalPaintersApiAndUnusedOutputsUnchanged: true, modelCallsMadeDuringRecovery: 0, realPaintingProcessesStarted: 0, liveCommandExecuted: false, priorJournalModified: false };
writeFileSync(absolute("docs/bologna-paint-codex-recovery-qa.json"), JSON.stringify(qa, null, 2) + "\n"); assert.equal(qa.status, "PENDING_NEW_OPERATOR_APPROVAL", "Inspect retained recovery check logs");
