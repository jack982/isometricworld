/** Handoff hashes only; never imports the real transport or modifies prior BO-004S evidence. */
import { readdirSync, writeFileSync } from "node:fs";
import { absolute, inventory, pin } from "./bologna-paint-support.ts";
import { API_APPROVAL, API_ROOT, validateApiManifest } from "./bologna-paint-api-core.ts";
const p = await validateApiManifest();
const docs = readdirSync(absolute("docs")).filter(f => /^bologna-paint-api[.-]/.test(f) && f !== "bologna-paint-api-checksums.json").map(f => "docs/" + f);
const files = inventory([API_ROOT, ...docs]);
writeFileSync(absolute("docs/bologna-paint-api-checksums.json"), JSON.stringify({ algorithm: "sha256", approval: API_APPROVAL, approvalPin: pin(API_APPROVAL), protectedFilesUnchanged: p.protectedFiles, oldSpikeFilesUnchanged: p.originalSpikeFiles, requestsMade: 0, files }, null, 2) + "\n");
console.log(JSON.stringify({ files: Object.keys(files).length, approval: pin(API_APPROVAL) }));
