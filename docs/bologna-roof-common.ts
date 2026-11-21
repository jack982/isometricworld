/** BO-006P0 isolated audit IO; no production destinations. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
export const REPO=resolve(dirname(fileURLToPath(import.meta.url)),".."),ROOT="data/bo-006p0",DOC="docs/bologna-roof-";
export interface Pin{sha256:string;bytes:number}
export const digest=(v:Buffer|string)=>createHash("sha256").update(v).digest("hex");
export function abs(p:string){const path=resolve(REPO,p);assert(path.startsWith(REPO+"/"));let at=REPO;for(const part of path.slice(REPO.length).split("/").filter(Boolean)){at+="/"+part;try{assert(!lstatSync(at).isSymbolicLink(),"SYMLINK_FORBIDDEN");}catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e;}}return path;}
export const bytes=(p:string)=>readFileSync(abs(p));
export const pin=(p:string):Pin=>{const b=bytes(p);return{sha256:digest(b),bytes:b.length};};
export const read=<T=any>(p:string):T=>JSON.parse(bytes(p).toString());
export function write(p:string,b:Buffer|string){assert(!p.split("/").includes(".."));assert(p.startsWith(ROOT+"/")||/^docs\/bologna-roof-[\w.-]+$/.test(p),"ONLY_NEW_ROOF_ARTIFACTS");const target=abs(p);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,b,{flag:"wx"});}
export const save=(p:string,v:unknown)=>write(p,JSON.stringify(v,null,2)+"\n");
export function verify(files:Record<string,Pin>){for(const[p,v]of Object.entries(files))assert.deepEqual(pin(p),v,"PRESERVATION_OR_SOURCE_HASH_MISMATCH: "+p);return Object.keys(files).length;}
export function inventory(paths:string[]){const files:Record<string,Pin>={};function visit(p:string){const s=lstatSync(abs(p));if(s.isDirectory())for(const n of readdirSync(abs(p)).sort())visit(p+"/"+n);else{assert(s.isFile());files[p]=pin(p);}}for(const p of paths)if(existsSync(abs(p)))visit(p);return files;}
export function init(){assert(process.versions.node.startsWith("24."),"NODE_24_REQUIRED");assert(!existsSync(abs(ROOT)),"FRESH_ROOT_REQUIRED");assert(!readdirSync(abs("docs")).some(f=>f.startsWith("bologna-roof-")&&!f.endsWith(".ts")),"EXISTING_ROOF_EVIDENCE_REFUSE_OVERWRITE");const old=read("docs/bologna-paint-offline-inventory.json"),handoff=read("docs/bologna-paint-offline-checksums.json");verify(old.protectedFiles);verify(handoff.files);const files={...old.protectedFiles,...handoff.files,...inventory(["pipeline/src","pipeline/page","web/src","README.md","AGENTS.md","ATTRIBUTION.md","package.json","package-lock.json","docs/bologna-paint-offline-checksums.json"])};mkdirSync(abs(ROOT));save(ROOT+"/preservation.json",{files,oldProtected:Object.keys(old.protectedFiles).length,offlineHandoff:Object.keys(handoff.files).length,createdAt:new Date().toISOString(),node:process.version});console.log(JSON.stringify({preserved:Object.keys(files).length,oldProtected:Object.keys(old.protectedFiles).length,offlineHandoff:Object.keys(handoff.files).length}));}
