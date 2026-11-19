/** Optional, provenance-bearing building channel. Default tuples and LoD2 remain independent. */
export interface BuildingMetadata {
  id: string;
  source: string;
  description: string | null;
  heightSource: string;
  ctcId: number | null;
  pilot?: "bo-003";
  architecture?: {
    sourceId:string;
    material:"plaster"|"brick"|"san-petronio"|"palazzo";
    landmark?:string;
    frontNormal?:[number,number];
    roof:RoofPlan;
  };
}
export interface RoofPlan {
  method:"flat"|"gable-estimate"|"hipped-estimate"|"segmented-hip-estimate";
  estimated:true;
  upliftM:number;
  triangles:number[]; // x,y,uplift above unchanged eave; no absolute CTC elevations
  upperWalls:number[]; // gable triangles, x,y,uplift above unchanged eave
  reason:string;
}
export interface PorticoPlan {
  id:string;ctcId:number;poly:[number,number][][];relativeEaveM:number;
  beamThicknessM:number;estimatedClearanceM:number;estimatedBaySpacingM:number;
  columnWidthM:number;columns:[number,number][];roofTriangles:number[];
  adjacentSolidIds:string[];
}
export function verifiedMetadata(v:{id:string;source:string;heightSource:string;properties:any}):BuildingMetadata{
  const ctcId=v.source==="ctc"?v.properties.codice_ogg:null;
  if(v.source==="ctc"&&(!Number.isInteger(ctcId)||!v.id.startsWith(`ctc/${ctcId}/`)))throw Error("CTC identity/provenance mismatch");
  return {id:v.id,source:v.source,description:v.properties.descrizion??null,heightSource:v.heightSource,ctcId};
}
