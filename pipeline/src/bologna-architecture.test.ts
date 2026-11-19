import { test } from "node:test";
import assert from "node:assert/strict";
import { useRegion } from "./camera.ts";
import { baselineVolumes, tuple, type Volume } from "./bologna.ts";
import { normalizeGeometry } from "./bologna-geometry.ts";
import { architectureRoot, architectureSeamGate } from "./bologna-architecture-safety.ts";
import { buildRoof, porticoPlan } from "./bologna-roofs.ts";
import { area, inPolygon, type Polygon } from "./bologna-geometry.ts";
import { footprintFrame } from "./bologna-architecture-frame.ts";
useRegion("bologna");
const ring=(x:number)=>[[x,44.493],[x+.001,44.493],[x+.001,44.494],[x,44.494],[x,44.493]];
const geometry=(r:number[][])=>r.map(([lon,lat])=>({lon,lat}));
const poly=(r:number[][])=>normalizeGeometry({type:"Polygon",coordinates:[r]}).polygons[0];
test("Gate 0: touching disjoint bbox candidates never donate landmark metadata",()=>{
  const r=ring(11.343),t=tuple({id:"x",poly:poly(r),h:13,style:1,properties:{},source:"osm",heightSource:"baseline"});
  const result=baselineVolumes([t,t],[{type:"way",id:99,tags:{building:"yes",name:"Unrelated landmark"},geometry:geometry(ring(11.342))}]);
  assert(result.every(v=>!v.properties.tags));assert(result.every(v=>v.id.startsWith("baseline/unmatched/")));assert.notEqual(result[0].id,result[1].id);
  assert.equal(baselineVolumes([t],[])[0].id,result[0].id);
});
test("Gate 0: true intersection with second complete multipart outer inherits correct identity",()=>{
  const second=ring(11.343),t=tuple({id:"x",poly:poly(second),h:13,style:1,properties:{},source:"osm",heightSource:"baseline"});
  const relation={type:"relation",id:7,tags:{building:"yes",name:"Verified multipart"},members:[{role:"outer",geometry:geometry(ring(11.32))},{role:"outer",geometry:geometry(second)}]};
  const v=baselineVolumes([t],[relation])[0];assert.equal(v.id,"relation/7");assert.equal(v.properties.tags.name,"Verified multipart");
});
test("Gate 0: metadata is opt-in, source ID checked, five-field default unchanged",()=>{
  const v:Volume={id:"ctc/17871/0/piece0",poly:poly(ring(11.343)),h:47.3,style:1,source:"ctc",heightSource:"ctc-relative-eave",properties:{codice_ogg:17871,descrizion:"Chiesa"}};
  const original=tuple(v),withId=tuple(v,true);assert.equal(original.length,5);assert.deepEqual(withId.slice(0,5),original);assert.equal(withId[5]?.id,v.id);assert.equal(withId[5]?.ctcId,17871);
  assert.throws(()=>tuple({...v,properties:{codice_ogg:999}},true),/mismatch/);
});
test("Gate 0: only the one fresh architecture root is allowed",()=>{
  assert(architectureRoot("data/bo-003-architecture",false).endsWith("data/bo-003-architecture"));
  for(const p of [undefined,"data/bo-001r","data/bo-002-buildings","data/bo-002-trees","data/bo-003-architecture/../bo-002-trees","data/bo-003-architecture-extra"])assert.throws(()=>architectureRoot(p,false));
  assert.throws(()=>architectureRoot("data/bo-003-architecture",true),/exists/);
});
test("Gate 0: seam warnings fail unless individually explained",()=>{
  assert(architectureSeamGate([{review:false}]));assert(!architectureSeamGate([{review:true}]));assert(!architectureSeamGate([{review:true,explanation:" "}]));assert(architectureSeamGate([{review:true,explanation:"Reviewed real facade discontinuity"}]));
});
const rectangle=(x:number,y:number,w:number,h:number)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]] as [number,number][];
function roofArea(t:number[]){let a=0;for(let i=0;i<t.length;i+=9)a+=Math.abs((t[i+3]-t[i])*(t[i+7]-t[i+1])-(t[i+4]-t[i+1])*(t[i+6]-t[i]))/2;return a;}
test("gable and hipped roofs cover eligible footprint with bounded estimated uplift",()=>{
  const p:Polygon=[rectangle(0,0,30,10)];
  for(const family of ["gable-estimate","hipped-estimate"]as const){const roof=buildRoof(p,family,2);assert.equal(roof.method,family);assert(Math.abs(roofArea(roof.triangles)-300)<.01);assert(roof.triangles.every(Number.isFinite));const zs=roof.triangles.filter((_,i)=>i%3===2);assert(Math.min(...zs)>=0);assert(Math.max(...zs)<=2.0001);assert(Math.max(...zs)>1.99);}
  assert(buildRoof(p,"gable-estimate",2).upperWalls.length>0);assert.throws(()=>buildRoof(p,"gable-estimate",4),/bounded/);
});
test("complex/courtyard ordinary roofs fall back flat; explicit segmented pilot preserves hole",()=>{
  const p:Polygon=[rectangle(0,0,20,20),rectangle(6,6,8,8).reverse()];
  assert.equal(buildRoof(p,"gable-estimate",2).method,"flat");const roof=buildRoof(p,"segmented-hip-estimate",2,true);
  assert(Math.abs(roofArea(roof.triangles)-area([p]))<.02);
  for(let i=0;i<roof.triangles.length;i+=9){const t=roof.triangles.slice(i,i+9),c:[number,number]=[(t[0]+t[3]+t[6])/3,(t[1]+t[4]+t[7])/3];assert(!inPolygon(c,[p[1]]));}
});
test("portico has grounded columns, source-constrained feet and positive estimated clearance",()=>{
  const p:Polygon=[rectangle(0,0,13,3)],candidate={ctcId:21018,insidePilot:true,solidOverlapM2:0,groundSpread:.1,frame:footprintFrame(p),poly:p,source:{altezza_gr:4.3,quota_pied:99999},adjacent:[{id:"ctc/36054/0/piece0"}]};
  const plan=porticoPlan(candidate);assert(plan.columns.length>=6);assert(plan.columns.every(q=>inPolygon(q,p)));assert.equal(plan.estimatedClearanceM,4);assert.equal(plan.relativeEaveM,4.3);assert.throws(()=>porticoPlan({...candidate,solidOverlapM2:1}),/Unsafe/);
});
