/** R1 offline regressions. No live command or acknowledgement flag is passed. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { build } from "esbuild";
import { absolute, digest, pin, read, REPO, verifyPins } from "./bologna-paint-support.ts";
import { NATIVE_ROOT, present, unusedOutputs } from "./bologna-paint-codex-core.ts";
import { approveNewHash, classifyInterrupted, manualRecoveryCommand, RECOVERY_APPROVAL, RECOVERY_ROOT, validateRecovery, verifiedCopy } from "./bologna-paint-codex-recovery-core.ts";

const started = [{ event: "OUTER_EXEC_ATTEMPT_STARTED", startedAt: "2026-11-20T14:24:50.025Z" }];
test("interruption after durable journal but before spawn must not be labelled zero usage", () => {
  const r = classifyInterrupted(started); assert.equal(r.status, "INTERRUPTED_UNKNOWN_USAGE"); assert.equal(r.usage, "UNKNOWN_NOT_ZERO"); assert.equal(r.spawn, "UNKNOWN_FROM_START_ONLY_JOURNAL"); assert.equal(r.restartOldAttempt, false);
});
test("interruption after observed process spawn still preserves unknown image usage", () => {
  const r = classifyInterrupted(started, { spawnObserved: true }); assert.equal(r.status, "INTERRUPTED_UNKNOWN_USAGE"); assert.equal(r.spawn, "OBSERVED_IN_SEPARATE_EVIDENCE"); assert.equal(r.usage, "UNKNOWN_NOT_ZERO");
});
for (const mode of ["before-spawn", "after-spawn"] as const) test(`actual unchanged wrapper interrupted ${mode} archives evidence and stays locked (mock executable only)`, async () => {
  const root = mkdtempSync(join(tmpdir(), "bo004sr1-interrupt-")), work = join(root, "work"); mkdirSync(work);
  const stagedPins: Record<string, ReturnType<typeof pin>> = {};
  for (const name of ["input.png", "height.png", "style.png", "trees.png"]) {
    const to = join(work, name); copyFileSync(absolute("data/bo-004s-paint/input/" + name), to);
    const b = readFileSync(to); stagedPins[to] = { bytes: b.length, sha256: digest(b) };
  }
  const mock = join(root, "mock-only.mjs"), trace = join(root, "mock-spawn-observed"), harness = join(root, "harness.mjs");
  writeFileSync(mock, `import {writeFileSync} from 'node:fs';
if(process.argv.includes('login')){console.log('Logged in using ChatGPT');process.exit(0);}
writeFileSync(${JSON.stringify(trace)}, 'mock process spawned');process.kill(process.ppid,'SIGTERM');process.exit(0);`);
  // Injection stops the ORIGINAL backend at its spawn boundary, after its durable journal.
  // The other case starts only our local Node mock, which interrupts its wrapper parent.
  writeFileSync(harness, `import cp from 'node:child_process';import {syncBuiltinESMExports} from 'node:module';
${mode === "before-spawn" ? "cp.spawn=()=>process.exit(75);syncBuiltinESMExports();" : ""}
const {oneOuterInvocation}=await import(${JSON.stringify(absolute("docs/bologna-paint-codex-process.ts"))});
await oneOuterInvocation(${JSON.stringify({ root, work, approvalHash: "e".repeat(64), stagedPins, prompt: "mock only", executable: { file: process.execPath, prefix: [mock] }, env: { PATH: process.env.PATH }, timeoutMs: 10000 })});`);
  const r = spawnSync(process.execPath, ["--import", "tsx", harness], { cwd: REPO, encoding: "utf8", timeout: 20000 });
  if (mode === "before-spawn") assert.equal(r.status, 75, r.stderr); else assert.equal(r.signal, "SIGTERM", r.stderr);
  assert.equal(Boolean(present(trace)), mode === "after-spawn");
  const journal = join(root, "attempt.jsonl"), original = readFileSync(journal), expected = { sha256: digest(original), bytes: original.length };
  const events = original.toString().trim().split("\n").map(s => JSON.parse(s)); assert.equal(events.length, 1);
  assert.equal(classifyInterrupted(events, { spawnObserved: Boolean(present(trace)) }).status, "INTERRUPTED_UNKNOWN_USAGE");
  verifiedCopy(journal, join(root, "archive/attempt.jsonl"), expected); assert.deepEqual(readFileSync(journal), original);
  const { oneOuterInvocation } = await import("./bologna-paint-codex-process.ts");
  await assert.rejects(oneOuterInvocation({ root, work, stagedPins, approvalHash: "e".repeat(64), prompt: "mock only", executable: { file: process.execPath, prefix: [mock] }, env: { PATH: process.env.PATH } }), /PILOT_ALREADY_ATTEMPTED/);
  for (const file of ["result.json", "qa.json", "raw.png", "codex.stdout.log", "codex.stderr.log"]) assert(!present(join(root, file)));
});
test("recorded tool requests are distinguished from actual usage and billing", () => {
  const r = classifyInterrupted(started, { spawnObserved: true, imageToolRequestsObserved: 2 }); assert.equal(r.imageToolRequestsObserved, 2); assert.equal(r.usage, "UNKNOWN_NOT_ZERO");
});
test("completed or nonexistent attempt cannot use interrupted recovery classification", () => {
  assert.throws(() => classifyInterrupted([]), /NO_ATTEMPT_START/);
  assert.throws(() => classifyInterrupted([...started, { event: "OUTER_EXEC_ATTEMPT_FINISHED" }]), /FINISHED_ATTEMPT/);
});
test("verified archive copies preserve original journal bytes and refuse replacement", () => {
  const root = mkdtempSync(join(tmpdir(), "bo004sr1-archive-")), source = join(root, "attempt.jsonl"), dest = join(root, "archive/attempt.jsonl");
  const bytes = Buffer.from(JSON.stringify(started[0]) + "\n"); writeFileSync(source, bytes); const expected = { sha256: digest(bytes), bytes: bytes.length };
  verifiedCopy(source, dest, expected); assert.deepEqual(readFileSync(source), bytes); assert.deepEqual(readFileSync(dest), bytes);
  assert.throws(() => verifiedCopy(source, dest, expected), /EEXIST/); assert.deepEqual(readFileSync(source), bytes);
});
test("hash change or symlink trick cannot silently enter the preserved archive", () => {
  const root = mkdtempSync(join(tmpdir(), "bo004sr1-link-")), source = join(root, "source"), link = join(root, "link"), dest = join(root, "out"); writeFileSync(source, "evidence"); symlinkSync(source, link);
  assert.throws(() => verifiedCopy(source, dest, { sha256: "0".repeat(64), bytes: 8 }), /SOURCE_CHANGED/);
  assert.throws(() => verifiedCopy(link, dest, { sha256: digest("evidence"), bytes: 8 }), /SYMLINK/); assert(!present(dest));
});
test("fresh authorization is mandatory and every supplied previous approval is forbidden", () => {
  const fresh = "b".repeat(64), old = ["a".repeat(64), "c".repeat(64)]; approveNewHash(fresh, fresh, old);
  for (const h of old) assert.throws(() => approveNewHash(h, fresh, old), /PREVIOUS_APPROVAL/);
  assert.throws(() => approveNewHash(undefined, fresh, old), /NEW_APPROVAL_REQUIRED/);
  assert.throws(() => approveNewHash("d".repeat(64), fresh, old), /HASH_MISMATCH/);
});
test("original one-shot guard still refuses the interrupted original directory", () => {
  assert.throws(() => unusedOutputs(absolute(NATIVE_ROOT), absolute(NATIVE_ROOT + "/work")), /PILOT_ALREADY_ATTEMPTED/);
});
test("recovery preparation does not call painting and the plan has no process/provider dependency", async () => {
  const prepare = readFileSync(absolute("docs/bologna-paint-codex-recovery-prepare.ts"), "utf8");
  assert(!/oneOuterInvocation|execArgs|--execute/.test(prepare));
  const result = await build({ absWorkingDir: REPO, entryPoints: ["docs/bologna-paint-codex-recovery-plan.ts"], bundle: true, write: false, metafile: true, platform: "node", format: "esm", packages: "external" });
  for (const [p, info] of Object.entries(result.metafile!.inputs)) { assert(!/recovery-live|codex-process|paint-api/.test(p)); for (const entry of info.imports) assert(!/node:(https?|child_process)|openai/.test(entry.path)); }
});
test("new command is presented as text only and acknowledges unknown prior usage", () => {
  const text = manualRecoveryCommand("b".repeat(64)); assert(text.includes("recovery-live.ts")); assert(text.includes("--acknowledge-unknown-previous-usage")); assert(text.includes("--window=-1,-1"));
});
test("new execution validates without changing or reopening prior evidence", { skip: !present(absolute(RECOVERY_APPROVAL)) }, async () => {
  const p = await validateRecovery(); assert.equal(p.protectedFiles, 1410); assert(!p.m.forbiddenApprovalHashes.includes(p.hash)); verifyPins(p.m.preservation);
  for (const h of p.m.forbiddenApprovalHashes) assert.throws(() => approveNewHash(h, p.hash, p.m.forbiddenApprovalHashes), /PREVIOUS_APPROVAL/);
  const r = spawnSync(process.execPath, ["--permission", `--allow-fs-read=${REPO}`, `--allow-fs-read=${p.parent.cli.executable}`, "--allow-addons", "docs/bologna-paint-codex-recovery-plan.ts", "--dry-run"], { cwd: REPO, encoding: "utf8", timeout: 60000 });
  assert.equal(r.status, 0, r.stderr); const q = JSON.parse(r.stdout); assert.equal(q.writes, 0); assert.equal(q.modelCallsByRecoveryPreparation, 0);
  assert(!present(absolute(RECOVERY_ROOT + "/execution/attempt.jsonl"))); assert(!present(absolute(RECOVERY_ROOT + "/execution/raw.png")));
  assert.equal(pin(NATIVE_ROOT + "/attempt.jsonl").sha256, p.m.parentJournal.sha256);
});
