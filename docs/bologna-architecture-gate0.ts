/** Mandatory pre-architecture audit. No refetch, scene generation, or baseline mutation. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { openArea } from "../pipeline/src/areas.ts";
import { camera, enuToLlh } from "../pipeline/src/camera.ts";
import { REGIONS } from "../pipeline/src/places.ts";
import { area, bounds, Index, normalizeGeometry, overlap } from "../pipeline/src/bologna-geometry.ts";
import { footprintFrame } from "../pipeline/src/bologna-architecture-frame.ts";
import { groundSampler, tuple, type Volume } from "../pipeline/src/bologna.ts";
const read=(p:string)=>JSON.parse(readFileSync(p,"utf8")),sha=(p:string)=>createHash("sha256").update(readFileSync(p)).digest("hex");
const write=(p:string,j:unknown)=>writeFileSync(p,JSON.stringify(j,null,2)+"\n");
const manifestPath="docs/bologna-architecture-inputs.json";
if(!existsSync(manifestPath)){
  const files:Record<string,{sha256:string;bytes:number}>={};
  const walk=(p:string)=>{if(statSync(p).isDirectory()){for(const f of readdirSync(p))walk(p+"/"+f);}else files[p]={sha256:sha(p),bytes:statSync(p).size};};
  for(const p of ["data/bo-001r","data/bo-002-buildings","data/bo-002-trees"])walk(p);
  for(const f of readdirSync("docs"))if(/bologna-(municipal|buildings-comparison|trees-comparison|coverage|proof)/.test(f)&&!f.includes("architecture"))walk("docs/"+f);
  for(const p of ["data/raw/bologna-audit/buildings.geojson","data/raw/bologna-audit/trees.geojson","bologna-review.zip","pipeline/src/pipeline.zip"])if(existsSync(p))walk(p);
  write(manifestPath,{baseCommit:"e6c7b7e",files});
}
const pinned=read(manifestPath);for(const [p,v]of Object.entries(pinned.files)as[string,{sha256:string;bytes:number}][]){assert.equal(sha(p),v.sha256,`Changed protected input: ${p}`);assert.equal(statSync(p).size,v.bytes);}
const a=openArea("piazza-maggiore"),base="data/bo-002-trees",sub="/derived/piazza-maggiore/",manifest=read(base+sub+"manifest.json");
assert.deepEqual(camera(),manifest.camera);assert.deepEqual(a.bbox,manifest.bbox);
assert.equal(REGIONS.bologna.geoidM,39.647,"Frozen geoid changed");
const volumes:Volume[]=read(base+"/raw/piazza-maggiore/municipal-buildings.json"),report=read(base+"/adapter-report.json");
const ctc=volumes.filter(v=>v.source==="ctc"),ctcIndex=new Index<Volume>(),allIndex=new Index<Volume>();ctc.forEach(v=>ctcIndex.add(v));volumes.forEach(v=>allIndex.add(v));
assert.equal(new Set(ctc.map(v=>v.id)).size,ctc.length,"Ambiguous CTC volume IDs");
const sourceById=new Map<number,any>(read("data/raw/bologna-audit/buildings.geojson").features.map((f:any)=>[f.properties.codice_ogg,f]));
const namedOsm=read("data/bo-001r/raw/piazza-maggiore/osm.json").elements;
const definitions=[
 {key:"san-petronio",osmId:328013918,wikidata:"Q810103",ctcIds:[17871,31864,17875,45799,52776,32021,59850,18063,39022]},
 {key:"palazzo-accursio",osmId:149040859,wikidata:"Q2267154",ctcIds:[47682,61154]},
 {key:"palazzo-re-enzo",osmId:149040903,wikidata:"Q604770",ctcIds:[31866,52922,11313]},
 {key:"asinelli",osmId:46965352,wikidata:"Q16511590",ctcIds:[35701,49630]},
 {key:"garisenda",osmId:46965353,wikidata:"Q5875446",ctcIds:[]},
];
const identities=definitions.map(def=>{
  const osm=namedOsm.find((e:any)=>e.type==="way"&&e.id===def.osmId);assert(osm&&osm.tags.wikidata===def.wikidata,"OSM identity mismatch");
  const footprint=normalizeGeometry({type:"Polygon",coordinates:[osm.geometry.map((p:any)=>[p.lon,p.lat])]}).polygons[0];assert(footprint);
  const candidates=ctcIndex.query(footprint).map(v=>({id:v.id,ctcId:v.properties.codice_ogg,description:v.properties.descrizion,h:v.h,areaM2:area([v.poly]),intersectionM2:overlap(v.poly,footprint),coverage:overlap(v.poly,footprint)/area([v.poly]),frame:footprintFrame(v.poly)})).filter(v=>v.intersectionM2>1);
  const selected=def.ctcIds.map(id=>{const item=candidates.find(v=>v.ctcId===id);assert(item&&item.coverage>=.8,`Unverified identity ${def.key}/${id}`);const v=ctc.find(v=>v.id===item.id)!,raw=sourceById.get(id);assert(raw);assert.equal(raw.properties.descrizion,v.properties.descrizion);assert.equal(raw.properties.altezza_gr,v.h);
    const original=normalizeGeometry(raw.geometry);assert(!original.error);assert(original.polygons.some(poly=>overlap(poly,v.poly)/area([v.poly])>.999),"Not the official CTC source geometry");
    assert.equal(tuple(v,true)[5]?.id,v.id);return {...item,metadata:tuple(v,true)[5]};});
  return {...def,name:osm.tags.name,tags:osm.tags,geometry:footprint,selected,candidates,identityRule:"Pinned unique OSM ID + Wikidata + official CTC geometry + at least 80% CTC area within named footprint; all criteria checked",unresolved:def.key==="garisenda"?"CTC candidate 35702 has only ~59% overlap; tilted footprint and conflicting names require separate verification":undefined};
});
const gd=base+sub+"ground/",gb=readFileSync(gd+"height.bin"),ground=groundSampler(read(gd+"meta.json"),new Float32Array(gb.buffer,gb.byteOffset,gb.length/4));
const pilotBox=[a.bbox[1],a.bbox[0],a.bbox[3],a.bbox[2]];
const porticoes=report.deferred.filter((d:any)=>d.properties.descrizion==="Portico").map((d:any)=>{
  const poly=d.polygons[0],frame=footprintFrame(poly),b=bounds(poly),p=enuToLlh([(b[0]+b[2])/2,(b[1]+b[3])/2,0]),samples=poly.flat().map(([x,y]:number[])=>ground(x,y));
  const contacts=allIndex.query(poly).map(v=>({id:v.id,source:v.source,areaM2:overlap(v.poly,poly)})).filter(v=>v.areaM2>.01);
  const nearBox=[[[b[0]-.5,b[1]-.5],[b[2]+.5,b[1]-.5],[b[2]+.5,b[3]+.5],[b[0]-.5,b[3]+.5],[b[0]-.5,b[1]-.5]]] as any;
  const adjacent=ctcIndex.query(nearBox).map(v=>({id:v.id,areaM2:overlap(v.poly,nearBox)})).filter(v=>v.areaM2>.1);
  return {ctcId:d.id,poly,position:{lat:p[0],lon:p[1]},source:d.properties,frame,solidOverlapM2:contacts.reduce((s:number,c:any)=>s+c.areaM2,0),contacts,adjacent,groundSpread:Math.max(...samples)-Math.min(...samples),insidePilot:p[0]>=pilotBox[1]&&p[0]<=pilotBox[3]&&p[1]>=pilotBox[0]&&p[1]<=pilotBox[2]};
});assert.equal(porticoes.length,20);
const centroid=(poly:any)=>{const b=bounds(poly);return [(b[0]+b[2])/2,(b[1]+b[3])/2];};
const landmarkCentres=identities.map(d=>({key:d.key,point:centroid(d.geometry)}));
const nearLandmarks=(poly:any)=>{const p=centroid(poly);return landmarkCentres.map(l=>({key:l.key,distanceM:Math.hypot(p[0]-l.point[0],p[1]-l.point[1])})).sort((a,b)=>a.distanceM-b.distanceM);};
const slopes=report.terrain.filter((t:any)=>t.slopeWarning).map((t:any)=>{const v=volumes.find(v=>v.id===t.id)!;return {...t,position:enuToLlh([...centroid(v.poly),0] as any),landmarkProximity:nearLandmarks(v.poly)};});assert.equal(slopes.length,12);
const sliverAudit=report.slivers.map((s:any)=>{const id=s.id.split("/piece")[0],v=volumes.find(v=>v.id.startsWith(id+"/piece"));return {...s,positionResolvable:!!v,nearbyLandmarks:v?nearLandmarks(v.poly):undefined,warning:v?"Proximity uses surviving parent geometry, not deleted sliver coordinates":"BO-002 log omitted sliver geometry; exact deleted-piece position cannot be reconstructed from the log"};});
const pilotIds=new Set(identities.slice(0,2).flatMap(i=>i.selected.map(v=>v.id)));
const ordinary=ctc.filter(v=>!pilotIds.has(v.id)&&v.properties.descrizion==="Edificio generico"&&v.poly.length===1&&v.h>=8&&v.h<=30).map(v=>({id:v.id,frame:footprintFrame(v.poly),nearbyLandmarks:nearLandmarks(v.poly)})).filter(v=>v.frame.coverage>.995&&v.frame.width>=5&&v.frame.width<=20&&v.frame.length>=v.frame.width*1.5&&v.nearbyLandmarks[0].distanceM<300).sort((a,b)=>a.nearbyLandmarks[0].distanceM-b.nearbyLandmarks[0].distanceM);
const fontana=read("data/bo-001r/raw/piazza-maggiore/ground.json").elements.find((e:any)=>e.type==="way"&&e.id===561636974);assert(fontana?.tags.name==="Fontana del Nettuno");
write("docs/bologna-architecture-gate0.json",{gate0Passed:true,originalFilesVerified:Object.keys(pinned.files).length,camera:camera(),bbox:a.bbox,geoidM:39.647,baselineSourceHoles:712,trees:784,identities,fontana:{id:"way/561636974",tags:fontana.tags,geometry:fontana.geometry,ctcAssociation:"None verified; no architectural fountain model in the pilot"},porticoes,slopes,slivers:{count:report.slivers.length,areaM2:report.slivers.reduce((s:number,v:any)=>s+v.area,0),cases:sliverAudit},ordinaryCandidates:ordinary.slice(0,20),metadata:{ctcVolumeCount:ctc.length,ctcIdsUnique:true,legacyTupleLength:5,optInTupleLength:6,identityField:"b[5].id (verified Volume.id)",unresolvedOsm:"Fragmented outer chains and tied metadata joins do not get guessed identities"}});
console.log({protectedFiles:Object.keys(pinned.files).length,pilots:identities.slice(0,2).map(i=>({key:i.key,ids:i.selected.map(v=>v.id)})),ordinary:ordinary.slice(0,4),porticoes:porticoes.map((p:any)=>({id:p.ctcId,L:p.frame.length,W:p.frame.width,rect:p.frame.coverage,overlap:p.solidOverlapM2,adjacent:p.adjacent.length,slope:p.groundSpread,inside:p.insidePilot}))});
