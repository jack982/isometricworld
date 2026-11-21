/** BO-004S-D: explicit offline diagnostics; no provider/process imports or production writes. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { decision, edges, fitGlobal, globalSearch, inspectImage, localProposals, normalized, paddingEvidence, sampledCorrelation } from "./bologna-paint-offline-metrics.ts";
export const REPO=resolve(dirname(fileURLToPath(import.meta.url)),".."), ROOT="data/bo-004s-d-offline", PREFIX="docs/bologna-paint-offline-", EXEC="data/bo-004s-codex-recovery-r1/execution";
export interface Pin {sha256:string;bytes:number}
export const digest=(b:Buffer|string)=>createHash("sha256").update(b).digest("hex");
function safe(rel:string,base=REPO){const p=resolve(base,rel);assert(p.startsWith(base+"/"),"OUTSIDE_REPOSITORY");let at=base;for(const part of p.slice(base.length).split("/").filter(Boolean)){at+="/"+part;if(existsSync(at)||(()=>{try{return lstatSync(at).isSymbolicLink();}catch{return false;}})())assert(!lstatSync(at).isSymbolicLink(),"SYMLINK_FORBIDDEN");}return p;}
export function readBytes(rel:string){const p=safe(rel);assert(lstatSync(p).isFile());return readFileSync(p);}
export const pin=(p:string):Pin=>{const b=readBytes(p);return{sha256:digest(b),bytes:b.length};};
export const read=<T=any>(p:string):T=>JSON.parse(readBytes(p).toString());
export function verify(files:Record<string,Pin>){for(const [p,v]of Object.entries(files))assert.deepEqual(pin(p),v,`SOURCE_HASH_MISMATCH: ${p}`);return Object.keys(files).length;}
export function outputPath(rel:string,base=REPO){assert(!rel.split("/").some(p=>p===".."||p==="."),"TRAVERSAL_FORBIDDEN");assert(rel.startsWith(ROOT+"/")||/^docs\/bologna-paint-offline-[a-z0-9-]+\.(json|jpg|png|md|log)$/.test(rel),"PRODUCTION_WRITE_FORBIDDEN");return safe(rel,base);}
export function writeNew(rel:string,b:Buffer|string,base=REPO){const p=outputPath(rel,base);mkdirSync(dirname(p),{recursive:true});writeFileSync(p,b,{flag:"wx"});}
export const jsonNew=(p:string,v:unknown)=>writeNew(p,JSON.stringify(v,null,2)+"\n");
export function freshRoot(base=REPO){const p=safe(ROOT,base);assert(!existsSync(p),"OUTPUT_COLLISION_PRESERVE_EXISTING");mkdirSync(p);}
export function inventory(paths:string[]){const files:Record<string,Pin>={};function visit(p:string){const st=lstatSync(safe(p));if(st.isDirectory())for(const n of readdirSync(safe(p)).sort())visit(p+"/"+n);else{assert(st.isFile());files[p]=pin(p);}}for(const p of paths)visit(p);return files;}
const out=(name:string)=>ROOT+"/diagnostics/"+name;
export const CROPS=[
 {id:"NW-flat-roofs",box:[0,0,310,300],checks:["roof-planes","building-topology"]},
 {id:"north-road",box:[260,0,270,215],checks:["roads","framing"]},
 {id:"NE-courtyard-trees",box:[470,90,330,220],checks:["courtyards","trees"]},
 {id:"central-voids",box:[190,260,350,260],checks:["courtyards","roof-planes"]},
 {id:"Accursio-tower",box:[610,270,225,230],checks:["palazzo-accursio"]},
 {id:"west-trees",box:[20,300,190,145],checks:["trees","roads"]},
 {id:"SW-blocks",box:[5,570,290,320],checks:["building-topology","roof-planes"]},
 {id:"San-Petronio",box:[295,550,560,415],checks:["san-petronio"]},
 {id:"SE-portico",box:[790,870,234,154],checks:["pilot-portico","framing"]},
];
const esc=(s:string)=>s.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll('"',"&quot;");
const credits=["Map data © OpenStreetMap contributors · Comune di Bologna – SIT / Settore Ambiente e Verde, CC BY 4.0 (modified)","© DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved","BO-003F appearance references: Zairon / Congolandia.g / Raffacossa, CC BY-SA 4.0 · Painted with AI · Diagnostic only, human acceptance pending"];
function svg(w:number,h:number,lines:string[],font=16){return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#faf7ef"/>${lines.map((s,i)=>`<text x="10" y="${(i+1)*(font+5)}" font-family="sans-serif" font-size="${font}" fill="#202020">${esc(s)}</text>`).join("")}</svg>`);}
async function panel(b:Buffer,w:number,h:number){return sharp(b).resize(w,h,{fit:"contain",background:"#eee9de"}).png().toBuffer();}
async function sheet(a:Buffer,b:Buffer,w=1024){const h=85;return sharp({create:{width:w*2,height:w+h+76,channels:3,background:"#faf7ef"}}).composite([{input:svg(w*2,h,["BO-004S-D — DIAGNOSTIC ONLY — NOT AN ACCEPTED TILE","LEFT: original procedural input | RIGHT: full-frame Lanczos3 resize of saved painting", "Coordinates inside each image: original 1024 × 1024 reference frame"]),left:0,top:0},{input:await panel(a,w,w),left:0,top:h},{input:await panel(b,w,w),left:w,top:h},{input:svg(w*2,76,credits,11),left:0,top:w+h}]).jpeg({quality:92}).toBuffer();}
async function mainRun(){
  assert(process.versions.node.startsWith("24."),"NODE_24_REQUIRED");assert(!existsSync(resolve(REPO,ROOT)),"OUTPUT_COLLISION_PRESERVE_EXISTING");
  for(const name of ["inventory.json","comparison.jpg","overlay.png","crops.jpg","qa.json","checksums.json","report.md"])assert(!existsSync(resolve(REPO,PREFIX+name)),"DOC_OUTPUT_COLLISION");
  const recovery=read("docs/bologna-paint-codex-recovery-approval.json"), baseline=read("docs/bologna-paint-input-manifest.json"), parent=read("docs/bologna-paint-codex-approval.json"), result=read(EXEC+"/result.json");
  assert.equal(recovery.work,EXEC+"/work");assert.equal(result.approvalHash,pin("docs/bologna-paint-codex-recovery-approval.json").sha256);
  assert.equal(result.rawSha256,"4edf05309116fea5e631be83bc444f3795483f53028e3fef3e3353b6975c9458");assert.equal(result.rawBytes,4393198);
  assert.deepEqual(pin(EXEC+"/raw.png"),{sha256:result.rawSha256,bytes:result.rawBytes},"AUTHORITATIVE_RAW_MISMATCH_STOP");
  assert.equal(result.status,"FAILED_NO_RETRY");assert.equal(result.qaFailure,"WRONG_OUTPUT_DIMENSIONS");assert.equal(result.registrationApplied,false);
  const validation={baseline:verify(baseline.preservation),recoveryOriginalEvidence:verify(recovery.preservation),nativePrior:verify(parent.priorFiles),staged:verify(recovery.staged),nativeHandoff:verify(read("docs/bologna-paint-codex-checksums.json").files),apiHandoff:verify(read("docs/bologna-paint-api-checksums.json").files),recoveryHandoff:verify(read("docs/bologna-paint-codex-recovery-checksums.json").files)};
  const oldDocs=readdirSync(resolve(REPO,"docs")).filter(n=>n.startsWith("bologna-paint-")&&!n.startsWith("bologna-paint-offline-")).map(n=>"docs/"+n);
  const preserved={...baseline.preservation,...inventory(["data/bo-004s-paint","data/bo-004s-codex-native","data/bo-004s-codex-recovery-r1",...oldDocs])};
  const paths={raw:EXEC+"/raw.png",input:recovery.work+"/input.png",height:recovery.work+"/height.png",style:recovery.work+"/style.png",trees:recovery.work+"/trees.png",prompt:recovery.work+"/prompt.txt",invocationPrompt:recovery.work+"/invocation-prompt.txt",result:EXEC+"/result.json",qa:EXEC+"/qa.json",journal:EXEC+"/attempt.jsonl",stdout:EXEC+"/codex.stdout.log",stderr:EXEC+"/codex.stderr.log"};
  const sourceEntries:Record<string,unknown>={};for(const [role,path]of Object.entries(paths))sourceEntries[role]={relative:path,absolute:resolve(REPO,path),...pin(path),...(path.endsWith(".png")?{metadata:await inspectImage(readBytes(path))}:{})};
  const raw=readBytes(paths.raw),input=readBytes(paths.input),rawMeta=await inspectImage(raw);assert.deepEqual([rawMeta.width,rawMeta.height],[1254,1254]);assert(rawMeta.validOpaquePng);assert.deepEqual([(sourceEntries.input as any).metadata.width,(sourceEntries.input as any).metadata.height],[1024,1024]);
  const logs=readBytes(paths.stdout).toString().split("\n").filter(Boolean).map(s=>JSON.parse(s));
  const evidence={rootCause:"UNKNOWN",summary:"Saved CLI log records a direct copy from a generated PNG and file output reports 1254 x 1254. No log evidence explains the generator size choice. No resizing by saved copy command.",events:logs.map(e=>({event:e.type,itemType:e.item?.type??null,has1254Mention:JSON.stringify(e).includes("1254"),has1024Mention:JSON.stringify(e).includes("1024")})),privateLogTextCopied:false};
  freshRoot();jsonNew(PREFIX+"inventory.json",{schema:"BO-004S-D/v1",createdAt:new Date().toISOString(),node:process.version,sourceSnapshot:"recovery-r1 exact staged inputs",sources:sourceEntries,validation,protectedFiles:preserved,originalStatus:result.status,networkRequests:0,providerRequests:0});
  const resized=await normalized(raw),pad=await paddingEvidence(raw),a=await edges(input),b=await edges(resized),global=globalSearch(a,b),proposals=localProposals(a,b);
  const fit=fitGlobal(proposals.filter(p=>p.eligible));const hypothesis={rawToInput:{scale:1024/1254,tx:0,ty:0,kernel:"lanczos3",extent:"entire raw square",diagnosticOnly:true,geographicFidelityAccepted:false},padding:pad,centerCrop:{tested:false,reason:"No constant border evidence; center crop would discard perimeter content and has no geographic extent justification"},identityEdgeCorrelation:sampledCorrelation(a,b,256),originalHeuristicThreshold:.45,originalHeuristicOnly:true,globalExploratoryFit:global,localProposals:proposals,proposedControlFit:fit,controlsAuthoritative:false,alignmentStatus:"UNCERTAIN",spatialDistribution:"25 patches, five-by-five grid; see per-patch scores, shifts and eligibility",borders:[{side:"top",box:[12,4,232,24]},{side:"bottom",box:[12,228,232,24]},{side:"left",box:[4,12,24,232]},{side:"right",box:[228,12,24,232]}].map(p=>({...p,correlation:sampledCorrelation(a,b,256,1,0,0,p.box),geographicCoverage:"UNCERTAIN: appearance edges only, not a coverage proof"})),limitations:["Texture changes dominate roof-edge measurements","Patch proposals may match repeated windows or new ridges","No local warp, crop repair or feature mask applied","Pixel-precise camera, perimeter and topology remain unverified"]};
  writeNew(out("resized-full-1024.png"),resized);jsonNew(out("raw-metadata.json"),rawMeta);jsonNew(out("alignment-hypotheses.json"),hypothesis);jsonNew(out("log-evidence.json"),evidence);
  writeNew(PREFIX+"comparison.jpg",await sheet(input,resized));
  const half=await sharp(resized).ensureAlpha(.5).png().toBuffer();const overlay=await sharp(input).composite([{input:half}]).png().toBuffer();
  writeNew(out("overlay-fixed-1024.png"),overlay);
  const marks=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">${proposals.map(p=>`<path d="M${p.source.x-5} ${p.source.y}h10 M${p.source.x} ${p.source.y-5}v10" stroke="cyan"/><text x="${p.source.x+6}" y="${p.source.y}" font-size="10" fill="black">${p.id}</text>`).join("")}</svg>`);
  writeNew(out("control-review-overlay.png"),await sharp(overlay).composite([{input:marks}]).png().toBuffer());
  writeNew(PREFIX+"overlay.png",await sharp({create:{width:1024,height:1100,channels:3,background:"#faf7ef"}}).composite([{input:overlay,left:0,top:0},{input:svg(1024,76,["50% overlay; image frame x/y = [0,1024). Diagnostic only.",...credits],8),left:0,top:1024}]).png().toBuffer());
  const cropManifest=[];const cards=[];for(let i=0;i<CROPS.length;i++){const c=CROPS[i], [left,top,width,height]=c.box,aa=await sharp(input).extract({left,top,width,height}).png().toBuffer(),bb=await sharp(resized).extract({left,top,width,height}).png().toBuffer();writeNew(out(c.id+"-input.png"),aa);writeNew(out(c.id+"-paint.png"),bb);
    const card=await sharp({create:{width:700,height:340,channels:3,background:"#faf7ef"}}).composite([{input:svg(700,60,[`${i+1}. ${c.id} | x=${left}, y=${top}, w=${width}, h=${height}`,"LEFT source | RIGHT diagnostic; proposed same framing, unapproved"],13),left:0,top:0},{input:await panel(aa,350,280),left:0,top:60},{input:await panel(bb,350,280),left:350,top:60}]).png().toBuffer();writeNew(out(c.id+"-pair.png"),card);cards.push({input:card,left:(i%2)*700,top:Math.floor(i/2)*340});cropManifest.push({...c,coordinateFrame:"original input 1024 square; painting full-frame resize hypothesis",pair:out(c.id+"-pair.png"),source:out(c.id+"-input.png"),candidate:out(c.id+"-paint.png")});}
  const ch=Math.ceil(CROPS.length/2)*340;writeNew(PREFIX+"crops.jpg",await sharp({create:{width:1400,height:ch+76,channels:3,background:"#faf7ef"}}).composite([...cards,{input:svg(1400,76,credits,9),left:0,top:ch}]).jpeg({quality:93}).toBuffer());jsonNew(out("crop-manifest.json"),cropManifest);
  jsonNew(out("measurements.json"),{hypothesis,raw:rawMeta,derivative:{...pin(out("resized-full-1024.png")),metadata:await inspectImage(resized)},evidence,crops:cropManifest,preliminary:decision(true,"UNCERTAIN","UNCERTAIN"),historicalRunStatus:"FAILED_NO_RETRY",humanAcceptance:"PENDING",providerRequests:0});verify(preserved);console.log(JSON.stringify({status:"DIAGNOSTICS_READY_FOR_OFFLINE_REVIEW",validation,protectedFiles:Object.keys(preserved).length,root:ROOT,providerRequests:0}));
}
async function finalize(){const inv=read(PREFIX+"inventory.json");verify(inv.protectedFiles);const m=read(out("measurements.json")),review=read(PREFIX+"review.json"),checks=read(PREFIX+"checks.json");assert.equal(review.humanAcceptance,"PENDING");assert(review.checks.length>=10);assert(checks.results.every((r:any)=>r.status==="PASS"));const qa={schema:"BO-004S-D/v1",...m,assessment:decision(true,review.alignment,review.topology,review.rejectBlocking??false),style:review.style,featureChecks:review.checks,reviewer:"Codex offline visual inspection; no human acceptance",humanAcceptance:"PENDING",humanGate:"HUMAN_ACCEPTANCE_REQUIRED",engineering:checks,sourceInventory:pin(PREFIX+"inventory.json"),preservation:{verifiedFiles:verify(inv.protectedFiles),originalStatus:read(EXEC+"/result.json").status},providerRequests:0,registrationApplied:false,originalQaModified:false};jsonNew(PREFIX+"qa.json",qa);console.log(JSON.stringify(qa.assessment));}
export function checkHistorical(){const inv=read(PREFIX+"inventory.json");return verify(inv.protectedFiles);}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);assert(args.length===1&&["--run","--finalize","--verify","--freeze"].includes(args[0]),"EXPLICIT_OFFLINE_ACTION_REQUIRED");
 if(args[0]==="--run")await mainRun();
 else if(args[0]==="--finalize")await finalize();
 else if(args[0]==="--verify"){const old=checkHistorical();if(existsSync(resolve(REPO,PREFIX+"checksums.json")))verify(read(PREFIX+"checksums.json").files);console.log(JSON.stringify({protectedFilesVerified:old,providerRequests:0,historicalRunStatus:read(EXEC+"/result.json").status}));}
 else{checkHistorical();const docs=readdirSync(resolve(REPO,"docs")).filter(n=>n.startsWith("bologna-paint-offline-")&&n!=="bologna-paint-offline-checksums.json").map(n=>"docs/"+n);jsonNew(PREFIX+"checksums.json",{algorithm:"sha256",files:inventory([ROOT,...docs]),providerRequests:0,historicalRunStatus:"FAILED_NO_RETRY"});}
}
