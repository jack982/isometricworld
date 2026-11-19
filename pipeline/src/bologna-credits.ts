import { REGIONS } from "./places.ts";
export type BolognaSource="osm"|"ctc"|"ctc-trees";
export function bolognaSource(region:string,mode:string):BolognaSource{
  if(region!=="bologna"||!["osm","ctc","ctc-trees"].includes(mode))throw Error("Bologna adapter requires region bologna and source osm, ctc or ctc-trees");
  return mode as BolognaSource;
}
export function municipalCredits(mode:BolognaSource){return mode==="osm"?[]:[...(REGIONS.bologna.creditsBySource?.ctc??[]),...(mode==="ctc-trees"?REGIONS.bologna.creditsBySource?.trees??[]:[])];}
