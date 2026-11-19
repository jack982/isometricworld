import { test } from "node:test";
import assert from "node:assert/strict";
import { ShapeUtils, Vector2 } from "three";
import { useRegion } from "./camera.ts";
import { area, difference, inPolygon, normalizeGeometry, overlap, topology, type Polygon } from "./bologna-geometry.ts";
import { classification, groundSampler, municipalBuildings, municipalTrees, relativeHeight, treeClass, type Volume } from "./bologna.ts";
import { bolognaSource, municipalCredits } from "./bologna-credits.ts";
useRegion("bologna");
const rect=(x:number,y:number,w:number,h:number)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]] as [number,number][];
const geo=(coordinates:any)=>({type:"Polygon",coordinates});
const outer=rect(11.342,44.493,.002,.002),hole=rect(11.3425,44.4935,.001,.001);
test("normalization preserves courtyard holes and disjoint multiparts",()=>{
  const n=normalizeGeometry(geo([outer,hole]));assert.equal(n.error,undefined);assert.equal(n.polygons[0].length,2);
  const m=normalizeGeometry({type:"MultiPolygon",coordinates:[[outer,hole],[rect(11.35,44.5,.001,.001)]]});assert.equal(m.polygons.length,2);
  assert.equal(normalizeGeometry(geo([outer.slice(0,-1)])).error,"unclosed-or-short-ring");
});
test("self intersections, bad coordinates, invalid holes and overlapping parts quarantine",()=>{
  assert.equal(topology([[[0,0],[2,2],[0,2],[2,0],[0,0]]]),"self-intersection");
  assert.equal(normalizeGeometry(geo([[[NaN,44],[11,44],[11,45],[NaN,44]]])).error,"invalid-coordinate");
  assert.equal(topology([rect(0,0,5,5),rect(6,6,1,1)]),"hole-outside-outer");
  assert.equal(normalizeGeometry({type:"MultiPolygon",coordinates:[[outer],[outer]]}).error,"overlapping-multiparts");
});
test("relative height is independent of geoid and unknown absolute CTC datum",()=>{
  assert.deepEqual(relativeHeight({altezza_gr:12,quota_pied:999999,quota_gron:-8000}),{h:12,source:"ctc-relative-eave"});
  const v={h:13,properties:{tags:{height:"21", "building:levels":"5"}}} as Volume;
  for(const h of [0,-1,NaN,Infinity,5000])assert.equal(relativeHeight({altezza_gr:h},v).h,21);
  delete v.properties.tags.height;assert.equal(relativeHeight({altezza_gr:0},v).h,17);
  assert.equal(relativeHeight({altezza_gr:0,area_ogg:2000}).h,14);
});
test("source classifications defer canopies, porticoes, ruins and elevated links",()=>{
  for(const s of ["Portico","Tettoia/pensilina","Collegamento in quota","Edificio diroccato","Mura storiche"])assert.equal(classification(s),"deferred");
  assert.equal(classification("Chiesa"),"solid");assert.equal(classification("unknown"),"unknown");
});
test("difference preserves holes and multipart fallback without duplicate footprint area",()=>{
  const p:Polygon=[rect(0,0,10,10),rect(3,3,4,4).reverse()],other:Polygon=[rect(0,0,5,10)];
  const d=difference([p],[other]);assert.equal(area(d),42);assert.equal(overlap(p,[rect(4,4,1,1)]),0);
  assert.equal(area(difference([[rect(0,0,10,10)]],[[rect(4,-1,2,12)]])),80);
});
test("triangulation roof excludes courtyard area",()=>{
  const p=[rect(0,0,10,10).slice(0,-1),rect(3,3,4,4).slice(0,-1).reverse()];
  const verts=p.flat(),ts=ShapeUtils.triangulateShape(p[0].map(p=>new Vector2(...p)),[p[1].map(p=>new Vector2(...p))]);
  let sum=0;for(const t of ts){const [a,b,c]=t.map(i=>verts[i]);sum+=Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2;assert(!inPolygon([(a[0]+b[0]+c[0])/3,(a[1]+b[1]+c[1])/3],[p[1]]));}assert.equal(sum,84);
});
test("spatial selection intersects polygons, not centroids, and honors empty courtyard",()=>{
  const feature={geometry:geo([rect(11.329,44.493,.014,.001)]),properties:{codice_ogg:1,descrizion:"Edificio generico",altezza_gr:10}};
  const result=municipalBuildings([feature],[],[44.4932,11.3425,44.4934,11.3428],()=>80);
  assert.equal(result.report.counts.selectedRecords,1);assert(result.volumes.length);
  const no=municipalBuildings([{...feature,geometry:geo([rect(11.33,44.48,.03,.03),rect(11.335,44.485,.02,.02)])}],[],[44.494,11.343,44.49401,11.34301],()=>80);
  assert.equal(no.volumes.length,0); // Expanded selection box lies wholly in the large courtyard.
});
test("CTC/OSM reconciliation handles 1:N coverage and retains unmatched named landmark",()=>{
  const polys=[rect(11.342,44.493,.001,.001),rect(11.343,44.493,.001,.001),rect(11.346,44.493,.001,.001)];
  const osm=polys.map((r,i)=>({id:`osm/${i}`,poly:normalizeGeometry(geo([r])).polygons[0],h:13,style:1,source:"osm",heightSource:"baseline",properties:{tags:{name:i===2?"Unmatched landmark":undefined}}}));
  const r=municipalBuildings([{geometry:geo([rect(11.342,44.493,.002,.001)]),properties:{codice_ogg:1,descrizion:"Edificio generico",altezza_gr:15}}],osm,[44.4893,11.337,44.4983,11.349],()=>80);
  assert.equal(r.report.counts.oneToMany,1);assert.equal(r.report.counts.duplicatePairs,0);assert(r.report.retained.some(x=>x.name==="Unmatched landmark"));assert(r.volumes.some(v=>v.source==="ctc"&&v.h===15));
});
test("terrain sampler interpolates and diagnoses relative placement",()=>{
  const g=groundSampler({x0:0,y0:0,nx:2,ny:2,step:10},new Float32Array([0,10,20,30]));assert.equal(g(5,5),15);assert.equal(g(0,0),0);
});
test("N:1 municipal volumes replace a single coarse OSM box without overlap",()=>{
  const osm:Volume={id:"osm/complex",poly:normalizeGeometry(geo([outer])).polygons[0],h:13,style:1,properties:{tags:{}},source:"osm",heightSource:"baseline"};
  const fs=[rect(11.342,44.493,.001,.002),rect(11.343,44.493,.001,.002)].map((r,i)=>({geometry:geo([r]),properties:{codice_ogg:i,descrizion:"Edificio generico",altezza_gr:15+i*5}}));
  const r=municipalBuildings(fs,[osm],[44.4893,11.337,44.4983,11.349],()=>80);
  assert.equal(r.report.counts.manyToOne,1);assert.equal(r.report.counts.duplicatePairs,0);assert.equal(r.report.counts.osmResidualParts,0);
});
test("pre-existing duplicated OSM fallback masses are reconciled",()=>{
  const v:Volume={id:"a",poly:normalizeGeometry(geo([outer])).polygons[0],h:13,style:1,properties:{tags:{}},source:"osm",heightSource:"baseline"};
  const r=municipalBuildings([],[v,{...v,id:"b"}],[44.4893,11.337,44.4983,11.349],()=>80);
  assert.equal(r.volumes.length,1);assert.equal(r.report.counts.duplicatePairs,0);assert.equal(r.report.osmOverlapCorrections.length,1);
});
test("outer-only OSM fallback cannot refill a municipal courtyard",()=>{
  const poly=normalizeGeometry(geo([outer])).polygons[0];
  const osm:Volume={id:"osm/outer-only",poly,h:13,style:1,properties:{tags:{}},source:"osm",heightSource:"baseline"};
  const r=municipalBuildings([{geometry:geo([outer,hole]),properties:{codice_ogg:1,descrizion:"Edificio generico",altezza_gr:15}}],[osm],[44.4893,11.337,44.4983,11.349],()=>80);
  assert.equal(r.report.counts.osmResidualParts,0);assert(r.report.courtyardExclusions.length);assert.equal(r.volumes[0].poly.length,2);
});
test("trees retain provenance, use labelled classes and 3 m OSM deduplication",()=>{
  assert.equal(treeClass("Cl1: <6mt").source,"low-class-default-estimate");
  assert.equal(treeClass("Cl2: 6mt - 12mt").h,9);assert.equal(treeClass("Cl5: >23mt").source,"open-ended-class-estimate");assert.equal(treeClass(null).source,"missing-class-default");
  const point={type:"Point",coordinates:[11.343,44.4938]},features=[{geometry:point,properties:{num_pt:"a",classe:"Species",cl_h:"Cl2: 6mt - 12mt",data_agg:"2005-01-01"}}];
  const r=municipalTrees(features,[[0,0,3,6],[100,100,3,6]],[44.4893,11.337,44.4983,11.349]);assert.equal(r.report.osmMatched,1);assert.equal(r.report.osmRetained,1);assert.equal(r.report.points[0].properties.data_agg,"2005-01-01");
});
test("source switching and credits are conditional and region constrained",()=>{
  assert.equal(bolognaSource("bologna","osm"),"osm");assert.throws(()=>bolognaSource("stuttgart","ctc"));assert.throws(()=>bolognaSource("bologna","tlv"));
  assert.deepEqual(municipalCredits("osm"),[]);assert(municipalCredits("ctc").join(" ").includes("CC BY 4.0"));assert(municipalCredits("ctc-trees").join(" ").includes("Settore Ambiente e Verde"));
});
