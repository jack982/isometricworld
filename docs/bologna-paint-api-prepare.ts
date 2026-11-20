/** Allocate a NEW API preparation package only; no HTTP module, key read or generation call. */
import assert from "node:assert/strict";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { absolute, inventory, pin, read, validatePreflight, verifyPins, type FilePin } from "./bologna-paint-support.ts";
import { adaptPrompt, API_APPROVAL, API_ROOT, CLIENT, ENDPOINT, EXECUTION_SOURCES, existsNoFollow, INPUTS, OLD_APPROVAL, PARAMETERS, readRegular, rejectSymlinks, type Approval } from "./bologna-paint-api-core.ts";

assert.equal(process.argv.length, 2, "PREPARATION_TAKES_NO_FLAGS");
assert(!existsNoFollow(absolute(API_ROOT)) && !existsNoFollow(absolute(API_APPROVAL)), "API_PREPARATION_ALREADY_EXISTS_NO_OVERWRITE");
rejectSymlinks(absolute(API_ROOT));
const old = await validatePreflight(); assert.equal(old.hash, OLD_APPROVAL);
const previous = read<{ files: Record<string, FilePin> }>("docs/bologna-paint-checksums.json"); verifyPins(previous.files);
const priorSpikeFiles = inventory(["data/bo-004s-paint", ...readdirSync(absolute("docs")).filter(f => /^bologna-paint[.-]/.test(f) && !f.startsWith("bologna-paint-api-") && !f.startsWith("bologna-paint-api.")).map(f => "docs/" + f)]);
const prompt = adaptPrompt(readRegular(absolute("data/bo-004s-paint/prompts/prompt.txt")).toString());
mkdirSync(absolute(API_ROOT), { mode: 0o700 });
writeFileSync(absolute(API_ROOT + "/prompt.txt"), prompt, { flag: "wx", mode: 0o600 });
const created = new Date(), expires = new Date(created.getTime() + 23 * 3600000);
const m: Approval = {
  schema: "BO-004S-B1/v1", status: "PENDING_OPERATOR_APPROVAL", baseCommit: "159f432", branch: "feature/bo-004S-BE1-api-runner-task",
  area: "piazza-maggiore", window: [-1, -1], endpoint: ENDPOINT, parameters: PARAMETERS, client: CLIENT,
  proposedApprovalAt: created.toISOString(), expiresAt: expires.toISOString(), intendedRequests: 1,
  oldManifest: pin("docs/bologna-paint-input-manifest.json"), inputs: INPUTS.map(path => ({ path, pin: pin(path) })),
  prompt: { path: API_ROOT + "/prompt.txt", pin: pin(API_ROOT + "/prompt.txt") },
  sources: Object.fromEntries(EXECUTION_SOURCES.map(path => [path, pin(path)])), priorSpikeFiles,
  run: API_ROOT + "/run-minus1-minus1", ledger: API_ROOT + "/attempt-ledger.jsonl",
  references: { research: "docs/bologna-paint-api-research.json", researchPin: pin("docs/bologna-paint-api-research.json"), licences: old.m.licences, originalPrompt: pin("data/bo-004s-paint/prompts/prompt.txt"), immutableGeometry: { camera: old.m.camera, bbox: old.m.bbox, geoidM: old.m.geoidM } },
};
const encoded = JSON.stringify(m, null, 2) + "\n";
writeFileSync(absolute(API_APPROVAL), encoded, { flag: "wx" });
writeFileSync(absolute(API_ROOT + "/approval.json"), encoded, { flag: "wx", mode: 0o600 });
console.log(JSON.stringify({ status: "PENDING_OPERATOR_APPROVAL", manifest: API_APPROVAL, manifestPin: pin(API_APPROVAL), protectedFiles: old.protectedFiles, priorSpikeFiles: Object.keys(priorSpikeFiles).length, applicationRequests: 0, uploads: 0 }, null, 2));
