/** BO-005P: freeze originals, validate the selected normal render, copy inputs to one fresh export root. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { manifestGrid, validateTile } from "./bologna-coverage-qa.ts";
import { openArea } from "../pipeline/src/areas.ts";
import { camera } from "../pipeline/src/camera.ts";
import { CITIES, REGIONS } from "../pipeline/src/places.ts";

const read=(p:string)=>JSON.parse(readFileSync(p,"utf8")),sha=(p:string)=>createHash("sha256").update(readFileSync(p)).digest("hex");
const root="data/bo-005p-viewer",source="data/bo-003f-landmarks",sub="/derived/piazza-maggiore/";
assert(!existsSync(root),"Preserve existing BO-005P root; do not overwrite");
const pinsFile="docs/bologna-viewer-inputs.json";
if(existsSync(pinsFile)){
  const existing=read(pinsFile);assert.equal(existing.source,source);assert.equal(existing.root,root);
  for(const [p,v]of Object.entries(existing.files)as[string,{sha256:string}][])assert.equal(sha(p),v.sha256,`Existing preservation pin changed: ${p}`);
}
const accepted=read("docs/bologna-landmark-fidelity-qa.json");assert(accepted.automatedPassed&&accepted.regressionPassed&&accepted.seamPassed);
const originalChecks=[];
for(const p of ["docs/bologna-architecture-inputs.json","docs/bologna-architecture-checksums.json","docs/bologna-landmark-fidelity-inputs.json","docs/bologna-landmark-fidelity-checksums.json"]){
  const j=read(p);let checked=0;for(const [f,v]of Object.entries(j.files)as[string,{sha256:string}][]){
    // Earlier code evolved at checkpointed commits; every historical data/proof remains immutable.
    if(!f.startsWith("data/")&&!f.startsWith("docs/"))continue;
    assert.equal(sha(f),v.sha256,`Historical artifact changed: ${f}`);checked++;
  }originalChecks.push({inventory:p,checked,dataAndDocsUnchanged:true});
}
const a=openArea("piazza-maggiore"),manifest=read(source+sub+"manifest.json");assert.deepEqual(manifest.camera,camera());assert.deepEqual(manifest.bbox,a.bbox);assert.equal(REGIONS.bologna.geoidM,39.647);assert.equal(manifest.tiles.length,10);
for(const text of ["OpenStreetMap","Comune di Bologna – SIT","Settore Ambiente e Verde","COPERNICUS","BO-003F appearance references"])assert(manifest.attributions.some((s:string)=>s.includes(text)),`Missing source attribution: ${text}`);
const tiles=[];for(const {x,y}of manifest.tiles){const c=source+sub+`render/${x}_${y}.png`,h=source+sub+`height/${x}_${y}.png`,color=await validateTile(c,1024),height=await validateTile(h,256);tiles.push({x,y,colorSha256:sha(c),heightSha256:sha(h),minAlpha:color.minAlpha,heightMinAlpha:height.minAlpha});}
const files:Record<string,{sha256:string;bytes:number}>={};
function record(p:string){if(statSync(p).isDirectory())for(const f of readdirSync(p).sort())record(p+"/"+f);else files[p]={sha256:sha(p),bytes:statSync(p).size};}
for(const p of ["data/derived/piazza-maggiore","data/bo-001r","data/bo-002-buildings","data/bo-002-trees","data/bo-003-architecture",source])record(p);
for(const f of readdirSync("docs"))if(f.startsWith("bologna-")&&!f.startsWith("bologna-viewer-"))record("docs/"+f);
for(const p of ["pipeline/src/places.ts","pipeline/src/areas.ts","pipeline/src/camera.ts","ATTRIBUTION.md","plans/BO-005P-codex-task.md"])record(p);
if(!existsSync(pinsFile))writeFileSync(pinsFile,JSON.stringify({baseCommit:"0a63773",branch:"feature/bo-005p-local-viewer",source,root,selection:"Latest complete normal procedural render; engineering accepted, landmark recognizability not independently accepted",camera:camera(),bbox:a.bbox,geoidM:39.647,configuration:{REGIONS,CITIES},tiles,grid:manifestGrid(manifest.tiles),originalChecks,files},null,2)+"\n");
mkdirSync(root);mkdirSync(root+sub,{recursive:true});for(const d of ["render","height","ground"])cpSync(source+sub+d,root+sub+d,{recursive:true,errorOnExist:true,force:false});cpSync(source+sub+"manifest.json",root+sub+"manifest.json",{errorOnExist:true,force:false});
writeFileSync(root+"/run.json",JSON.stringify({mode:"bo-005p-local-viewer",source,sourceManifestSha256:sha(source+sub+"manifest.json"),preservation:"docs/bologna-viewer-inputs.json",localRoot:resolve(root+"/web"),sourceUntouched:true,painting:false,publishing:false},null,2)+"\n");
console.log({root,source,tiles:tiles.length,protectedFiles:Object.keys(files).length,originalChecks,grid:manifestGrid(manifest.tiles)});
