/** Bounded procedural roof hypotheses, derived from actual partitions; no measured ridge claims. */
import { ShapeUtils, Vector2 } from "three";
import { area, bounds, inPolygon, intersect, type Point, type Polygon } from "./bologna-geometry.ts";
import { footprintFrame } from "./bologna-architecture-frame.ts";
import type { PorticoPlan, RoofPlan } from "./bologna-metadata.ts";
export function triangulate(poly:Polygon){
  const rings=poly.map(r=>r.slice(0,-1)),points=rings.flat();
  return ShapeUtils.triangulateShape(rings[0].map(p=>new Vector2(...p)),rings.slice(1).map(r=>r.map(p=>new Vector2(...p)))).map(t=>t.map(i=>points[i]));
}
function distanceToBoundary(p:Point,poly:Polygon){
  let d=Infinity;for(const ring of poly)for(let i=0;i<ring.length-1;i++){const a=ring[i],b=ring[i+1],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)));d=Math.min(d,Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy));}return d;
}
export function buildRoof(poly:Polygon,method:RoofPlan["method"],upliftM:number,explicitLandmark=false):RoofPlan {
  if(!Number.isFinite(upliftM)||upliftM<0||upliftM>3.5)throw Error("Estimated roof uplift must be bounded 0–3.5 m");
  const frame=footprintFrame(poly),b=bounds(poly),triangles:number[]=[],upperWalls:number[]=[];
  let reason="Pinned source footprint, estimated uplift above relative eave";
  if(method!=="flat"&&!explicitLandmark&&(poly.length>1||frame.coverage<.995)){method="flat";upliftM=0;reason="Complex/concave/courtyard ordinary footprint: flat fallback";}
  const emit=(p:Polygon,height:(p:Point)=>number)=>{for(const tri of triangulate(p))for(const q of tri)triangles.push(q[0],q[1],height(q));};
  if(method==="flat"){upliftM=0;emit(poly,()=>0);}
  else if(method==="gable-estimate"){
    if(poly.length>1||frame.coverage<.95) return buildRoof(poly,"flat",0);
    const mid=(frame.loV+frame.hiV)/2,half=frame.width/2;
    const h=(p:Point)=>upliftM*Math.max(0,1-Math.abs(p[0]*frame.v[0]+p[1]*frame.v[1]-mid)/half);
    const point=(u:number,v:number):Point=>[frame.u[0]*u+frame.v[0]*v,frame.u[1]*u+frame.v[1]*v];
    for(const [lo,hi]of [[frame.loV-.1,mid],[mid,frame.hiV+.1]]){
      const clip:Polygon=[[point(frame.loU-.1,lo),point(frame.hiU+.1,lo),point(frame.hiU+.1,hi),point(frame.loU-.1,hi),point(frame.loU-.1,lo)]];
      for(const p of intersect(poly,clip))emit(p,h);
    }
    // Split end edges at ridge crossings so raised gables have no unclosed vertical gap.
    for(const ring of poly)for(let i=0;i<ring.length-1;i++){
      const a=ring[i],c=ring[i+1],av=a[0]*frame.v[0]+a[1]*frame.v[1]-mid,cv=c[0]*frame.v[0]+c[1]*frame.v[1]-mid,points=[a];
      if(av*cv<0){const t=av/(av-cv);points.push([a[0]+t*(c[0]-a[0]),a[1]+t*(c[1]-a[1])]);}points.push(c);
      for(let k=0;k<points.length-1;k++){const p=points[k],q=points[k+1];for(const v of [[p[0],p[1],0],[q[0],q[1],0],[q[0],q[1],h(q)],[p[0],p[1],0],[q[0],q[1],h(q)],[p[0],p[1],h(p)]])upperWalls.push(...v);}
    }
  }else if(method==="hipped-estimate"){
    const point=(u:number,v:number):Point=>[frame.u[0]*u+frame.v[0]*v,frame.u[1]*u+frame.v[1]*v];
    const {loU:a,hiU:b,loV:c,hiV:d}=frame,mid=(c+d)/2,r=frame.width/2;
    const A=point(a,c),B=point(b,c),C=point(b,d),D=point(a,d),R0=point(a+r,mid),R1=point(b-r,mid);
    const h=(p:Point)=>{const u=p[0]*frame.u[0]+p[1]*frame.u[1],v=p[0]*frame.v[0]+p[1]*frame.v[1];return upliftM*Math.max(0,Math.min(1,(u-a)/r,(b-u)/r,(v-c)/r,(d-v)/r));};
    for(const face of [[A,B,R1,R0],[B,C,R1],[C,D,R0,R1],[D,A,R0]])for(const part of intersect(poly,[[...face,face[0]]]))emit(part,h);
  }else{
    // A conforming world grid gives adjacent cells identical boundary vertices. Complex explicit
    // palace partitions use multiple boundary-distance ridges, never one guessed axis over a concavity.
    const ramp=4;
    const h=(p:Point)=>upliftM*Math.min(1,distanceToBoundary(p,poly)/ramp),step=2;
    for(let x=Math.floor(b[0]/step)*step;x<b[2];x+=step)for(let y=Math.floor(b[1]/step)*step;y<b[3];y+=step){
      const cell:Polygon=[[[x,y],[x+step,y],[x+step,y+step],[x,y+step],[x,y]]];
      for(const p of intersect(poly,cell))if(area([p])>.0001)emit(p,h);
    }
    if(method==="segmented-hip-estimate")reason="Explicit palace partition: bounded 2 m grid boundary-distance segmented hip; actual ridge network unknown";
  }
  return {method,estimated:true,upliftM,triangles,upperWalls,reason};
}
export function porticoPlan(candidate:any):PorticoPlan{
  if(candidate.ctcId!==21018||!candidate.insidePilot||candidate.solidOverlapM2>.01||candidate.groundSpread>.5||candidate.poly.length!==1||candidate.adjacent.length===0)throw Error("Unsafe/unverified portico candidate");
  const columns:Point[]=[],width=.35,inset=.35,ring=candidate.poly[0];
  for(let edge=0;edge<ring.length-1;edge++){
    const a=ring[edge],b=ring[edge+1],L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L<1.5)continue;
    const n=Math.max(1,Math.ceil((L-1.2)/4));
    for(let i=0;i<=n;i++){
      const t=(.6+(L-1.2)*i/n)/L,p:Point=[a[0]+t*(b[0]-a[0])-(b[1]-a[1])/L*inset,a[1]+t*(b[1]-a[1])+(b[0]-a[0])/L*inset],r=width/2;
      const foot:Polygon=[[[p[0]-r,p[1]-r],[p[0]+r,p[1]-r],[p[0]+r,p[1]+r],[p[0]-r,p[1]+r],[p[0]-r,p[1]-r]]];
      if(area(intersect(candidate.poly,foot))>=width*width*.999&&inPolygon(p,candidate.poly)&&columns.every(q=>Math.hypot(q[0]-p[0],q[1]-p[1])>1))columns.push(p);
    }
  }
  if(columns.length<6)throw Error("Portico columns do not fit the verified source polygon");
  return {id:"portico/21018",ctcId:21018,poly:candidate.poly,relativeEaveM:candidate.source.altezza_gr,beamThicknessM:.3,estimatedClearanceM:candidate.source.altezza_gr-.3,estimatedBaySpacingM:4,columnWidthM:width,columns,roofTriangles:triangulate(candidate.poly).flatMap(t=>t.flat()),adjacentSolidIds:candidate.adjacent.map((p:any)=>p.id)};
}
