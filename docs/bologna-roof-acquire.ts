/** Bounded official GIS acquisition only; no provider API or model. Sequential, <=40 requests/50MB. */
import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import sharp from "sharp";
import { abs, bytes, digest, init, pin, read, ROOT, save, write } from "./bologna-roof-common.ts";
import { validateMapResponse } from "./bologna-roof-wms.ts";
const base="https://geoportale.regione.emilia-romagna.it";
export const RESOURCES=[
 ["ortho-catalog",base+"/servizi/servizi-ogc/elenco-capabilities-dei-servizi-wms/cartografia-di-base/copy_of_service-24","html"],
 ["ortho-capabilities","https://servizigis.regione.emilia-romagna.it/wms/comune_bo_2023_rgb?service=WMS&request=GetCapabilities","xml"],
 ["dtm-catalog",base+"/servizi/servizi-ogc/elenco-capabilities-dei-servizi-wms/altimetria-e-morfologia/service-21","html"],
 ["lidar-catalog",base+"/catalogo/dati-cartografici/cartografia-di-base/quadri-di-unione/layer-1740409868.07","html"],
 ["lidar-capabilities","https://servizigis.regione.emilia-romagna.it/wms/metadati_raster?service=WMS&version=1.3.0&request=GetCapabilities","xml"],
 ["tile-catalog","https://opendata.comune.bologna.it/api/explore/v2.1/catalog/datasets/tile-server-ortofoto-comune-di-bologna","json"],
 ["regional-context",base+"/approfondimenti/rer23_24","html"],
] as const;
interface RequestRecord{url:string;at:string;status:number|string;bytes:number;sha256?:string;path?:string;contentType?:string;error?:string}
async function acquire(jobs:{name:string;url:string;extension:string;image?:boolean}[]){
 const ledgers=readdirSync(abs(ROOT)).filter(n=>/^requests-\d+-\d+\.json$/.test(n)).sort((a,b)=>Number(a.match(/-(\d+)\.json$/)![1])-Number(b.match(/-(\d+)\.json$/)![1]));
 const previous=ledgers.length?read<RequestRecord[]>(ROOT+"/"+ledgers.at(-1)):[];const rows=previous.slice();const taken=previous.length,total=()=>rows.reduce((s,r)=>s+r.bytes,0);assert(jobs.length+taken<=40);
 for(const job of jobs){const path=ROOT+"/references/"+job.name+"."+job.extension;
  if(existsSync(abs(path))){assert(rows.some(r=>r.path===path&&r.sha256===pin(path).sha256),"UNTRACKED_CACHE_REFUSE");continue;}
  let complete=false;
  for(let attempt=0;attempt<2&&!complete;attempt++){
   assert(rows.length<40&&total()<50*1024*1024,"DOWNLOAD_BUDGET_STOP");if(rows.length)await new Promise(r=>setTimeout(r,800));const at=new Date().toISOString();
   try{const response=await fetch(job.url,{headers:{"User-Agent":"IsometricWorld-BO006P0-roof-audit/1.0"},signal:AbortSignal.timeout(35000),redirect:"error"});
    const chunks:Uint8Array[]=[];let size=0;assert(response.body);for await(const chunk of response.body){size+=chunk.length;assert(size<=12*1024*1024&&total()+size<=50*1024*1024,"RESPONSE_BUDGET_STOP");chunks.push(chunk);}const b=Buffer.concat(chunks),contentType=response.headers.get("content-type")??"";const row:RequestRecord={url:job.url,at,status:response.status,bytes:b.length,sha256:digest(b),contentType};
    if(!response.ok){row.error="HTTP_ERROR";rows.push(row);write(ROOT+`/references/error-${rows.length}.txt`,b);if(![429,500,502,503,504].includes(response.status))complete=true;continue;}
    if(job.image){const parameters=new URL(job.url).searchParams;await validateMapResponse(response.status,contentType,b,Number(parameters.get("WIDTH")),Number(parameters.get("HEIGHT")));}
    write(path,b);rows.push({...row,path});complete=true;console.log(job.name,response.status,b.length,contentType);
   }catch(e){const err=e as Error&{cause?:{code?:string}};rows.push({url:job.url,at,status:"FAILED",bytes:0,error:(err.message+" "+(err.cause?.code??"")).slice(0,160)});complete=true;}
  }
 }
 const ledger=ROOT+`/requests-${taken}-${rows.length}.json`;save(ledger,rows);const missing=jobs.filter(job=>!rows.some(r=>r.path===ROOT+"/references/"+job.name+"."+job.extension)).map(j=>j.name);console.log(JSON.stringify({requests:rows.length,bytes:total(),ledger,failedAttempts:rows.filter(r=>!r.path).length,missingResources:missing}));if(missing.length)process.exitCode=1;
}
const args=process.argv.slice(2);assert(args.length===1);if(args[0]==="--init")init();
else if(args[0]==="--metadata")await acquire(RESOURCES.map(([name,url,extension])=>({name,url,extension})));
else if(args[0]==="--imagery"){const plan=read(ROOT+"/wms-plan.json");assert.equal(plan.licenseVerified,true);assert(plan.jobs.length<=4);await acquire(plan.jobs);}
else if(args[0]==="--full"){const plan=read(ROOT+"/wms-plan.json");assert.equal(plan.licenseVerified,true);assert.equal(pin(ROOT+"/references/ortho-catalog.html").sha256,plan.licenseEvidence.sha256);assert(existsSync(abs(ROOT+"/references/ortho-preview.png")),"PREVIEW_REVIEW_FIRST");await acquire([plan.fullResolutionJob]);}
else if(args[0]==="--lidar-info"){const p=read(ROOT+"/wms-plan.json"),u=new URL("https://servizigis.regione.emilia-romagna.it/wms/metadati_raster");u.search=new URLSearchParams({SERVICE:"WMS",VERSION:"1.3.0",REQUEST:"GetFeatureInfo",LAYERS:"QU_ComuneBO_2023_LiDAR",QUERY_LAYERS:"QU_ComuneBO_2023_LiDAR",CRS:"EPSG:3857",BBOX:p.bbox.join(","),WIDTH:"100",HEIGHT:"100",I:"50",J:"50",INFO_FORMAT:"text/plain",FORMAT:"image/png",FEATURE_COUNT:"2"}).toString();await acquire([{name:"dtm-capabilities",extension:"xml",url:"https://servizigis.regione.emilia-romagna.it/wms/dtm_comune_bo_2023?service=WMS&request=GetCapabilities"},{name:"lidar-tile-info",extension:"txt",url:u.toString()}]);}
else throw Error("ONLY_INIT_METADATA_OR_LICENSED_BOUNDED_IMAGERY");
