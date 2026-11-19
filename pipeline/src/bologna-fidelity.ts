/** BO-003F appearance-supported roof hypothesis. Source partitions and relative eaves stay fixed. */
import type { BuildingMetadata, RoofPlan } from "./bologna-metadata.ts";
import type { Point, Polygon } from "./bologna-geometry.ts";
import { footprintFrame } from "./bologna-architecture-frame.ts";
import { triangulate } from "./bologna-roofs.ts";
import { assertShedIdentity } from "./bologna-fidelity-safety.ts";

export const ROOF_REFERENCE="https://commons.wikimedia.org/wiki/File:Bologna_Torre_degli_Asinelli_Vista_su_Basilica_di_San_Petronio_2.jpg";
export function estimatedShedRoof(meta:BuildingMetadata,poly:Polygon,nave:Polygon,riseM=2):RoofPlan {
  assertShedIdentity(meta);
  if(!Number.isFinite(riseM)||riseM<=0||riseM>2)throw Error("BO-003F shed rise must be an explicit estimate in (0,2] m");
  const frame=footprintFrame(nave),across=frame.v,project=(p:Point)=>p[0]*across[0]+p[1]*across[1],values=poly[0].map(project),lo=Math.min(...values),hi=Math.max(...values),mid=(lo+hi)/2,naveMid=(frame.loV+frame.hiV)/2;
  if(hi-lo<.1||Math.abs(naveMid-mid)<.1)throw Error("Ambiguous outward shed orientation");
  const innerIsHigh=naveMid>mid,height=(p:Point)=>riseM*Math.max(0,Math.min(1,innerIsHigh?(project(p)-lo)/(hi-lo):(hi-project(p))/(hi-lo)));
  const triangles=triangulate(poly).flatMap(t=>t.flatMap(p=>[...p,height(p)])),upperWalls:number[]=[];
  for(const ring of poly)for(let i=0;i<ring.length-1;i++){
    const a=ring[i],b=ring[i+1];upperWalls.push(...a,0,...b,0,...b,height(b),...a,0,...b,height(b),...a,height(a));
  }
  return {method:"shed-estimate",estimated:true,upliftM:riseM,triangles,upperWalls,reason:"BO-003F appearance-only outward shed proposal: plane across actual partition toward source nave; rise/pitch unmeasured; "+ROOF_REFERENCE};
}
