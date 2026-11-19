/** Oriented footprint envelope for risk audits and conservative rectangular eligibility. */
import { area, type Point, type Polygon } from "./bologna-geometry.ts";
export function footprintFrame(poly:Polygon){
  const points=poly[0].slice(0,-1);let best:any;
  for(let i=0;i<points.length;i++){
    const p=points[i],q=points[(i+1)%points.length],length=Math.hypot(q[0]-p[0],q[1]-p[1]);if(length<.01)continue;
    let u:Point=[(q[0]-p[0])/length,(q[1]-p[1])/length],v:Point=[-u[1],u[0]];
    const envelope=()=>{const a=points.map(p=>p[0]*u[0]+p[1]*u[1]),b=points.map(p=>p[0]*v[0]+p[1]*v[1]);return {loU:Math.min(...a),hiU:Math.max(...a),loV:Math.min(...b),hiV:Math.max(...b)};};
    let b=envelope();if(b.hiU-b.loU<b.hiV-b.loV){u=v;v=[-u[1],u[0]];b=envelope();}
    const L=b.hiU-b.loU,W=b.hiV-b.loV;if(!best||L*W<best.length*best.width-1e-8)best={u,v,...b,length:L,width:W};
  }
  if(!best)throw Error("No nondegenerate footprint envelope");
  return {...best,coverage:area([poly])/(best.length*best.width),holes:poly.length-1,area:area([poly])};
}
