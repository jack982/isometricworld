/** One bounded architectural pilot, copied from accepted BO-002 trees. No baseline recomputation. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { openArea } from "./areas.ts";
import { CAMERA, camera, enuToPixel } from "./camera.ts";
import { REGIONS } from "./places.ts";
import { architectureRoot } from "./bologna-architecture-safety.ts";
import { buildRoof, porticoPlan } from "./bologna-roofs.ts";
import { tuple, type Volume, type BuildingTuple } from "./bologna.ts";
import { bounds } from "./bologna-geometry.ts";
import type { PorticoPlan, RoofPlan } from "./bologna-metadata.ts";
const read=(p:string)=>JSON.parse(readFileSync(p,"utf8")),sha=(p:string)=>createHash("sha256").update(readFileSync(p)).digest("hex"),save=(p:string,x:unknown)=>writeFileSync(p,JSON.stringify(x,null,2)+"\n");
const command=process.argv[2]??"build",root=architectureRoot(process.env.PIPELINE_DATA_ROOT,command==="build"&&existsSync(process.env.PIPELINE_DATA_ROOT??""));
const base="data/bo-002-trees",sub="/derived/piazza-maggiore/",rawSub="/raw/piazza-maggiore/",audit=read("docs/bologna-architecture-gate0.json"),pinned=read("docs/bologna-architecture-inputs.json");
assert(audit.gate0Passed,"Gate 0 not passed");openArea("piazza-maggiore");
assert.deepEqual(camera(),audit.camera,"Frozen camera changed");assert.equal(REGIONS.bologna.geoidM,audit.geoidM,"Frozen geoid changed");
for(const [p,v]of Object.entries(pinned.files)as[string,{sha256:string}][])assert.equal(sha(p),v.sha256,`Protected input changed: ${p}`);
if(command==="build"){
  mkdirSync(join(root,"raw"),{recursive:true});mkdirSync(join(root,"derived","piazza-maggiore"),{recursive:true});
  cpSync((base+rawSub).replace(/\/$/,""),(root+rawSub).replace(/\/$/,""),{recursive:true,errorOnExist:true,force:false});
  cpSync(base+sub+"ground",root+sub+"ground",{recursive:true,errorOnExist:true,force:false});
  const volumes:Volume[]=read(base+rawSub+"municipal-buildings.json"),byId=new Map(volumes.filter(v=>v.source==="ctc").map(v=>[v.id,v]));
  const specifications=new Map<string,NonNullable<NonNullable<BuildingTuple[5]>["architecture"]>>();
  for(const identity of audit.identities.slice(0,2))for(const item of identity.selected){
    const v=byId.get(item.id);assert(v&&v.properties.codice_ogg===item.ctcId,"Unverified landmark volume");
    let method:RoofPlan["method"]="flat",uplift=0;
    if(identity.key==="san-petronio"&&[17871,31864,17875].includes(item.ctcId)){method="gable-estimate";uplift=item.ctcId===17871?3.5:2;}
    if(identity.key==="palazzo-accursio"){method="segmented-hip-estimate";uplift=2;}
    const b=bounds(v.poly),centre=[(b[0]+b[2])/2,(b[1]+b[3])/2],front=[-centre[0],-centre[1]],L=Math.hypot(...front);
    specifications.set(v.id,{sourceId:v.id,material:identity.key==="san-petronio"?"san-petronio":"palazzo",landmark:identity.key,frontNormal:[front[0]/L,front[1]/L],roof:buildRoof(v.poly,method,uplift,true)});
  }
  for(const [i,id]of ["ctc/61450/0/piece0","ctc/35700/0/piece0"].entries()){
    assert(audit.ordinaryCandidates.some((v:any)=>v.id===id),"Ordinary example not audited");const v=byId.get(id)!;
    specifications.set(id,{sourceId:id,material:i?"brick":"plaster",roof:buildRoof(v.poly,i?"hipped-estimate":"gable-estimate",1.8)});
  }
  const portico=porticoPlan(audit.porticoes.find((p:any)=>p.ctcId===21018));
  const bins=new Map<string,{b:BuildingTuple[];t:number[][];p:PorticoPlan[]}>();
  const add=(pts:number[][],fn:(bin:{b:BuildingTuple[];t:number[][];p:PorticoPlan[]})=>void)=>{
    const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);for(let y=Math.floor((Math.min(...ys)-8)/CAMERA.tile);y<=Math.floor((Math.max(...ys)+8)/CAMERA.tile);y++)for(let x=Math.floor((Math.min(...xs)-8)/CAMERA.tile);x<=Math.floor((Math.max(...xs)+8)/CAMERA.tile);x++){const k=`${x}_${y}`;if(!bins.has(k))bins.set(k,{b:[],t:[],p:[]});fn(bins.get(k)!);}
  };
  const report=read(base+"/adapter-report.json"),terrain=new Map(report.terrain.map((t:any)=>[t.id,t]));
  const roofReports:any[]=[],metadataIds=new Set<string>();
  for(const v of volumes){
    const b=tuple(v,v.source==="ctc"),spec=specifications.get(v.id),t:any=terrain.get(v.id);assert(t,"Missing terrain audit");
    if(v.source==="ctc"){assert(!metadataIds.has(v.id),"Duplicate source identity");metadataIds.add(v.id);}
    if(spec){b[5]!.pilot="bo-003";b[5]!.architecture=spec;roofReports.push({id:v.id,ctcId:v.properties.codice_ogg,material:spec.material,landmark:spec.landmark,method:spec.roof.method,estimated:true,upliftM:spec.roof.upliftM,triangles:spec.roof.triangles.length/9,sourceEaveM:v.h,reason:spec.roof.reason});}
    const lo=t.groundMin-3,hi=t.groundMax+3+v.h+(spec?.roof.upliftM??0),pts=v.poly.flat().flatMap(([x,y])=>[enuToPixel([x,y,lo]),enuToPixel([x,y,hi])]);add(pts,bin=>bin.b.push(b));
  }
  // Retain the exact accepted tree tuples and bin footprints; no species or size change.
  const treeMap=new Map<string,number[]>();
  for(const f of readdirSync(base+sub+"scene")){const original=read(base+sub+"scene/"+f);for(const t of original.t)treeMap.set(JSON.stringify(t),t);const bin=bins.get(f.replace(/\.json$/,""));if(bin)bin.t=original.t;else bins.set(f.replace(/\.json$/,""),{b:[],t:original.t,p:[]});}
  assert.equal(treeMap.size,784);
  const pb=portico.poly.flat(),samples=pb.map(([x,y])=>{
    // Portico ground range was pinned during Gate 0; conservative global terrain envelope covers it.
    return [enuToPixel([x,y,70]),enuToPixel([x,y,120])];
  }).flat();add(samples,bin=>bin.p.push(portico));
  mkdirSync(root+sub+"scene");for(const [name,bin]of bins)save(root+sub+"scene/"+name+".json",bin.p.length?bin:{b:bin.b,t:bin.t});
  save(root+"/architecture.json",{mode:"bo-003-architecture",source:"accepted BO-002 tree stage; verified CTC IDs",buildingParts:volumes.length,ctcIdsWithMetadata:metadataIds.size,sourceHoles:712,trees:treeMap.size,roofReports,portico,scope:"Two landmark sets, two ordinary examples, one portico only",estimatedRoofRise:true,sourceSnapshotHashes:read(base+"/run.json").municipalSnapshots});
  save(root+"/run.json",{mode:"bo-003-architecture",inputsManifest:"docs/bologna-architecture-inputs.json",camera:audit.camera,bbox:audit.bbox,geoidM:39.647,groundSha256:sha(root+sub+"ground/height.bin"),baselineManifestSha256:sha(base+sub+"manifest.json")});
  console.log({root,buildings:volumes.length,metadata:metadataIds.size,pilotParts:specifications.size,portico:portico.id,columns:portico.columns.length,trees:treeMap.size});
}else if(command==="render"){
  assert.equal(read(root+"/run.json").mode,"bo-003-architecture");
  execFileSync(process.execPath,["--import","tsx","pipeline/src/render.ts","piazza-maggiore","-j","2"],{stdio:"inherit",env:process.env});
  const p=root+sub+"manifest.json",manifest=read(p),baseline=read(base+sub+"manifest.json");
  manifest.attributions=[...baseline.attributions,"BO-003 procedural pilot: estimated roofs and portico clearance; no measured ridge/column claim"];
  manifest.credits=baseline.credits;manifest.buildingSource=baseline.buildingSource;manifest.architectureMode="bo-003-architecture";save(p,manifest);
}else if(command==="regressions"){
  for(const [name,source]of [["osm","data/bo-001r"],["ctc","data/bo-002-buildings"],["trees",base]]){
    const destination=join(root,"verification",name);if(existsSync(destination))throw Error("Verification root already exists; preserve it");
    mkdirSync(destination+sub,{recursive:true});cpSync(source+sub+"ground",destination+sub+"ground",{recursive:true,errorOnExist:true,force:false});cpSync(source+sub+"scene",destination+sub+"scene",{recursive:true,errorOnExist:true,force:false});
    execFileSync(process.execPath,["--import","tsx","pipeline/src/render.ts","piazza-maggiore","-j","2"],{stdio:"inherit",env:{...process.env,PIPELINE_DATA_ROOT:destination}});
  }
}else throw Error("Use build, render or regressions");
