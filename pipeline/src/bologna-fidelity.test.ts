import { test } from "node:test";
import assert from "node:assert/strict";
import { Vector3 } from "three";
import { fidelityRoot, assertShedIdentity, conclusiveIdentity, SHED_IDS } from "./bologna-fidelity-safety.ts";
import { estimatedShedRoof } from "./bologna-fidelity.ts";
import { buildRoof } from "./bologna-roofs.ts";
import type { BuildingMetadata } from "./bologna-metadata.ts";
import { area, type Polygon } from "./bologna-geometry.ts";
import { appendArchitecturalBuilding, architectureBuffers } from "../page/architecture.ts";
import { neutralBuildingMaterial } from "../page/neutral.ts";
import { triangleIntersectionArea } from "../../docs/bologna-architecture-geometry-qa.ts";
import { meshClosure } from "../../docs/bologna-landmark-fidelity-geometry.ts";
const rectangle=(x:number,y:number,w:number,h:number)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]]as [number,number][];
const nave:Polygon=[rectangle(10,0,10,100)],band:Polygon=[rectangle(20,0,10,100)];
const meta=(id=31864):BuildingMetadata=>({id:`ctc/${id}/0/piece0`,ctcId:id,source:"ctc",description:"Chiesa",heightSource:"ctc-relative-eave",pilot:"bo-003"});
test("BO-003F root is an exact allowlist and refuses an existing initialization",()=>{
  assert(fidelityRoot("data/bo-003f-landmarks",false,true));assert(fidelityRoot("data/bo-003f-landmarks",true));assert.throws(()=>fidelityRoot("data/bo-003f-landmarks",true,true));
  for(const p of [undefined,"data/bo-003-architecture","data/bo-003f-landmarks-old","data/bo-002-trees","data/bo-003f-landmarks/../bo-001r"])assert.throws(()=>fidelityRoot(p,false,true));
});
test("clock body cannot become conclusive from name, proximity or a smaller matched lantern",()=>{
  assert(!conclusiveIdentity(true,.64644));assert(!conclusiveIdentity(false,1));assert(conclusiveIdentity(true,.8));assert(!conclusiveIdentity(true,NaN));
});
test("only four exact verified CTC volume IDs can opt into the shed proposal",()=>{
  for(const id of SHED_IDS)assert.doesNotThrow(()=>assertShedIdentity(meta(id)));
  for(const m of [meta(26676),{...meta(),id:"ctc/31864/0/piece1"},{...meta(),source:"osm"},{...meta(),ctcId:17871}])assert.throws(()=>assertShedIdentity(m));
  assert.throws(()=>buildRoof(band,"shed-estimate",2),/verified-ID/);
});
test("shed plane falls outward from the source nave and leaves source height inputs untouched",()=>{
  const original=structuredClone(band),roof=estimatedShedRoof(meta(),band,nave,2),heights=new Map<number,number>();
  for(let i=0;i<roof.triangles.length;i+=3)heights.set(roof.triangles[i],roof.triangles[i+2]);
  assert.equal(roof.method,"shed-estimate");assert.equal(roof.estimated,true);assert.equal(heights.get(20),2);assert.equal(heights.get(30),0);assert.deepEqual(band,original);
  for(const n of [0,-1,2.1,Infinity,NaN])assert.throws(()=>estimatedShedRoof(meta(),band,nave,n));
});
test("source footprint, courtyard holes and nonoverlapping roof triangles are preserved",()=>{
  const poly:Polygon=[rectangle(20,0,10,100),rectangle(22,20,3,10).reverse()],roof=estimatedShedRoof(meta(),poly,nave),triangles:[number,number][][]=[];let A=0;
  for(let i=0;i<roof.triangles.length;i+=9){const t=roof.triangles.slice(i,i+9),p:[number,number][]=[[t[0],t[1]],[t[3],t[4]],[t[6],t[7]]];for(const other of triangles)assert(triangleIntersectionArea(p,other)<1e-8);triangles.push(p);A+=triangleIntersectionArea(p,p);}
  assert(Math.abs(A-area([poly]))<1e-8);
});
test("shed wall/roof shell closes above buried ground and retains max-ground relative eave anchoring",()=>{
  const ground=(x:number,_y:number)=>x*.01,roof=estimatedShedRoof(meta(),band,nave),m={...meta(),architecture:{sourceId:meta().id,material:"san-petronio"as const,roof}},out=architectureBuffers();
  assert(appendArchitecturalBuilding(out,band[0].slice(0,-1),[],27.8,m,ground));assert.equal(meshClosure(out.position,-.8).openSegments.length,0);
  assert(Math.abs(Math.max(...out.position.filter((_,i)=>i%3===2))-(.3+27.8+2))<1e-8);
  assert(meshClosure(out.position.slice(9),-.8).openSegments.length>0,"Closure QA must detect a missing wall triangle");
});
test("neutral diagnostic material has no texture, facade mask or palette and shares sun direction",()=>{
  const sun=new Vector3(-.55,-.35,.76).normalize(),material=neutralBuildingMaterial(sun);assert.equal(material.uniforms.sun.value,sun);assert(!/sampler|facade|attribute vec3 color/.test(material.vertexShader+material.fragmentShader));material.dispose();
});
