/** BO-001R: validate a dated local PBF, clip complete surface relations, prepare an isolated run.
 * OSMIUM=/path/to/osmium node --import tsx docs/bologna-osm-coverage.ts
 * Download commands and tools are recorded in bologna-coverage-fix.md. Never writes BO-001 data.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { constants, copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { AREAS } from "../pipeline/src/areas.ts";
import { FILTERS } from "../pipeline/src/osmlocal.ts";
const base="data/bo-001r", source=base+"/source", raw=base+"/raw/piazza-maggiore";
const url="https://download.geofabrik.de/europe/italy/nord-est-261117.osm.pbf";
const pbf=source+"/nord-est-261117.osm.pbf", cut=source+"/piazza-maggiore-surface.osm.pbf";
const osmium=process.env.OSMIUM || "osmium";
const osm=(args:string[]) => execFileSync(osmium,args,{maxBuffer:512*1024*1024}).toString();
const sha=(p:string)=>createHash("sha256").update(readFileSync(p)).digest("hex");
const save=(p:string,v:unknown)=>writeFileSync(p,JSON.stringify(v,null,2)+"\n");
for (const d of [source,raw,base+"/raw/dem"]) mkdirSync(d,{recursive:true});
const md5=createHash("md5").update(readFileSync(pbf)).digest("hex");
if (md5 !== readFileSync(pbf+".md5","utf8").trim().split(/\s+/)[0]) throw Error("Publisher MD5 mismatch; incomplete or changed PBF");
const previous=existsSync("docs/bologna-coverage-source.json")?JSON.parse(readFileSync("docs/bologna-coverage-source.json","utf8")):null;
if(previous){
  if(previous.source.url!==url||previous.source.sha256!==sha(pbf))throw Error("Source changed since recorded acquisition");
  if(existsSync(cut)&&previous.clipping.cutSha256!==sha(cut))throw Error("Cached clip changed since acquisition");
  if(existsSync(source+"/surface.opl")&&previous.clipping.oplSha256!==sha(source+"/surface.opl"))throw Error("Cached OPL changed since acquisition");
}
// Extended metadata can be reused only after the source hash above matches the recorded file.
const info=previous?previous.source.fileinfo:JSON.parse(osm(["fileinfo","-e","-j",pbf]));
const [s,w,n,e]=AREAS["piazza-maggiore"].bbox, margin=.02;
const bbox=[w-margin,s-margin,e+margin,n+margin];
const clipArgs=["extract","-b",bbox.join(","),"--strategy","smart","-S","types=any","-S","tags=landuse,leisure,natural,water,waterway,amenity,man_made,place,golf,area:highway,aeroway","-o",cut,pbf];
if (!existsSync(cut)) osm(clipArgs);
// All way references must resolve. Optional route relation members need not be complete.
const referenceCheck=osm(["check-refs",cut]);
const oplFile=source+"/surface.opl";
if (!existsSync(oplFile)) writeFileSync(oplFile,osm(["cat",cut,"-f","opl,add_metadata=false"]));
type Tags=Record<string,string>;
type Member={type:string;ref:number;role:string};
type Element={type:"node"|"way"|"relation";id:number;tags:Tags;lat?:number;lon?:number;nodes?:number[];geometry?:{lat:number;lon:number}[];members?:Member[]};
const unesc=(s:string)=>s.replace(/%([a-fA-F0-9]+)%/g,(_,h)=>String.fromCodePoint(parseInt(h,16)));
const nodes=new Map<number,Element>(), ways=new Map<number,Element>(), relations=new Map<number,Element>();
for(const line of readFileSync(oplFile,"utf8").split("\n")) {
  if(!line)continue;
  const parts=line.split(" "), f=Object.fromEntries(parts.slice(1).map(p=>[p[0],p.slice(1)]));
  const id=Number(parts[0].slice(1)), tags:Tags={};
  for(const kv of f.T?.split(",") ?? []) {if(!kv)continue; const i=kv.indexOf("=");if(i<1)throw Error("Malformed OPL tag");tags[unesc(kv.slice(0,i))]=unesc(kv.slice(i+1));}
  if(parts[0][0]==="n") {
    const lat=Number(f.y),lon=Number(f.x);
    if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)throw Error(`Invalid node location ${id}`);
    nodes.set(id,{type:"node",id,tags,lat,lon});
  } else if(parts[0][0]==="w") {
    const refs=(f.N?f.N.split(","):[]).map(r=>{if(!/^n\d+$/.test(r))throw Error("Malformed way reference");return Number(r.slice(1));});
    const geometry=refs.map(ref=>{const p=nodes.get(ref);if(!p)throw Error(`Missing way node ${ref}`);return {lat:p.lat!,lon:p.lon!};});
    ways.set(id,{type:"way",id,tags,nodes:refs,geometry});
  } else if(parts[0][0]==="r") {
    const members=(f.M?f.M.split(","):[]).map(r=>{const m=/^([nwr])(\d+)@(.*)$/.exec(r);if(!m)throw Error("Malformed relation member");return {type:({n:"node",w:"way",r:"relation"})[m[1]]!,ref:Number(m[2]),role:unesc(m[3])};});
    relations.set(id,{type:"relation",id,tags,members});
  } else throw Error("Unknown OPL element");
}
const inBox=(p:{lat?:number;lon?:number})=>p.lat!>=bbox[1]&&p.lat!<=bbox[3]&&p.lon!>=bbox[0]&&p.lon!<=bbox[2];
const touches=(el:Element):boolean=>el.type==="node"?inBox(el):el.type==="way"?!!el.geometry?.some(inBox):!!el.members?.some(m=>m.type==="way"&&ways.get(m.ref)?.geometry?.some(inBox)||m.type==="node"&&nodes.has(m.ref)&&inBox(nodes.get(m.ref)!));
const selected=[...nodes.values(),...ways.values(),...relations.values()].filter(el=>touches(el)&&FILTERS.ground(el.type,el.tags));
const serialize=(el:Element)=>{
  if(el.type==="way"&&!(el.geometry!.length>=2))throw Error(`Invalid required surface way ${el.id}`);
  if(el.type!=="relation")return el;
  return {...el,members:el.members!.map(m=>{
    if(m.type==="way"){const q=ways.get(m.ref);if(!q||!q.geometry?.length)throw Error(`Required surface relation ${el.id} missing way ${m.ref}`);return {...m,geometry:q.geometry};}
    if(m.type==="node"){const q=nodes.get(m.ref);if(!q)throw Error(`Required surface relation ${el.id} missing node ${m.ref}`);return {...m,lat:q.lat,lon:q.lon};}
    // Existing ground.ts has no nested-relation geometry support: fail rather than call it complete.
    throw Error(`Required surface relation ${el.id} contains unsupported nested relation ${m.ref}`);
  })};
};
const elements=selected.map(serialize);
const categoryPredicates:Record<string,(e:Element)=>boolean>={
  highways:e=>e.type==="way"&&!!e.tags.highway&&!/yes|building_passage/.test(e.tags.tunnel??""),
  areaHighway:e=>e.type==="way"&&!!e.tags["area:highway"],
  surfaceRail:e=>e.type==="way"&&/^(rail|light_rail|tram)$/.test(e.tags.railway??"")&&e.tags.tunnel!=="yes",
  landuse:e=>!!e.tags.landuse,
  leisure:e=>/^(park|garden|pitch|playground|stadium|track|golf_course|swimming_pool|dog_park|nature_reserve|recreation_ground|marina|sports_centre)$/.test(e.tags.leisure??""),
  natural:e=>/^(water|beach|sand|scrub|grassland|wood|wetland|coastline|bare_rock|heath)$/.test(e.tags.natural??""),
  water:e=>!!e.tags.water||e.tags.waterway==="riverbank"||e.tags.natural==="water",
  amenities:e=>/^(parking|school|university|college|hospital|grave_yard)$/.test(e.tags.amenity??""),
  manMade:e=>/^(pier|breakwater|groyne|bridge)$/.test(e.tags.man_made??""),
  squares:e=>e.tags.place==="square",
  golf:e=>/^(bunker|green|tee|fairway|driving_range|rough)$/.test(e.tags.golf??""),
  aeroway:e=>e.type==="way"&&/^(runway|taxiway|apron|helipad)$/.test(e.tags.aeroway??""),
};
const all=[...nodes.values(),...ways.values(),...relations.values()].filter(touches);
const old=JSON.parse(readFileSync("data/raw/piazza-maggiore/ground.json","utf8")).elements;
const selectedIds=new Set(selected.map(el=>el.type+el.id));
const missingBaseline=old.filter((el:Element)=>!selectedIds.has(el.type+el.id));
if(missingBaseline.length)throw Error(`Missing ${missingBaseline.length} baseline surface IDs; review source/scope change`);
const categories=Object.fromEntries(Object.entries(categoryPredicates).map(([name,predicate])=>{
  const source=all.filter(predicate),parsed=selected.filter(predicate),before=old.filter(predicate);
  if(source.length!==parsed.length)throw Error(`Category lost in selection: ${name}`);
  return [name,{status:source.length?"acquired-and-parsed":"acquired-empty",source:source.length,parsed:parsed.length,before:before.length,byType:Object.fromEntries(["node","way","relation"].map(t=>[t,parsed.filter(e=>e.type===t).length])),emptyReason:source.length?undefined:"No matching elements in successfully decoded local clip within bbox; not a failed download"}];
}));
for(const key of ["highways","landuse","leisure","natural","water","squares","amenities"])if(!categories[key].source)throw Error(`Unexpected empty required Bologna category: ${key}`);
// Never replace a prior acquisition or experiment input implicitly.
const ground=raw+"/ground.json", bytes=JSON.stringify({elements});
if(existsSync(ground)&&readFileSync(ground,"utf8")!==bytes)throw Error("Different ground.json already exists in isolated root; choose a fresh run");
if(!existsSync(ground))writeFileSync(ground,bytes,{flag:"wx"});
for(const file of ["osm.json","roads.json"]){const to=raw+"/"+file,from="data/raw/piazza-maggiore/"+file;if(!existsSync(to))copyFileSync(from,to,constants.COPYFILE_EXCL);if(sha(from)!==sha(to))throw Error(`Baseline input changed: ${file}`);}
const dem="Copernicus_DSM_COG_10_N44_00_E011_00_DEM.tif";
const to=base+"/raw/dem/"+dem,from="data/raw/dem/"+dem;
if(!existsSync(to))copyFileSync(from,to,constants.COPYFILE_EXCL);
if(sha(from)!==sha(to))throw Error("DEM copy differs");
const routeRelations=[...relations.values()].filter(e=>/^(train|light_rail|subway|tram)$/.test(e.tags.route??""));
const report={complete:true,source:{url,downloadedAt:new Date(statSync(pbf).mtimeMs).toISOString(),httpDate:readFileSync(source+"/download.headers","utf8").match(/^date:\s*(.*)$/im)?.[1],bytes:statSync(pbf).size,sha256:sha(pbf),publisherMd5:md5,license:"ODbL 1.0",credit:"© OpenStreetMap contributors",provenance:"https://download.geofabrik.de/europe/italy/nord-est.html",fileinfo:info},clipping:{bboxLonLat:bbox,marginDeg:margin,command:[osmium,...clipArgs],tool:osm(["--version"]),referenceCheck,cutSha256:sha(cut),oplSha256:sha(oplFile),method:"Smart whole ways and complete surface-tagged relations; select objects with node/member vertices in bbox, matching Overpass bbox semantics; no geometry truncation"},counts:{nodes:nodes.size,ways:ways.size,relations:relations.size,selected:elements.length,before:old.length,retainedBaseline:old.length-missingBaseline.length,missingBaseline:missingBaseline.length},categories,ground:{path:ground,sha256:sha(ground)},baselineInputs:{osm:sha(raw+"/osm.json"),roads:sha(raw+"/roads.json"),dem:sha(to)},optionalRailRoutes:{status:"not-acquired-for-animation",partialRelationsInClip:routeRelations.length,reason:"Geographic clip contains incomplete long-distance route membership; not emitted as complete rails.json. Surface rail ways acquired independently."}};
save("docs/bologna-coverage-source.json",report);
console.log(JSON.stringify({selected:elements.length,categories},null,2));
