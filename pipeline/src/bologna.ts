/** Explicit municipal adapter. Does not fetch, alter global source tables, or use absolute CTC elevations. */
import { area, boxPolygon, difference, Index, inPolygon, intersect, normalizeGeometry, overlap, topology, type Point, type Polygon } from "./bologna-geometry.ts";
import { ecefToEnu, llhToEcef } from "./camera.ts";
export type BuildingTuple=[Point[],number,number,number|null,Point[][]?];
export interface Volume {id:string;poly:Polygon;h:number;style:number;properties:any;source:string;heightSource:string}
export const DEFERRED=new Set(["Portico","Tettoia/pensilina","Collegamento in quota","Edificio diroccato","Mura storiche","In costruzione"]);
const SOLID=new Set(["Edificio generico","Baracca","Ospedale","Stabilimento industriale","Edificio sportivo","Chiosco fiori","Edificio scolastico","Chiesa","Campanile","Stazione di rifornimento","Edificio ad uso agricolo","Cabina ENEL","Servizi","Chiosco gelati","Cimitero","Carcere","Silos","Chiosco giornali","Serra","Chiosco alimentari","Parcheggio multipiano","Studentato","Edificio per centrale termica"]);
export const classification=(s:string)=>DEFERRED.has(s)?"deferred":SOLID.has(s)?"solid":"unknown";
const positive=(x:any)=>typeof x==="number"&&Number.isFinite(x)&&x>0&&x<=200;
export function relativeHeight(p:any,match?:Volume){
  if(positive(p.altezza_gr))return {h:p.altezza_gr as number,source:"ctc-relative-eave"};
  const t=match?.properties?.tags??{};
  const h=parseFloat(t.height),levels=parseFloat(t["building:levels"]);
  if(positive(h))return {h,source:"matched-osm-height"};
  if(positive(levels*3.2+1))return {h:levels*3.2+1,source:"matched-osm-levels"};
  return {h:match?.h??(p.area_ogg>1500?14:p.descrizion==="Baracca"?5:13),source:"documented-estimate"};
}
export function groundSampler(meta:{x0:number;y0:number;nx:number;ny:number;step:number},values:Float32Array){
  return (x:number,y:number)=>{
    const fx=Math.min(meta.nx-1.001,Math.max(0,(x-meta.x0)/meta.step)),fy=Math.min(meta.ny-1.001,Math.max(0,(y-meta.y0)/meta.step));
    const ix=Math.floor(fx),iy=Math.floor(fy),a=fx-ix,b=fy-iy,i=iy*meta.nx+ix;
    return (values[i]*(1-a)+values[i+1]*a)*(1-b)+(values[i+meta.nx]*(1-a)+values[i+meta.nx+1]*a)*b;
  };
}
export function baselineVolumes(tuples:BuildingTuple[],osm:any[]):Volume[]{
  const rawIndex=new Index<Volume>();
  for(const el of osm){
    if(!el.tags?.building)continue;
    const ring=el.type==="way"?el.geometry:el.members?.find((m:any)=>m.role==="outer"&&m.geometry)?.geometry;
    if(!ring?.length)continue;
    const g=normalizeGeometry({type:"Polygon",coordinates:[ring.map((q:any)=>[q.lon,q.lat])]});
    for(const poly of g.polygons)rawIndex.add({id:`${el.type}/${el.id}`,poly,h:13,style:1,properties:el,source:"osm",heightSource:"baseline"});
  }
  return tuples.map((t,i)=>{
    const ring=[...t[0],t[0][0]],poly=[ring,...(t[4]??[]).map(r=>[...r,r[0]])];
    const matches=rawIndex.query(poly).map(v=>({v,area:overlap(poly,v.poly)})).sort((a,b)=>b.area-a.area);
    return {id:matches[0]?.v.id??`baseline/${i}`,poly,h:t[1],style:t[2],properties:matches[0]?.v.properties??{},source:"osm-fallback",heightSource:"baseline"};
  });
}
export function municipalBuildings(features:any[],osm:Volume[],bbox:number[],ground:(x:number,y:number)=>number){
  const margin=.002,box=[bbox[0]-margin,bbox[1]-margin,bbox[2]+margin,bbox[3]+margin],selection=boxPolygon(box);
  const osmIndex=new Index<Volume>();osm.forEach(v=>osmIndex.add(v));
  const quarantine:any[]=[],deferred:any[]=[],candidates:Volume[]=[],matches:any[]=[],terrain:any[]=[],heightCounts:Record<string,number>={};
  let outside=0,selectedRecords=0,inputHoles=0;
  for(const f of features){
    const p=f.properties??{},coords=f.geometry?.coordinates;
    // Coarse geographical bbox rejection only; final selection is an actual polygon intersection.
    const flat=(c:any):number[][]=>typeof c?.[0]==="number"?[c]:Array.isArray(c)?c.flatMap(flat):[];
    const pts=flat(coords);
    if(pts.length&&Math.max(...pts.map(q=>q[0]))<box[1]||pts.length&&Math.min(...pts.map(q=>q[0]))>box[3]||pts.length&&Math.max(...pts.map(q=>q[1]))<box[0]||pts.length&&Math.min(...pts.map(q=>q[1]))>box[2]){outside++;continue;}
    const normalized=normalizeGeometry(f.geometry);
    if(normalized.error){quarantine.push({id:p.codice_ogg,reason:normalized.error,properties:p});continue;}
    const selected=normalized.polygons.filter(poly=>area(intersect(poly,selection))>.01);
    if(!selected.length){outside++;continue;}selectedRecords++;
    const kind=classification(p.descrizion);
    if(kind!=="solid"){deferred.push({id:p.codice_ogg,reason:kind==="deferred"?"non-solid-category":"unknown-category",properties:p,polygons:selected});continue;}
    for(const [part,poly] of selected.entries()){
      inputHoles+=poly.length-1;
      const pa=area([poly]);
      const hits=osmIndex.query(poly).map(v=>({v,a:overlap(poly,v.poly)})).filter(m=>m.a>.25).sort((a,b)=>b.a-a.a);
      const reliable=hits.find(m=>m.a/Math.min(pa,area([m.v.poly]))>=.5);
      const height=relativeHeight(p,reliable?.v);heightCounts[height.source]=(heightCounts[height.source]??0)+1;
      const id=`ctc/${p.codice_ogg}/${part}`;
      candidates.push({id,poly,h:height.h,style:reliable?.v.style??1,properties:p,source:"ctc",heightSource:height.source});
      matches.push({ctc:id,area:pa,osm:hits.map(m=>({id:m.v.id,intersectionM2:m.a,smallerCoverage:m.a/Math.min(pa,area([m.v.poly])),reliable:m.a/Math.min(pa,area([m.v.poly]))>=.5})),heightSource:height.source});
    }
  }
  // Resolve overlapping surveyed volumes deterministically: taller relative eaves first, then stable ID.
  const accepted:Volume[]=[],acceptedIndex=new Index<Volume>(),overlaps:any[]=[],slivers:any[]=[],generatedQuarantine:any[]=[];
  for(const v of candidates.sort((a,b)=>b.h-a.h||a.id.localeCompare(b.id))){
    const colliders=acceptedIndex.query(v.poly).filter(o=>overlap(v.poly,o.poly)>.01);
    const pieces=difference([v.poly],colliders.map(c=>c.poly));
    if(colliders.length)overlaps.push({id:v.id,with:colliders.map(c=>c.id),removedM2:area([v.poly])-area(pieces)});
    for(const [i,poly] of pieces.entries()){
      if(area([poly])<.5){slivers.push({id:v.id,area:area([poly]),reason:"sub-half-square-metre-overlap-residual"});continue;}
      const reason=topology(poly);if(reason){generatedQuarantine.push({id:v.id,source:v.source,reason,area:area([poly]),poly});continue;}
      const kept={...v,id:`${v.id}/piece${i}`,poly};accepted.push(kept);acceptedIndex.add(kept);
    }
  }
  const fallback:Volume[]=[],fallbackIndex=new Index<Volume>(),replaced:any[]=[],retained:any[]=[],osmOverlapCorrections:any[]=[],courtyardExclusions:any[]=[];
  for(const v of [...osm].sort((a,b)=>b.h-a.h||a.id.localeCompare(b.id))){
    const hit=acceptedIndex.query(v.poly).filter(o=>overlap(v.poly,o.poly)>.01);
    const previousFallback=fallbackIndex.query(v.poly).filter(o=>overlap(v.poly,o.poly)>.01);
    // OSM baseline relations lost their holes. Do not let their leftover mass refill a surveyed
    // CTC courtyard. A wholly unmatched outbuilding inside a courtyard remains eligible fallback.
    const courtyardMasks=hit.flatMap(o=>o.poly.slice(1).map(r=>[r] as Polygon)).filter(p=>overlap(v.poly,p)>.01);
    if(courtyardMasks.length)courtyardExclusions.push({osm:v.id,ctc:hit.map(o=>o.id),masks:courtyardMasks.length,areaM2:courtyardMasks.reduce((s,p)=>s+overlap(v.poly,p),0)});
    const pieces=difference([v.poly],[...hit,...previousFallback].map(o=>o.poly).concat(courtyardMasks));
    if(previousFallback.length)osmOverlapCorrections.push({id:v.id,with:previousFallback.map(o=>o.id),reason:"resolve-pre-existing-osm-fallback-overlap"});
    if(hit.length)replaced.push({osm:v.id,name:v.properties.tags?.name,ctc:hit.map(o=>o.id),removedM2:area([v.poly])-area(pieces),originalArea:area([v.poly]),residualArea:area(pieces)});
    else retained.push({id:v.id,name:v.properties.tags?.name,reason:"no-usable-ctc-overlap"});
    for(const [i,poly] of pieces.entries()){
      if(area([poly])<.5){slivers.push({id:v.id,area:area([poly]),reason:"sub-half-square-metre-osm-residual"});continue;}
      const reason=topology(poly);if(reason){generatedQuarantine.push({id:v.id,source:v.source,reason,area:area([poly]),poly});continue;}
      const kept={...v,id:`${v.id}/piece${i}`,poly};fallback.push(kept);fallbackIndex.add(kept);
    }
  }
  const volumes=[...accepted,...fallback];
  const finalIndex=new Index<Volume>();let duplicatePairs=0,maxOverlapM2=0;
  for(const v of volumes){
    for(const other of finalIndex.query(v.poly)){const a=overlap(v.poly,other.poly);maxOverlapM2=Math.max(maxOverlapM2,a);if(a>.05)duplicatePairs++;}finalIndex.add(v);
    const vertices=v.poly.flatMap(r=>r.slice(0,-1)),samples=vertices.map(p=>ground(...p));
    const midpointSamples=v.poly.flatMap(r=>r.slice(0,-1).map((p,i)=>ground((p[0]+r[i+1][0])/2,(p[1]+r[i+1][1])/2)));
    const lo=Math.min(...samples),hi=Math.max(...samples);
    const sampledMin=Math.min(lo,...midpointSamples),floatingGapM=Math.max(0,lo-1-sampledMin);
    terrain.push({id:v.id,source:v.source,groundMin:lo,groundMax:hi,spreadM:hi-lo,bottom:lo-1,roof:hi+v.h,relativeHeight:v.h,maxEmbeddingM:hi-lo+1,midpointRange:[Math.min(...midpointSamples),Math.max(...midpointSamples)],floating:floatingGapM>.05,floatingGapM,slopeWarning:hi-lo>3,absoluteCtcDatumUsed:false});
  }
  const osmDegree=new Map<string,number>();for(const m of matches)for(const o of m.osm)osmDegree.set(o.id,(osmDegree.get(o.id)??0)+1);
  return {volumes,report:{policy:{sceneMarginDeg:margin,booleanPrecisionM:.001,minimumOverlapM2:.25,reliableSmallerCoverage:.5,overlapResidualMinimumM2:.5,ctcPriority:"descending relative eave height, then stable source ID; subtract accepted solid footprints and surveyed courtyard masks from overlapping OSM; resolve pre-existing OSM fallback overlaps similarly",anchor:"bilinear ground at outer/hole vertices; roof=max ground+relative height, wall bottom=min ground-1; edge-midpoint diagnostic",absoluteCtcDatumUsed:false},counts:{sourceRecords:features.length,outside,selectedRecords,inputHoles,solidParts:candidates.length,ctcRenderedParts:accepted.length,osmBaseline:osm.length,osmReplaced:replaced.length,osmUnmatched:retained.length,osmResidualParts:fallback.length,totalVolumes:volumes.length,invalid:quarantine.length,generatedQuarantined:generatedQuarantine.length,deferred:deferred.length,ambiguous:matches.filter(m=>m.osm.length>1).length,oneToMany:matches.filter(m=>m.osm.length>1).length,manyToOne:[...osmDegree.values()].filter(n=>n>1).length,duplicatePairs,maxOverlapM2,slopeWarnings:terrain.filter(t=>t.slopeWarning).length},heightCounts,quarantine,deferred,matches,overlaps,slivers,replaced,retained,terrain,osmOverlapCorrections,courtyardExclusions,generatedQuarantine}};
}
export function tuple(v:Volume):BuildingTuple{
  // Keep full projected precision; rounding can close small courtyard gaps or reintroduce overlaps.
  return [v.poly[0].slice(0,-1),v.h,v.style,null,v.poly.slice(1).map(r=>r.slice(0,-1))];
}
export function treeClass(s:any){
  if(typeof s!=="string")return {h:9,source:"missing-class-default"};
  const c=s.match(/^Cl([1-5]):/);if(!c)return {h:9,source:"malformed-class-default"};
  return {h:[0,4,9,14,19.5,26][Number(c[1])],source:Number(c[1])===5?"open-ended-class-estimate":Number(c[1])===1?"low-class-default-estimate":"class-midpoint-estimate"};
}
export function municipalTrees(features:any[],osm:number[][],bbox:number[]){
  const points:any[]=[],quarantine:any[]=[],box=boxPolygon([bbox[0]-.002,bbox[1]-.002,bbox[2]+.002,bbox[3]+.002]);
  for(const f of features){const c=f.geometry?.coordinates,p=f.properties??{};if(f.geometry?.type!=="Point"||!Number.isFinite(c?.[0])||!Number.isFinite(c?.[1])||Math.abs(c[0])>180||Math.abs(c[1])>90){quarantine.push({id:p.num_pt,reason:"invalid-point"});continue;}
    const q=projectPoint(c);if(!inPolygon(q,box))continue;const estimate=treeClass(p.cl_h),r=Math.max(1.5,Math.min(5,estimate.h*.22));points.push({id:p.num_pt,point:q,h:estimate.h,r,estimate:estimate.source,properties:p});}
  const matched:any[]=[],retained:number[][]=[];
  for(const t of osm){const near=points.map(p=>({p,d:Math.hypot(p.point[0]-t[0],p.point[1]-t[1])})).filter(x=>x.d<=3).sort((a,b)=>a.d-b.d);if(near.length)matched.push({osm:t,municipal:near[0].p.id,distanceM:near[0].d});else retained.push(t);}
  return {trees:[...retained,...points.map(p=>[...p.point,p.r,Math.max(1,p.h-p.r*.85)])],report:{dedupeToleranceM:3,selected:points.length,osmOriginal:osm.length,osmMatched:matched.length,osmRetained:retained.length,total:retained.length+points.length,points,matched,quarantine,warning:"Class estimates, not measured heights or crown radii. Old inventory dates/private coverage gaps remain."}};
}
function projectPoint([lon,lat]:number[]):Point{const p=ecefToEnu(llhToEcef(lat,lon,0));return [p[0],p[1]];}
