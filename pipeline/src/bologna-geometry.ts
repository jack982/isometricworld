/** Bologna adapter geometry, in local ENU metres. No mutation/repair of invalid source rings. */
import pc from "polygon-clipping";
import { ecefToEnu, llhToEcef } from "./camera.ts";
export type Point = [number, number];
export type Polygon = Point[][];
export type MultiPolygon = Polygon[];
export const signedArea=(r:Point[])=>r.reduce((s,p,i)=>{const q=r[(i+1)%r.length];return s+p[0]*q[1]-q[0]*p[1];},0)/2;
export const area=(mp:MultiPolygon)=>mp.reduce((s,p)=>s+Math.abs(signedArea(p[0]))-p.slice(1).reduce((s,r)=>s+Math.abs(signedArea(r)),0),0);
export const bounds=(p:Polygon)=>{const r=p.flat();return [Math.min(...r.map(p=>p[0])),Math.min(...r.map(p=>p[1])),Math.max(...r.map(p=>p[0])),Math.max(...r.map(p=>p[1]))];};
export const bboxOverlaps=(a:number[],b:number[])=>a[0]<=b[2]&&a[2]>=b[0]&&a[1]<=b[3]&&a[3]>=b[1];
const cross=(a:Point,b:Point,c:Point)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function on(a:Point,b:Point,c:Point){return Math.abs(cross(a,b,c))<1e-7&&c[0]>=Math.min(a[0],b[0])-1e-7&&c[0]<=Math.max(a[0],b[0])+1e-7&&c[1]>=Math.min(a[1],b[1])-1e-7&&c[1]<=Math.max(a[1],b[1])+1e-7;}
function intersects(a:Point,b:Point,c:Point,d:Point){return cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0||on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b);}
export function inside(p:Point,r:Point[]){let yes=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
export const inPolygon=(p:Point,poly:Polygon)=>inside(p,poly[0])&&!poly.slice(1).some(r=>inside(p,r));
export function topology(poly:Polygon):string|null {
  if(!poly.length)return "empty-polygon";
  for(const r of poly){
    if(r.length<4||r[0][0]!==r.at(-1)![0]||r[0][1]!==r.at(-1)![1])return "unclosed-or-short-ring";
    for(let i=0;i<r.length-1;i++){
      if(r[i][0]===r[i+1][0]&&r[i][1]===r[i+1][1])return "duplicate-adjacent-vertex";
      for(let j=i+1;j<r.length-1;j++)if(j!==i+1&&!(i===0&&j===r.length-2)&&intersects(r[i],r[i+1],r[j],r[j+1]))return "self-intersection";
    }
    if(Math.abs(signedArea(r))<.01)return "degenerate-ring";
  }
  for(let k=1;k<poly.length;k++){
    if(!inside(poly[k][0],poly[0]))return "hole-outside-outer";
    for(let l=0;l<k;l++){
      for(let i=0;i<poly[k].length-1;i++)for(let j=0;j<poly[l].length-1;j++)if(intersects(poly[k][i],poly[k][i+1],poly[l][j],poly[l][j+1]))return "rings-touch-or-cross";
      if(l>0&&(inside(poly[k][0],poly[l])||inside(poly[l][0],poly[k])))return "overlapping-holes";
    }
  }
  return null;
}
export function normalizeGeometry(geometry:any):{polygons:MultiPolygon;error?:string}{
  const source=geometry?.type==="Polygon"?[geometry.coordinates]:geometry?.type==="MultiPolygon"?geometry.coordinates:null;
  if(!Array.isArray(source)||!source.length)return {polygons:[],error:"unsupported-geometry"};
  const polygons:MultiPolygon=[];
  for(const p of source){
    if(!Array.isArray(p)||!p.length)return {polygons:[],error:"empty-polygon"};
    const poly:Polygon=[];
    for(let i=0;i<p.length;i++){
      if(!Array.isArray(p[i])||p[i].some((q:any)=>!Array.isArray(q)||!Number.isFinite(q[0])||!Number.isFinite(q[1])||Math.abs(q[0])>180||Math.abs(q[1])>90))return {polygons:[],error:"invalid-coordinate"};
      const ring:Point[]=p[i].map(([lon,lat]:number[])=>{const q=ecefToEnu(llhToEcef(lat,lon,0));return [Math.round(q[0]*1000)/1000,Math.round(q[1]*1000)/1000];});
      poly.push(ring);
    }
    const error=topology(poly);if(error)return {polygons:[],error};
    for(let i=0;i<poly.length;i++)if((signedArea(poly[i])>0)!==(i===0))poly[i].reverse();
    polygons.push(poly);
  }
  for(let i=0;i<polygons.length;i++)for(let j=0;j<i;j++)if(overlap(polygons[i],polygons[j])>.01)return {polygons:[],error:"overlapping-multiparts"};
  return {polygons};
}
// Quantize boolean inputs to a 1 mm grid, far below the stated 54 cm survey tolerance.
// This avoids coincident-edge sweep failures caused by ECEF floating-point noise.
const snap=(p:Polygon):Polygon=>p.map(r=>r.map(([x,y])=>[Math.round(x*1000)/1000,Math.round(y*1000)/1000]));
export function overlap(a:Polygon,b:Polygon){return bboxOverlaps(bounds(a),bounds(b))?area(pc.intersection(snap(a),snap(b))):0;}
export const difference=(a:MultiPolygon,b:MultiPolygon):MultiPolygon=>b.length?pc.difference(a.map(snap),...b.map(snap)):a;
export const intersect=(a:Polygon,b:Polygon):MultiPolygon=>pc.intersection(snap(a),snap(b));
/** Spatial index over complete footprint bboxes; deduplicates objects spanning several cells. */
export class Index<T extends {poly:Polygon}>{
  cells=new Map<string,T[]>();
  constructor(public step=50){}
  keys(p:Polygon){const b=bounds(p),out:string[]=[];for(let x=Math.floor(b[0]/this.step);x<=Math.floor(b[2]/this.step);x++)for(let y=Math.floor(b[1]/this.step);y<=Math.floor(b[3]/this.step);y++)out.push(`${x},${y}`);return out;}
  add(v:T){for(const k of this.keys(v.poly)){if(!this.cells.has(k))this.cells.set(k,[]);this.cells.get(k)!.push(v);}}
  query(p:Polygon){return [...new Set(this.keys(p).flatMap(k=>this.cells.get(k)??[]))].filter(v=>bboxOverlaps(bounds(v.poly),bounds(p)));}
}
export function boxPolygon([s,w,n,e]:number[]):Polygon{return [[...[[w,s],[e,s],[e,n],[w,n],[w,s]].map(([lon,lat])=>{const q=ecefToEnu(llhToEcef(lat,lon,0));return [q[0],q[1]] as Point;})]];}
