/** BO-003F handoff checksum inventory, including untracked code and all local outputs. */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
const files:Record<string,{sha256:string;bytes:number}>={};
function record(p:string){const s=statSync(p);if(s.isDirectory())for(const f of readdirSync(p).sort())record(p+"/"+f);else files[p]={sha256:createHash("sha256").update(readFileSync(p)).digest("hex"),bytes:s.size};}
record("data/bo-003f-landmarks");
for(const p of ["ATTRIBUTION.md","pipeline/page/renderer.ts","pipeline/page/neutral.ts","pipeline/src/render.ts","pipeline/src/places.ts","pipeline/src/bologna-metadata.ts","pipeline/src/bologna-roofs.ts","web/src/scripts/map.ts",...readdirSync("pipeline/src").filter(f=>f.startsWith("bologna-fidelity")).map(f=>"pipeline/src/"+f),...readdirSync("docs").filter(f=>f.startsWith("bologna-landmark-fidelity-")&&f!=="bologna-landmark-fidelity-checksums.json").map(f=>"docs/"+f)])record(p);
writeFileSync("docs/bologna-landmark-fidelity-checksums.json",JSON.stringify({algorithm:"sha256",baseCommit:"1444694f9d9e08db7276b195ee894572f8557c62",originalInventory:"docs/bologna-landmark-fidelity-inputs.json",files},null,2)+"\n");console.log({files:Object.keys(files).length});
