/** Archive an interrupted attempt and stage a new authorization. Never launches a painting exec. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { absolute, digest, inventory, pin, read, validatePreflight, verifyPins, type FilePin } from "./bologna-paint-support.ts";
import { NAMES, NATIVE_ROOT, POLICY, present, regular, safePath, unusedOutputs, type NativeManifest } from "./bologna-paint-codex-core.ts";
import { chatgptAuthentication, chatgptEnvironment } from "./bologna-paint-codex-process.ts";
import { classifyInterrupted, OLD_APPROVAL_FILE, RECOVERY_APPROVAL, RECOVERY_ROOT, RECOVERY_SOURCES, verifiedCopy, type Audit, type Recovery } from "./bologna-paint-codex-recovery-core.ts";

assert.equal(process.argv.length, 2, "PREPARATION_NO_FLAGS"); assert.equal(process.version, "v24.22.3");
assert(!present(absolute(RECOVERY_ROOT)) && !present(absolute(RECOVERY_APPROVAL)), "RECOVERY_ALREADY_PREPARED_DO_NOT_OVERWRITE"); safePath(absolute(RECOVERY_ROOT));
const base = await validatePreflight(), parent = read<NativeManifest>(OLD_APPROVAL_FILE);
verifyPins(parent.priorFiles); verifyPins(parent.sources); verifyPins(parent.staged);
for (const name of ["docs/bologna-paint-codex-checksums.json", "docs/bologna-paint-api-checksums.json"]) verifyPins(read<{ files: Record<string, FilePin> }>(name).files);
const journal = regular(absolute(NATIVE_ROOT + "/attempt.jsonl")), events = journal.toString().trim().split("\n").map(s => JSON.parse(s));
const classification = classifyInterrupted(events); assert.equal(events[0].approvalHash, pin(OLD_APPROVAL_FILE).sha256);
assert.equal(events.length, 1, "EXPECTED_SINGLE_ORIGINAL_START_EVENT");
for (const file of ["raw.png", "result.json", "qa.json", "codex.stdout.log", "codex.stderr.log", "work/out.png"]) assert(!present(absolute(NATIVE_ROOT + "/" + file)), "UNEXPECTED_PRIOR_OUTPUT_REVIEW_REQUIRED");
const audit = JSON.parse(regular(absolute("docs/bologna-paint-codex-recovery-evidence.json")).toString()) as Audit;
assert.equal(audit.oldWork, absolute(parent.work)); assert.equal(audit.journalSha256, digest(journal)); assert.equal(audit.relevantProcesses.length, 0, "OLD_PROCESS_STILL_ACTIVE");
assert(Date.now() - Date.parse(audit.inspectedAt) < 15 * 60000, "EVIDENCE_AUDIT_STALE_RERUN_READ_ONLY_AUDIT");
assert.deepEqual(pin(parent.cli.executable), parent.cli.pin);
const env = chatgptEnvironment(process.env), auth = chatgptAuthentication({ file: parent.cli.executable }, absolute("."), env);
const features = spawnSync(parent.cli.executable, ["features", "list"], { env, encoding: "utf8", timeout: 15000 });
assert.equal(features.status, 0); assert(/^image_generation\s+stable\s+true$/m.test(features.stdout), "NATIVE_IMAGE_FEATURE_UNAVAILABLE");
const oldDocs = readdirSync(absolute("docs")).filter(f => /^bologna-paint-codex[.-]/.test(f) && !f.startsWith("bologna-paint-codex-recovery")).map(f => "docs/" + f);
const preservation = inventory([NATIVE_ROOT, ...oldDocs, "plans/BO-004S-C-codex-original-painter.md"]);
mkdirSync(absolute(RECOVERY_ROOT), { mode: 0o700 }); mkdirSync(absolute(RECOVERY_ROOT + "/execution/work"), { recursive: true, mode: 0o700 });
const archive = [];
for (const [original, value] of Object.entries(preservation)) {
  const copy = RECOVERY_ROOT + "/archive/evidence/" + original; verifiedCopy(absolute(original), absolute(copy), value); archive.push({ original, copy, pin: value });
}
const evidence = RECOVERY_ROOT + "/archive/session-evidence.json";
verifiedCopy(absolute("docs/bologna-paint-codex-recovery-evidence.json"), absolute(evidence), pin("docs/bologna-paint-codex-recovery-evidence.json"));
const archiveStatus = RECOVERY_ROOT + "/archive/status.json";
writeFileSync(absolute(archiveStatus), JSON.stringify({ ...classification, cause: "Operator-reported manual interruption; old wrapper has no SIGINT persistence handler and buffers logs until close", originalJournal: NATIVE_ROOT + "/attempt.jsonl", originalJournalPin: pin(NATIVE_ROOT + "/attempt.jsonl"), originalApproval: pin(OLD_APPROVAL_FILE), imageToolRequestsObserved: audit.imageToolRequestsObserved, priorUsage: "UNKNOWN_NOT_ZERO", audit: evidence, auth, archivedAt: new Date().toISOString(), originalFilesMovedDeletedOrChanged: false }, null, 2) + "\n", { flag: "wx" });
const execution = RECOVERY_ROOT + "/execution", work = execution + "/work";
for (const name of [...NAMES, "prompt.txt", "invocation-prompt.txt", "AGENTS.md"]) verifiedCopy(absolute(parent.work + "/" + name), absolute(work + "/" + name), pin(parent.work + "/" + name));
unusedOutputs(absolute(execution), absolute(work));
const forbidden = new Set([pin(OLD_APPROVAL_FILE).sha256, ...parent.previousApprovals]);
for (const file of readdirSync(absolute(NATIVE_ROOT)).filter(n => /^approval.*\.json$/.test(n))) forbidden.add(pin(NATIVE_ROOT + "/" + file).sha256);
const m: Recovery = { schema: "BO-004S-C-R1/v1", status: "PENDING_NEW_OPERATOR_APPROVAL", node: process.version,
  root: RECOVERY_ROOT, execution, work, window: [-1, -1], policy: POLICY, parentApproval: pin(OLD_APPROVAL_FILE), parentJournal: pin(NATIVE_ROOT + "/attempt.jsonl"), preservation, archive,
  archiveStatus, archiveStatusPin: pin(archiveStatus), evidence, evidencePin: pin(evidence), staged: inventory([work]), sources: Object.fromEntries(RECOVERY_SOURCES.map(path => [path, pin(path)])), forbiddenApprovalHashes: [...forbidden].sort() };
const value = JSON.stringify(m, null, 2) + "\n";
writeFileSync(absolute(RECOVERY_APPROVAL), value, { flag: "wx" }); writeFileSync(absolute(RECOVERY_ROOT + "/approval.json"), value, { flag: "wx" });
verifyPins(preservation); console.log(JSON.stringify({ status: m.status, oldStatus: classification.status, newApproval: pin(RECOVERY_APPROVAL), archivedFiles: archive.length, protectedBaselineFiles: base.protectedFiles, modelCallsByRecovery: 0, auth }, null, 2));
