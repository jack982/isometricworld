/** Fresh BO-003F root only. Copies accepted inputs; never clears a directory or refetches GIS. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { camera } from "./camera.ts";
import { openArea } from "./areas.ts";
import { REGIONS, CITIES } from "./places.ts";
import { estimatedShedRoof, ROOF_REFERENCE } from "./bologna-fidelity.ts";
import { fidelityRoot, SHED_IDS } from "./bologna-fidelity-safety.ts";
import type { BuildingMetadata } from "./bologna-metadata.ts";
import type { Volume } from "./bologna.ts";

const read=(p:string)=>JSON.parse(readFileSync(p,"utf8")),sha=(p:string)=>createHash("sha256").update(readFileSync(p)).digest("hex"),save=(p:string,x:unknown)=>writeFileSync(p,JSON.stringify(x,null,2)+"\n");
const command=process.argv[2]??"init",root=fidelityRoot(process.env.PIPELINE_DATA_ROOT,existsSync(process.env.PIPELINE_DATA_ROOT??""),command==="init"),base="data/bo-003-architecture",sub="derived/piazza-maggiore",pins=read("docs/bologna-landmark-fidelity-inputs.json"),audit=read("docs/bologna-landmark-fidelity-audit.json");
for(const [p,v]of Object.entries(pins.files)as[string,{sha256:string}][])if(p!=="pipeline/src/places.ts")assert.equal(sha(p),v.sha256,`Protected artifact changed: ${p}`);
const configuration=read("docs/bologna-landmark-fidelity-configuration.json"),regions=structuredClone(REGIONS);delete regions.bologna.creditsBySource!.fidelity;assert.deepEqual(regions,configuration.REGIONS);assert.deepEqual(CITIES,configuration.CITIES);
const a=openArea("piazza-maggiore");assert.deepEqual(camera(),audit.camera);assert.deepEqual(a.bbox,audit.bbox);assert.equal(REGIONS.bologna.geoidM,39.647);
if(command==="init"){
  assert.equal(audit.gate0,"AUDIT_COMPLETE_WITH_SCOPED_EXCEPTIONS");mkdirSync(root);mkdirSync(join(root,"references"));
  const refs=[];for(const [key,title,author,date]of [["facade","Basilica_di_San_Petronio,_facciata.jpg","Congolandia.g","2019-02-24"],["clock","Torre_dell'Orologio_(Bologna).jpg","Raffacossa","2017-05-05"],["roof","Bologna_Torre_degli_Asinelli_Vista_su_Basilica_di_San_Petronio_2.jpg","Zairon","2022-04-27"]]){
    const file=join(root,"references",key+".jpg"),original="/tmp/bo-003f-references/"+key+".jpg",m=createHash("md5").update(title).digest("hex");
    assert(existsSync(original),`Acquire the licensed original first: ${title}`);cpSync(original,file,{errorOnExist:true,force:false});assert.equal(sha(original),sha(file));
    refs.push({key,title,author,photographDate:date,retrievedAt:new Date().toISOString(),url:`https://upload.wikimedia.org/wikipedia/commons/${m[0]}/${m.slice(0,2)}/${encodeURIComponent(title)}`,sourcePage:`https://commons.wikimedia.org/wiki/File:${encodeURIComponent(title)}`,license:"CC BY-SA 4.0",licenseUrl:"https://creativecommons.org/licenses/by-sa/4.0/",use:key==="roof"?"Appearance-only topology proposal; no image pixels/tracing/metric fitting":"Inspection only; no facade or clock mesh imported",file,sha256:sha(file),bytes:statSync(file).size,downloadStatus:"complete",originalUnmodified:true});
  }
  save(join(root,"references/provenance.json"),{references:refs,downloadCommand:"curl --fail --location --retry 1 --connect-timeout 20 --max-time 90 --user-agent IsometricWorld-BO003F-source-audit/1.0 --output <file> <url>",sandboxAttempt:"DNS resolution failed; approved network retry completed all three originals",gisDownloads:"none; pinned BO-001R/002/003 retained"});
  save(join(root,"run.json"),{mode:"bo-003f-landmarks",stage:"audit",base,baseCommit:pins.baseCommit,auditSha256:sha("docs/bologna-landmark-fidelity-audit.json"),camera:audit.camera,bbox:audit.bbox,geoidM:39.647});
}else{
  const run=read(join(root,"run.json"));assert.equal(run.mode,"bo-003f-landmarks");assert.equal(run.auditSha256,sha("docs/bologna-landmark-fidelity-audit.json"));
  if(command==="build"){
    assert.equal(run.stage,"audit");assert(!existsSync(join(root,"derived")),"Never overwrite an existing scene");
    mkdirSync(join(root,sub),{recursive:true});cpSync(join(base,sub,"ground"),join(root,sub,"ground"),{recursive:true,errorOnExist:true,force:false});cpSync(join(base,"raw"),join(root,"raw"),{recursive:true,errorOnExist:true,force:false});
    const volumes:Volume[]=read(join(base,"raw/piazza-maggiore/municipal-buildings.json")),nave=volumes.find(v=>v.id==="ctc/17871/0/piece0")!,byId=new Map(volumes.map(v=>[v.id,v])),changed=new Map<string,unknown>();
    mkdirSync(join(root,sub,"scene"));
    for(const f of readdirSync(join(base,sub,"scene"))){const bin=read(join(base,sub,"scene",f));for(const tuple of bin.b){const meta:BuildingMetadata|undefined=tuple[5];if(!meta||!SHED_IDS.includes(meta.ctcId as typeof SHED_IDS[number]))continue;const v=byId.get(meta.id)!;assert(v&&meta.architecture?.sourceId===v.id);assert(audit.parts.some((p:any)=>p.id===v.id&&p.landmarkAssociation.startsWith("verified")));
      meta.architecture.roof=estimatedShedRoof(meta,v.poly,nave.poly);meta.architecture.refinement={mode:"bo-003f",evidence:"appearance-only",measured:false,reference:ROOF_REFERENCE};changed.set(meta.id,{id:meta.id,sourceEaveM:v.h,roof:meta.architecture.roof});
    }save(join(root,sub,"scene",f),bin);}
    assert.equal(changed.size,4);save(join(root,"proposal.json"),{mode:"bounded-roof-topology-proposal",sourceIds:[...changed.keys()],roofReports:[...changed.values()],measured:false,unchanged:["nave","palace","clock","façade","portico","ordinary buildings","trees","source footprints/eaves","terrain"]});run.stage="built";save(join(root,"run.json"),run);
  }else if(["render","neutral","regressions"].includes(command)){
    assert.equal(run.stage,"built");
    const render=(destination:string,neutral=false)=>{
      execFileSync(process.execPath,["--import","tsx","pipeline/src/render.ts","piazza-maggiore","-j","2",...(neutral?["--materials","neutral"]:[])],{stdio:"inherit",env:{...process.env,PIPELINE_DATA_ROOT:destination}});
      const p=join(destination,sub,"manifest.json"),manifest=read(p),baseline=read(join(base,sub,"manifest.json"));
      manifest.attributions=[...baseline.attributions,...REGIONS.bologna.creditsBySource!.fidelity];manifest.credits=[...baseline.credits,...REGIONS.bologna.creditsBySource!.fidelity];manifest.buildingSource=baseline.buildingSource;manifest.fidelityMode=neutral?"neutral-material-control":"appearance-only-shed-proposal";manifest.measuredFidelity=false;save(p,manifest);
    };
    const clone=(source:string,destination:string)=>{assert(!existsSync(destination),"Preserve existing control/regression root");mkdirSync(join(destination,sub),{recursive:true});for(const layer of ["ground","scene"])cpSync(join(source,sub,layer),join(destination,sub,layer),{recursive:true,errorOnExist:true,force:false});};
    if(command==="render")render(root);
    if(command==="neutral")for(const [name,source]of [["before",base],["after",root]]){const dest=join(root,"controls",name);clone(source,dest);render(dest,true);}
    if(command==="regressions")for(const [name,source]of [["original","data"],["osm","data/bo-001r"],["buildings","data/bo-002-buildings"],["trees","data/bo-002-trees"],["architecture",base]]){
      const dest=join(root,"verification",name);clone(source,dest);
      execFileSync(process.execPath,["--import","tsx","pipeline/src/render.ts","piazza-maggiore","-j","2"],{stdio:"inherit",env:{...process.env,PIPELINE_DATA_ROOT:dest}});
    }
  }else throw Error("Use init, build, render, neutral or regressions");
}
appendFileSync(join(root,"commands.ndjson"),JSON.stringify({at:new Date().toISOString(),argv:process.argv.slice(1),dataRoot:root,chromePath:process.env.CHROME_PATH??null,chromeArgs:process.env.CHROME_ARGS??null,completed:true})+"\n");
console.log({command,root,completed:true});
