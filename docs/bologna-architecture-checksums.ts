/** Snapshot this pilot, including untracked code; never mutate baseline checksum pins. */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
const files:Record<string,{sha256:string;bytes:number}>={};
function record(p:string){const s=statSync(p);if(s.isDirectory()){for(const f of readdirSync(p).sort())record(p+"/"+f);}else files[p]={sha256:createHash("sha256").update(readFileSync(p)).digest("hex"),bytes:s.size};}
record("data/bo-003-architecture");
for(const p of ["ATTRIBUTION.md","pipeline/src/bologna.ts","pipeline/page/renderer.ts","pipeline/page/ground.ts","pipeline/page/architecture.ts",...readdirSync("pipeline/src").filter(f=>/^bologna-(architecture|metadata|roofs)/.test(f)).map(f=>"pipeline/src/"+f),...readdirSync("docs").filter(f=>f.startsWith("bologna-architecture-")&&f!=="bologna-architecture-checksums.json").map(f=>"docs/"+f)])record(p);
writeFileSync("docs/bologna-architecture-checksums.json",JSON.stringify({algorithm:"sha256",baselinePins:"docs/bologna-architecture-inputs.json",files},null,2)+"\n");
console.log({files:Object.keys(files).length,baselinePins:"untouched; verified separately by Gate 0 and architecture QA"});
