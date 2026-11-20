/** Final non-generating handoff. Never starts Codex, imports a provider or modifies prior evidence. */
import { readdirSync, writeFileSync } from "node:fs";
import { absolute, inventory, pin } from "./bologna-paint-support.ts";
import { NATIVE_MANIFEST, NATIVE_ROOT, validateNative } from "./bologna-paint-codex-core.ts";
const p = await validateNative();
const docs = readdirSync(absolute("docs")).filter(f => /^bologna-paint-codex[.-]/.test(f) && f !== "bologna-paint-codex-checksums.json").map(f => "docs/" + f);
const files = inventory([NATIVE_ROOT, ...docs]);
writeFileSync(absolute("docs/bologna-paint-codex-checksums.json"), JSON.stringify({ algorithm: "sha256", approvalManifest: NATIVE_MANIFEST, approval: pin(NATIVE_MANIFEST), baselineFilesUnchanged: p.protectedFiles, priorSpikeFilesUnchanged: p.additionalPreservedFiles, realPaintingExecProcesses: 0, files }, null, 2) + "\n");
console.log(JSON.stringify({ files: Object.keys(files).length, approval: pin(NATIVE_MANIFEST) }));
