/** Final handoff inventory, never provider execution or source writes. */
import assert from "node:assert/strict";
import { readdirSync, writeFileSync } from "node:fs";
import { absolute, EXPERIMENT, inventory, MANIFEST, pin, validatePreflight } from "./bologna-paint-support.ts";

const q = await validatePreflight();
const protectedRoots = q.m.protectedRoots.filter(p => p.existed).map(p => p.path);
const current = inventory(protectedRoots);
const original = Object.keys(q.m.preservation).filter(p => protectedRoots.some(root => p.startsWith(root + "/"))).sort();
assert.deepEqual(Object.keys(current).sort(), original, "Protected roots gained or lost files");
const docs = readdirSync(absolute("docs")).filter(f => /^bologna-paint[.-]/.test(f) && f !== "bologna-paint-checksums.json").map(f => "docs/" + f);
const files = inventory([EXPERIMENT, ...docs]);
writeFileSync(absolute("docs/bologna-paint-checksums.json"), JSON.stringify({
  algorithm: "sha256", approvalManifest: MANIFEST, approvalManifestSha256: pin(MANIFEST).sha256,
  protectedPriorFiles: q.protectedFiles, protectedRootMembershipUnchanged: true,
  generationCalls: 0, liveReady: false, files,
}, null, 2) + "\n");
console.log({ files: Object.keys(files).length, protectedPriorFiles: q.protectedFiles, approvalManifestSha256: q.hash });
