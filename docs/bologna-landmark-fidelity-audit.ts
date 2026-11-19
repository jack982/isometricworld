/** Read-only source audit and write-once preservation pins. Never run earlier QA writers. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { openArea } from "../pipeline/src/areas.ts";
import { axes, camera } from "../pipeline/src/camera.ts";
import { REGIONS, CITIES } from "../pipeline/src/places.ts";
import { area, bounds, normalizeGeometry, overlap } from "../pipeline/src/bologna-geometry.ts";
import { footprintFrame } from "../pipeline/src/bologna-architecture-frame.ts";
import { conclusiveIdentity } from "../pipeline/src/bologna-fidelity-safety.ts";
import type { Volume } from "../pipeline/src/bologna.ts";

const read=(p:string)=>JSON.parse(readFileSync(p,"utf8"));
const sha=(p:string)=>createHash("sha256").update(readFileSync(p)).digest("hex");
const save=(p:string,v:unknown)=>writeFileSync(p,JSON.stringify(v,null,2)+"\n");
const pins="docs/bologna-landmark-fidelity-inputs.json";
if(!existsSync(pins)){
  const files:Record<string,{sha256:string;bytes:number}>={};
  const record=(p:string)=>{if(statSync(p).isDirectory())for(const f of readdirSync(p).sort())record(p+"/"+f);else files[p]={sha256:sha(p),bytes:statSync(p).size};};
  for(const inventory of ["docs/bologna-architecture-inputs.json","docs/bologna-architecture-checksums.json"]){
    const original=read(inventory);for(const [p,v]of Object.entries(original.files)as[string,{sha256:string}][])assert.equal(sha(p),v.sha256,`Previous inventory mismatch: ${p}`);
    record(inventory);
  }
  for(const p of ["data/bo-001r","data/bo-002-buildings","data/bo-002-trees","data/bo-003-architecture"])record(p);
  for(const f of readdirSync("docs"))if(f.startsWith("bologna-")&&!f.startsWith("bologna-landmark-fidelity-"))record("docs/"+f);
  for(const p of ["data/raw/bologna-audit/buildings.geojson","data/raw/bologna-audit/trees.geojson","data/raw/bologna-audit/bologna-buildings-metadata.json","data/raw/bologna-audit/bologna-trees-metadata.json","bologna-review.zip","pipeline/src/pipeline.zip","pipeline/src/bologna-architecture.test.ts","plans/BO-003F-codex-task.md","pipeline/src/places.ts","pipeline/src/areas.ts","pipeline/src/camera.ts"])if(existsSync(p))record(p);
  save(pins,{baseCommit:execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim(),branch:execFileSync("git",["branch","--show-current"],{encoding:"utf8"}).trim(),files});
}
const configuration=read("docs/bologna-landmark-fidelity-configuration.json"),currentRegions=structuredClone(REGIONS);delete currentRegions.bologna.creditsBySource!.fidelity;
assert.deepEqual(currentRegions,configuration.REGIONS,"Only BO-003F source credits may change region metadata");assert.deepEqual(CITIES,configuration.CITIES);
const pinned=read(pins);for(const [p,v]of Object.entries(pinned.files)as[string,{sha256:string}][])if(p!=="pipeline/src/places.ts")assert.equal(sha(p),v.sha256,`Protected input changed: ${p}`);
const a=openArea("piazza-maggiore"),baseline=read("data/bo-003-architecture/derived/piazza-maggiore/manifest.json"),old=read("docs/bologna-architecture-gate0.json");
assert.deepEqual(camera(),baseline.camera);assert.deepEqual(a.bbox,baseline.bbox);assert.equal(REGIONS.bologna.geoidM,39.647);
const volumes:Volume[]=read("data/bo-002-trees/raw/piazza-maggiore/municipal-buildings.json"),raw=read("data/raw/bologna-audit/buildings.geojson").features,byId=new Map<number,any>(raw.map((f:any)=>[f.properties.codice_ogg,f]));
const osm=read("data/bo-001r/raw/piazza-maggiore/osm.json").elements;
const roles:Record<number,[string,string]>={17871:["probable","central nave"],31864:["probable","west aisle"],17875:["probable","east aisle"],45799:["probable","east chapel band"],52776:["probable","west chapel band"],52777:["probable","north facade lower strip; not the full elevation"],59850:["probable","southern faceted apse"],39022:["verified","bell tower: explicit Campanile classification"],18063:["unknown","church attachment; specific functional role unverified"],32021:["unknown","low eastern structure; not a surveyed chapel roof"],47682:["probable","north/east L-shaped palace portion; not the whole west/south complex"],61154:["probable","southern portion of named palace footprint; exact historical range label unverified"]};
const parts=Object.entries(roles).map(([key,[roleStatus,role]])=>{
  const id=Number(key),v=volumes.find(v=>v.properties.codice_ogg===id)!,source=byId.get(id);assert(v&&source);const full=normalizeGeometry(source.geometry).polygons;assert(full.some(p=>overlap(p,v.poly)/area([v.poly])>.999));assert.equal(v.h,source.properties.altezza_gr);
  const reference=old.identities[id===47682||id===61154?1:0],coverage=overlap(v.poly,reference.geometry)/area([v.poly]);
  return {id:v.id,ctcId:id,roleStatus,role,landmarkAssociation:coverage>=.8?"verified via named source footprint":"probable; below 80% join",osmId:reference.osmId,wikidata:reference.wikidata,coverage,relativeEaveM:v.h,quotaGronda:source.properties.quota_gron,quotaPiede:source.properties.quota_pied,sourceDate:source.properties.data_istit,classification:source.properties.descrizion,sourceGeometry:full,acceptedPolygon:v.poly,bounds:bounds(v.poly)};
});
const clock=osm.find((e:any)=>e.type==="way"&&e.id===149041465);assert.equal(clock.tags.wikidata,"Q30888017");
const clockPoly=normalizeGeometry({type:"Polygon",coordinates:[clock.geometry.map((q:any)=>[q.lon,q.lat])]}).polygons[0];
const clockParts=[26676,56137,35259,49154].map(id=>{const f=byId.get(id),p=normalizeGeometry(f.geometry).polygons[0],outer=[p[0]],coverage=overlap(outer,clockPoly)/area([outer]),v=volumes.find(v=>v.properties.codice_ogg===id)!;assert.deepEqual(p,v.poly);return {ctcId:id,id:v.id,relativeEaveM:v.h,classification:f.properties.descrizion,outerCoverage:coverage,acceptedCoverage:overlap(p,clockPoly)/area([p]),fullOuterAreaM2:area([outer]),polygonAreaM2:area([p]),frame:footprintFrame(outer),sourceGeometry:p,conclusiveSinglePartJoin:conclusiveIdentity(true,coverage),role:id===26676?"probable clock body; full outline fails 80% rule":id===56137?"probable octagonal lantern; source geometry verified, functional level not explicit":id===35259?"probable upper lantern ring":"probable terminal cap; relative eave 49.6 conflicts with generic 46.2 m total"};});
const axis=footprintFrame(parts.find(p=>p.ctcId===17871)!.acceptedPolygon),nave=parts.find(p=>p.ctcId===17871)!,b=nave.bounds,centre=[(b[0]+b[2])/2,(b[1]+b[3])/2],front=axis.u[1]>=0?axis.u:axis.u.map((x:number)=>-x),towardViewer=[-axes().dir[0],-axes().dir[1]],frontDot=front[0]*towardViewer[0]+front[1]*towardViewer[1];
const result={gate0:"AUDIT_COMPLETE_WITH_SCOPED_EXCEPTIONS",preservedFiles:Object.keys(pinned.files).length,parts,clock:{osmId:clock.id,wikidata:clock.tags.wikidata,tags:clock.tags,geometry:clockPoly,parts:clockParts,identity:"Named clock site verified; body/ring level association probable. No clock/belfry override approved.",minimumWholeBodyCoverage:.8,actualWholeBodyCoverage:clockParts[0].outerCoverage},camera:camera(),bbox:a.bbox,geoidM:39.647,facadeVisibility:{outwardNorthAxis:front,towardViewer,normalDotTowardViewer:frontDot,backFacing:frontDot<0,centre,consequence:"Main north facade cannot be demonstrated from this frozen southeast camera; do not rotate camera or transplant marble onto the south apse."},allowableChanges:{estimatedShedIds:[31864,17875,45799,52776],estimatedRiseM:2,measuredRidgeClaim:false,clock:false,facadeMetricMesh:false,palaceRoofNetwork:false,porticoArches:false},heightSemantics:{ctc:"relative eave = quota_gron - quota_pied; absolute datum unverified",basilicaOfficial44M:"generic overall description; no control surface/datum",metropolitanGuide45M:"central vaults; distinct from 51 m facade",clockOperatorM:{body:36.2,lanternApprox:10,totalApprox:46.2,base:[10.3,8.44]},noScalingApplied:true},sourceCounts:{volumes:volumes.length,ctc:volumes.filter(v=>v.source==="ctc").length,holes:volumes.reduce((s,v)=>s+v.poly.length-1,0),trees:784},originalSlopes:old.slopes,sliverRisks:old.slivers};
save("docs/bologna-landmark-fidelity-audit.json",result);console.log({gate0:result.gate0,protected:result.preservedFiles,clockBodyCoverage:result.clock.actualWholeBodyCoverage,facadeBackFacing:result.facadeVisibility.backFacing,allowableChanges:result.allowableChanges});
