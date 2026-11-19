/** Metadata-driven mesh hook. No region switch, asset fetch, or changes to the generic/LoD2 material. */
import * as THREE from "three";
import type { BuildingMetadata, PorticoPlan } from "../src/bologna-metadata.ts";
type P=[number,number];type V=[number,number,number];
export function architectureBuffers(){return {position:[] as number[],normal:[] as number[],color:[] as number[],facade:[] as number[],kind:[] as number[]};}
type Buffers=ReturnType<typeof architectureBuffers>;
const BRICK=[.65,.34,.24],PLASTER=[.83,.73,.58],STONE=[.74,.69,.60],TILE=[.62,.28,.16];
function triangle(out:Buffers,points:V[],color:number[],kind:number,facade?:number[][]){
  const [a,b,c]=points,ab=new THREE.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]),ac=new THREE.Vector3(c[0]-a[0],c[1]-a[1],c[2]-a[2]),n=ab.cross(ac);
  if(n.lengthSq()<1e-12)return;n.normalize();
  for(let i=0;i<3;i++){out.position.push(...points[i]);out.normal.push(n.x,n.y,n.z);out.color.push(...color);out.facade.push(...(facade?.[i]??[0,-1000]));out.kind.push(kind);}
}
function wall(out:Buffers,a:P,b:P,bottom:number,top:number,color:number[],kind:number,along:number){
  const L=Math.hypot(b[0]-a[0],b[1]-a[1]),vs:V[]=[[...a,bottom],[...b,bottom],[...b,top],[...a,top]],f=[[along,0],[along+L,0],[along+L,top-bottom],[along,top-bottom]];
  for(const ids of [[0,1,2],[0,2,3]])triangle(out,ids.map(i=>vs[i]),color,kind,ids.map(i=>f[i]));
}
export function appendArchitecturalBuilding(out:Buffers,ring:P[],holes:P[][],h:number,meta:BuildingMetadata,ground:(x:number,y:number)=>number){
  const spec=meta.architecture;if(meta.pilot!=="bo-003"||!spec)return false;
  if(spec.sourceId!==meta.id||meta.source!=="ctc")throw Error("Architectural source identity mismatch");
  const samples=[ring,...holes].flat().map(p=>ground(...p)),eave=Math.max(...samples)+h,bottom=Math.min(...samples)-1;
  const color=spec.material==="plaster"?PLASTER:BRICK;
  let along=0;for(const r of [ring,...holes])for(let i=0;i<r.length;i++){
    const a=r[i],b=r[(i+1)%r.length],L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L<.001)continue;
    const front=spec.frontNormal&&((b[1]-a[1])*spec.frontNormal[0]-(b[0]-a[0])*spec.frontNormal[1])/L>.65;
    const kind=spec.material==="san-petronio"?(front?23:22):spec.material==="palazzo"?24:spec.material==="brick"?21:20;
    wall(out,a,b,bottom,eave,color,kind,along);along+=L;
  }
  for(let i=0;i<spec.roof.triangles.length;i+=9){const p=spec.roof.triangles.slice(i,i+9),vs:V[]=[[p[0],p[1],eave+p[2]],[p[3],p[4],eave+p[5]],[p[6],p[7],eave+p[8]]];
    if((vs[1][0]-vs[0][0])*(vs[2][1]-vs[0][1])-(vs[1][1]-vs[0][1])*(vs[2][0]-vs[0][0])<0)[vs[1],vs[2]]=[vs[2],vs[1]];triangle(out,vs,TILE,21);
  }
  for(let i=0;i<spec.roof.upperWalls.length;i+=9){const p=spec.roof.upperWalls.slice(i,i+9);triangle(out,[[p[0],p[1],eave+p[2]],[p[3],p[4],eave+p[5]],[p[6],p[7],eave+p[8]]],color,22);}
  return true;
}
export function appendPortico(out:Buffers,p:PorticoPlan,ground:(x:number,y:number)=>number){
  if(p.id!==`portico/${p.ctcId}`||p.ctcId!==21018)throw Error("Unverified portico identity");
  const ring=p.poly[0].slice(0,-1),top=Math.max(...ring.map(q=>ground(...q)))+p.relativeEaveM,bottom=top-p.beamThicknessM;
  for(let i=0;i<p.roofTriangles.length;i+=6){const a=p.roofTriangles.slice(i,i+6);triangle(out,[[a[0],a[1],top],[a[2],a[3],top],[a[4],a[5],top]],TILE,21);triangle(out,[[a[4],a[5],bottom],[a[2],a[3],bottom],[a[0],a[1],bottom]],STONE,20);}
  for(let i=0;i<ring.length;i++)wall(out,ring[i],ring[(i+1)%ring.length],bottom,top,STONE,20,0);
  for(const [x,y]of p.columns){const r=p.columnWidthM/2,foot:P[]=[[x-r,y-r],[x+r,y-r],[x+r,y+r],[x-r,y+r]],g=ground(x,y)-.15;for(let i=0;i<4;i++)wall(out,foot[i],foot[(i+1)%4],g,bottom,STONE,20,0);}
}
export function architectureMesh(out:Buffers,sun:THREE.Vector3){
  if(!out.position.length)return null;
  const geometry=new THREE.BufferGeometry();for(const [name,size]of [["position",3],["normal",3],["color",3],["facade",2],["kind",1]]as const)geometry.setAttribute(name,new THREE.Float32BufferAttribute(out[name],size));
  const material=new THREE.ShaderMaterial({
    vertexShader:`attribute vec3 color;attribute vec2 facade;attribute float kind;varying vec3 c,n,p;varying vec2 f;varying float k;void main(){c=color;n=normal;p=position;f=facade;k=kind;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`uniform vec3 sun;varying vec3 c,n,p;varying vec2 f;varying float k;void main(){vec3 color=c;float light=min(1.08,0.80+0.32*max(dot(normalize(n),sun),0.0));if(f.y>-100.0){
      if(k>22.5&&k<23.5&&f.y<12.0)color=vec3(.82,.78,.70); // estimated lower stone band on verified square-facing church fronts
      if(k<21.5||k>23.5){float bay=mod(f.x,4.1)-2.05,fy=mod(f.y,4.2);if(abs(bay)<.52&&fy>1.15&&fy<3.0)color=vec3(.24,.28,.29);if(fy<.14)color*=.94;}
      else if(k<22.5){if(mod(p.z,.32)<.025)color*=.94;}
      if(f.y<.35)color*=.88;
    }else if(normalize(n).z>.2){if(mod(p.z,.22)<.035)color*=.94;}gl_FragColor=vec4(color*light,1.0);}`,
    uniforms:{sun:{value:sun}},
  });return new THREE.Mesh(geometry,material);
}
