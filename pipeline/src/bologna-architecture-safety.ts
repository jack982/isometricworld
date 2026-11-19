import { resolve } from "node:path";
/** This pilot has exactly one allowed destination; no prefix-based baseline bypasses. */
export function architectureRoot(root:string|undefined,alreadyExists:boolean){
  if(!root||resolve(root)!==resolve("data/bo-003-architecture"))throw Error("Only data/bo-003-architecture is allowed");
  if(alreadyExists)throw Error("Architecture root exists; preserve it and stop");
  return resolve(root);
}
export function architectureSeamGate(seams:{review:boolean;explanation?:string}[]){
  return seams.every(s=>!s.review||!!s.explanation?.trim());
}
