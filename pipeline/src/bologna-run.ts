/** Dedicated isolated Bologna adapter runner. Never alters BO-001/BO-001R inputs or outputs.
 * PIPELINE_DATA_ROOT=data/bo-002-buildings node --import tsx pipeline/src/bologna-run.ts build ctc
 * PIPELINE_DATA_ROOT=data/bo-002-buildings node --import tsx pipeline/src/bologna-run.ts render
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openArea } from "./areas.ts";
import { CAMERA, enuToPixel } from "./camera.ts";
import { baselineVolumes, groundSampler, municipalBuildings, municipalTrees, tuple, type BuildingTuple } from "./bologna.ts";
import { bolognaSource, municipalCredits } from "./bologna-credits.ts";
import { REGIONS } from "./places.ts";
const ROOT=resolve("."),base="data/bo-001r",areaName="piazza-maggiore";
const read=(p:string)=>JSON.parse(readFileSync(p,"utf8"));
const sha=(p:string)=>createHash("sha256").update(readFileSync(p)).digest("hex");
const save=(p:string,x:unknown)=>writeFileSync(p,JSON.stringify(x,null,2)+"\n");
const root=process.env.PIPELINE_DATA_ROOT;
if(!root||!resolve(root).startsWith(join(ROOT,"data","bo-002-")))throw Error("Set PIPELINE_DATA_ROOT=data/bo-002-<experiment>; baseline paths are forbidden");
const command=process.argv[2]??"build",mode=bolognaSource("bologna",process.argv[3]??"ctc"),area=openArea(areaName);
if(command==="render"){
  const run=read(join(root,"run.json"));bolognaSource("bologna",run.mode);
  execFileSync(process.execPath,["--import","tsx","pipeline/src/render.ts",areaName,"-j","2"],{stdio:"inherit",env:process.env});
  const path=join(root,"derived",areaName,"manifest.json"),manifest=read(path);
  manifest.attributions=[...manifest.attributions,...municipalCredits(run.mode)];manifest.buildingSource=run.mode;
  manifest.credits=[...REGIONS.bologna.credits,...municipalCredits(run.mode)];save(path,manifest);
}else if(command==="build"){
  if(existsSync(root))throw Error("Isolated root already exists: do not overwrite earlier experiments");
  const audited=read("docs/bologna-data-validation.json"),inventory=read("docs/bologna-coverage-preservation.json");
  const originalCheck=[];
  for(const [p,v]of Object.entries(inventory)as[string,{sha256:string}][]){
    if(p==="pipeline/src/places.ts"){originalCheck.push({path:p,status:"intentional-source-credit-metadata-change; frozen geography separately checked"});continue;}
    if(sha(p)!==v.sha256)throw Error(`Original preservation inventory mismatch: ${p}`);originalCheck.push({path:p,status:"unchanged"});
  }
  const beforeManifest=read(base+"/derived/"+areaName+"/manifest.json");
  const r=REGIONS.bologna,c=beforeManifest.camera;
  if(JSON.stringify(r.origin)!==JSON.stringify(c.origin)||r.headingDeg!==c.headingDeg||r.geoidM!==39.647||JSON.stringify(area.bbox)!==JSON.stringify(beforeManifest.bbox))throw Error("Frozen Bologna geography changed");
  const preservation:Record<string,string>={};
  const walk=(dir:string)=>{for(const name of readdirSync(dir)){const p=join(dir,name);if(statSync(p).isDirectory())walk(p);else preservation[p]=sha(p);}};walk(base);
  for(const [key,file]of [["buildings","buildings.geojson"],["trees","trees.geojson"]]){
    const p="data/raw/bologna-audit/"+file,j=read(p),meta=read(`data/raw/bologna-audit/bologna-${key}-metadata.json`);
    if(sha(p)!==audited[key].sha256||j.features.length!==audited[key].records||meta.metas.default.license!=="CC BY 4.0")throw Error(`Audited snapshot mismatch: ${key}`);
  }
  const raw=join(root,"raw",areaName),derived=join(root,"derived",areaName);mkdirSync(join(root,"raw"),{recursive:true});mkdirSync(derived,{recursive:true});
  cpSync(join(base,"raw",areaName),raw,{recursive:true,errorOnExist:true,force:false});
  cpSync(join(base,"derived",areaName,"ground"),join(derived,"ground"),{recursive:true,errorOnExist:true,force:false});
  const groundDir=join(derived,"ground"),buf=readFileSync(join(groundDir,"height.bin")),grid=new Float32Array(buf.buffer,buf.byteOffset,buf.length/4),ground=groundSampler(read(join(groundDir,"meta.json")),grid);
  const unique=new Map<string,BuildingTuple>(),treeMap=new Map<string,number[]>();
  for(const f of readdirSync(join(base,"derived",areaName,"scene"))){const bin=read(join(base,"derived",areaName,"scene",f));for(const b of bin.b)unique.set(JSON.stringify(b),b);for(const t of bin.t)treeMap.set(JSON.stringify(t),t);}
  let trees=[...treeMap.values()];let report:any={mode};let volumes:any[]=[];
  if(mode!=="osm"){
    const baseline=baselineVolumes([...unique.values()],read(join(raw,"osm.json")).elements);
    const result=municipalBuildings(read("data/raw/bologna-audit/buildings.geojson").features,baseline,area.bbox,ground);report=result.report;volumes=result.volumes;
    save(join(raw,"municipal-buildings.json"),volumes);
    if(mode==="ctc-trees"){
      const approved=read("docs/bologna-municipal-qa.json");if(!approved.stageAPassed)throw Error("Stage A review gate has not passed");
      const treeResult=municipalTrees(read("data/raw/bologna-audit/trees.geojson").features,trees,area.bbox);trees=treeResult.trees;report.trees=treeResult.report;
      const stageA=read("data/bo-002-buildings/raw/"+areaName+"/municipal-buildings.json");if(JSON.stringify(stageA)!==JSON.stringify(volumes))throw Error("Tree stage changed building layer");
    }
  }
  const bins=new Map<string,{b:BuildingTuple[];t:number[][]}>();
  const add=(minx:number,miny:number,maxx:number,maxy:number,fn:(b:{b:BuildingTuple[];t:number[][]})=>void)=>{
    for(let y=Math.floor((miny-8)/CAMERA.tile);y<=Math.floor((maxy+8)/CAMERA.tile);y++)for(let x=Math.floor((minx-8)/CAMERA.tile);x<=Math.floor((maxx+8)/CAMERA.tile);x++){const k=`${x}_${y}`;if(!bins.has(k))bins.set(k,{b:[],t:[]});fn(bins.get(k)!);}
  };
  if(mode==="osm")cpSync(join(base,"derived",areaName,"scene"),join(derived,"scene"),{recursive:true,errorOnExist:true,force:false});
  else{
    for(const v of volumes){const b=tuple(v),points=v.poly.flat(),gs=points.map((p:[number,number])=>ground(...p)),lo=Math.min(...gs)-3,hi=Math.max(...gs)+3+v.h;
      const pixels=points.flatMap(([x,y]:number[])=>[enuToPixel([x,y,lo]),enuToPixel([x,y,hi])]);add(Math.min(...pixels.map((p:number[])=>p[0])),Math.min(...pixels.map((p:number[])=>p[1])),Math.max(...pixels.map((p:number[])=>p[0])),Math.max(...pixels.map((p:number[])=>p[1])),bin=>bin.b.push(b));}
    for(const t of trees){const g=ground(t[0],t[1]),a=enuToPixel([t[0],t[1],g-3]),c=enuToPixel([t[0],t[1],g+3+t[3]+t[2]]),radius=t[2]/CAMERA.mpp;add(Math.min(a[0],c[0])-radius,Math.min(a[1],c[1])-radius,Math.max(a[0],c[0])+radius,Math.max(a[1],c[1])+radius,bin=>bin.t.push(t));}
    mkdirSync(join(derived,"scene"));for(const [name,bin]of bins)save(join(derived,"scene",name+".json"),bin);
  }
  save(join(root,"adapter-report.json"),report);save(join(root,"preservation.json"),{baseline:preservation,originalCheck});
  save(join(root,"run.json"),{mode,area:areaName,municipalSnapshots:{buildings:audited.buildings.sha256,trees:audited.trees.sha256},baselineManifestSha256:sha(join(base,"derived",areaName,"manifest.json")),groundSha256:sha(join(groundDir,"height.bin")),counts:{baselineBuildings:unique.size,baselineTrees:treeMap.size,volumes:volumes.length,trees:trees.length},credits:municipalCredits(mode)});
  console.log({root,mode,counts:report.counts,trees:trees.length});
}else throw Error("Use build or render");
