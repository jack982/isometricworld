/** Snapshot the BO-005P local artifact and changed/untracked source; excludes this manifest itself. */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
const files:Record<string,{sha256:string;bytes:number}>={};
function record(p:string){const s=statSync(p);if(s.isDirectory())for(const f of readdirSync(p).sort())record(p+"/"+f);else files[p]={sha256:createHash("sha256").update(readFileSync(p)).digest("hex"),bytes:s.size};}
record("data/bo-005p-viewer");
for(const p of ["README.md","pipeline/src/export.ts","pipeline/src/export-mode.ts","web/astro.config.mjs","web/local-map.ts","web/src/env.d.ts","web/src/components/MapPage.astro","web/src/scripts/map.ts",...readdirSync("docs").filter(f=>f.startsWith("bologna-viewer-")&&f!=="bologna-viewer-checksums.json"&&f!=="bologna-viewer-spike.md").map(f=>"docs/"+f),"docs/bologna-viewer-spike.md"])record(p);
writeFileSync("docs/bologna-viewer-checksums.json",JSON.stringify({algorithm:"sha256",baselinePins:"docs/bologna-viewer-inputs.json",files},null,2)+"\n");console.log({files:Object.keys(files).length});
