import { resolve } from "node:path";

/** Exact destination allowlist. Existing roots may only be resumed through their owned run manifest. */
export function fidelityRoot(root:string|undefined,alreadyExists:boolean,initializing=false):string {
  const allowed=[resolve("data/bo-003f-landmarks")];
  if(!root||!allowed.includes(resolve(root)))throw Error("Only data/bo-003f-landmarks is allowed");
  if(initializing&&alreadyExists)throw Error("Fidelity root exists; preserve it and stop");
  return resolve(root);
}

export const SHED_IDS=[31864,17875,45799,52776] as const;
export function assertShedIdentity(metadata:{id:string;ctcId:number|null;source:string}){
  if(metadata.source!=="ctc"||!SHED_IDS.includes(metadata.ctcId as typeof SHED_IDS[number])||metadata.id!==`ctc/${metadata.ctcId}/0/piece0`)throw Error("Unverified BO-003F shed source ID");
}

/** Reuse the BO-003 minimum overlap rule for an independently identified full source outline. */
export const conclusiveIdentity=(uniqueSemanticId:boolean,sourceCoverage:number)=>uniqueSemanticId&&Number.isFinite(sourceCoverage)&&sourceCoverage>=.8;
