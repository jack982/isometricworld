/** Read-only final evidence verification; optional exclusive new handoff checksum creation. */
import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { abs, inventory, pin, read, ROOT, save, verify } from "./bologna-roof-common.ts";
import { validateObservation } from "./bologna-roof-benchmark.ts";
import { validateMapResponse } from "./bologna-roof-wms.ts";
import { bytes } from "./bologna-roof-common.ts";
const n=verify(read(ROOT+"/preservation.json").files),samples=read("docs/bologna-roof-sample.json").samples;assert.equal(samples.length,20);samples.forEach(validateObservation);
assert.equal(read("data/bo-004s-codex-recovery-r1/execution/result.json").status,"FAILED_NO_RETRY");
const plan=read(ROOT+"/wms-plan.json");await validateMapResponse(200,"image/png",bytes(ROOT+"/references/ortho-cluster.png"),plan.width,plan.height);
const handoff="docs/bologna-roof-checksums.json";if(process.argv[2]==="--freeze"){assert.equal(process.argv.length,3);assert(!existsSync(abs(handoff)),"HANDOFF_EXISTS_VERIFY_ONLY");const docs=readdirSync(abs("docs")).filter(n=>n.startsWith("bologna-roof-")&&n!=="bologna-roof-checksums.json").map(n=>"docs/"+n);const files=inventory([ROOT,...docs,"plans/BO-006P0-roof-truth-visual-benchmark.md"]);save(handoff,{algorithm:"sha256",files,protectedPreviousFiles:n,providerImageRequests:0,humanAcceptance:"PENDING"});console.log(JSON.stringify({newInventoryFiles:Object.keys(files).length}));}
else{assert.equal(process.argv.length,2);if(existsSync(abs(handoff)))verify(read(handoff).files);console.log(JSON.stringify({protectedFiles:n,samples:20,raw:pin("data/bo-004s-codex-recovery-r1/execution/raw.png"),historicalStatus:"FAILED_NO_RETRY",humanAcceptance:"PENDING",imageGenerationRequests:0}));}
