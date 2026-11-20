/** R1 validation and verified archive copies. Never launches a process or weakens the old guards. */
import assert from "node:assert/strict";
import { constants, closeSync, fstatSync, lstatSync, mkdirSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, parse, resolve } from "node:path";
import { absolute, digest, inventory, pin, read, validatePreflight, verifyPins, type FilePin } from "./bologna-paint-support.ts";
import { NAMES, NATIVE_ROOT, POLICY, regular, safePath, unusedOutputs, validateWindow, type NativeManifest } from "./bologna-paint-codex-core.ts";

export const RECOVERY_ROOT = "data/bo-004s-codex-recovery-r1";
export const RECOVERY_APPROVAL = "docs/bologna-paint-codex-recovery-approval.json";
export const OLD_APPROVAL_FILE = "docs/bologna-paint-codex-approval.json";
export const RECOVERY_SOURCES = ["docs/bologna-paint-codex-recovery-core.ts", "docs/bologna-paint-codex-recovery-live.ts", "docs/bologna-paint-codex-recovery-plan.ts"];
export interface Audit {
  inspectedAt: string; oldWork: string; journalSha256: string; imageToolRequestsObserved: number;
  relevantProcesses: unknown[]; matchingThreads: unknown[]; matchingRollouts: unknown[];
  status: string; previousUsage: string;
}
export interface Recovery {
  schema: "BO-004S-C-R1/v1"; status: "PENDING_NEW_OPERATOR_APPROVAL"; node: string; root: string; execution: string; work: string;
  window: [-1, -1]; policy: typeof POLICY; parentApproval: FilePin; parentJournal: FilePin;
  preservation: Record<string, FilePin>; archive: { original: string; copy: string; pin: FilePin }[];
  archiveStatus: string; archiveStatusPin: FilePin; evidence: string; evidencePin: FilePin;
  staged: Record<string, FilePin>; sources: Record<string, FilePin>; forbiddenApprovalHashes: string[];
}
export function classifyInterrupted(events: { event: string; [key: string]: unknown }[], evidence: { spawnObserved?: boolean; imageToolRequestsObserved?: number } = {}) {
  assert(events.some(e => e.event === "OUTER_EXEC_ATTEMPT_STARTED"), "NO_ATTEMPT_START");
  assert(!events.some(e => e.event === "OUTER_EXEC_ATTEMPT_FINISHED"), "FINISHED_ATTEMPT_NOT_RECOVERABLE_AS_INTERRUPTED");
  return { status: "INTERRUPTED_UNKNOWN_USAGE", spawn: evidence.spawnObserved ? "OBSERVED_IN_SEPARATE_EVIDENCE" : "UNKNOWN_FROM_START_ONLY_JOURNAL", imageToolRequestsObserved: evidence.imageToolRequestsObserved ?? 0, usage: "UNKNOWN_NOT_ZERO", restartOldAttempt: false };
}
export function approveNewHash(actual: string | undefined, expected: string, forbidden: string[]) {
  assert(actual && /^[a-f0-9]{64}$/.test(actual), "NEW_APPROVAL_REQUIRED");
  assert(!forbidden.includes(actual), "PREVIOUS_APPROVAL_CANNOT_AUTHORIZE_RECOVERY"); assert.equal(actual, expected, "RECOVERY_APPROVAL_HASH_MISMATCH");
}
export function verifiedCopy(source: string, target: string, expected: FilePin) {
  for (const path of [source, target]) {
    let at = parse(resolve(path)).root;
    for (const part of resolve(path).slice(at.length).split("/").filter(Boolean)) {
      at = join(at, part);
      try { assert(!lstatSync(at).isSymbolicLink(), "ARCHIVE_PARENT_OR_FILE_SYMLINK"); }
      catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; }
    }
  }
  assert(!lstatSync(source).isSymbolicLink(), "ARCHIVE_SOURCE_SYMLINK");
  const fd = openSync(source, constants.O_RDONLY | constants.O_NOFOLLOW); let bytes: Buffer;
  try { assert(fstatSync(fd).isFile()); bytes = readFileSync(fd); } finally { closeSync(fd); }
  assert.deepEqual({ sha256: digest(bytes), bytes: bytes.length }, expected, "SOURCE_CHANGED_DURING_ARCHIVE");
  mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, bytes, { flag: "wx", mode: 0o600 });
  assert.equal(digest(readFileSync(target)), expected.sha256, "ARCHIVE_COPY_MISMATCH");
}
export async function validateRecovery() {
  const base = await validatePreflight();
  const data = regular(absolute(RECOVERY_APPROVAL)), hash = digest(data), m = JSON.parse(data.toString()) as Recovery;
  assert.equal(m.schema, "BO-004S-C-R1/v1"); assert.equal(m.status, "PENDING_NEW_OPERATOR_APPROVAL"); assert.equal(process.version, m.node);
  assert.equal(m.root, RECOVERY_ROOT); assert.equal(m.execution, RECOVERY_ROOT + "/execution"); assert.equal(m.work, m.execution + "/work"); validateWindow(m.window); assert.deepEqual(m.policy, POLICY);
  assert.deepEqual(m.parentApproval, pin(OLD_APPROVAL_FILE)); assert.deepEqual(m.parentJournal, pin(NATIVE_ROOT + "/attempt.jsonl"));
  const parent = read<NativeManifest>(OLD_APPROVAL_FILE); verifyPins(parent.sources); verifyPins(parent.staged); verifyPins(parent.priorFiles); verifyPins(m.preservation);
  assert.deepEqual(m.archive.map(item => item.original).sort(), Object.keys(m.preservation).sort(), "ARCHIVE_MUST_CONTAIN_ALL_PREVIOUS_EVIDENCE");
  const archivedStatus = read<{ status: string }>(m.archiveStatus); assert.equal(archivedStatus.status, "INTERRUPTED_UNKNOWN_USAGE"); assert.deepEqual(pin(m.archiveStatus), m.archiveStatusPin);
  assert.deepEqual(pin(m.evidence), m.evidencePin); const evidence = read<Audit>(m.evidence); assert.equal(evidence.status, "INTERRUPTED_UNKNOWN_USAGE"); assert.equal(evidence.relevantProcesses.length, 0);
  assert.equal(evidence.journalSha256, m.parentJournal.sha256);
  const journal = regular(absolute(NATIVE_ROOT + "/attempt.jsonl")).toString().trim().split("\n").map(s => JSON.parse(s)); classifyInterrupted(journal);
  for (const item of m.archive) { assert.equal(item.pin.sha256, m.preservation[item.original]?.sha256); assert(item.copy.startsWith(RECOVERY_ROOT + "/archive/")); safePath(absolute(item.copy)); assert.deepEqual(pin(item.copy), item.pin); }
  assert.deepEqual(Object.keys(m.sources).sort(), RECOVERY_SOURCES.slice().sort()); verifyPins(m.sources); verifyPins(m.staged);
  for (const name of [...NAMES, "prompt.txt", "invocation-prompt.txt", "AGENTS.md"]) assert.deepEqual(pin(m.work + "/" + name), pin(parent.work + "/" + name), "RECOVERY_INPUT_OR_PROMPT_CHANGED");
  const expectedOldFiles = Object.keys(m.preservation).filter(p => p.startsWith(NATIVE_ROOT + "/")).sort();
  assert.deepEqual(Object.keys(inventory([NATIVE_ROOT])).sort(), expectedOldFiles, "OLD_ATTEMPT_GAINED_OR_LOST_EVIDENCE");
  assert(m.forbiddenApprovalHashes.includes(m.parentApproval.sha256)); for (const old of parent.previousApprovals) assert(m.forbiddenApprovalHashes.includes(old));
  assert(!m.forbiddenApprovalHashes.includes(hash), "RECOVERY_MUST_HAVE_NEW_HASH");
  unusedOutputs(absolute(m.execution), absolute(m.work)); // unchanged original guard on NEW execution only
  assert.deepEqual(pin(parent.cli.executable), parent.cli.pin, "CLI_CHANGED_REINSPECT_BEFORE_NEW_APPROVAL");
  const roots = base.m.protectedRoots.filter(p => p.existed).map(p => p.path);
  assert.deepEqual(Object.keys(inventory(roots)).sort(), Object.keys(base.m.preservation).filter(p => roots.some(r => p.startsWith(r + "/"))).sort());
  return { m, parent, hash, protectedFiles: base.protectedFiles, archiveFiles: m.archive.length, evidence };
}
export const manualRecoveryCommand = (hash: string) => `node --import tsx docs/bologna-paint-codex-recovery-live.ts --execute --window=-1,-1 --approve=${hash} --acknowledge-internal-call-risk --acknowledge-unknown-previous-usage`;
