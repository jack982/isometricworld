/** Complete engineering handoff from actual command exits plus preservation/screenshot checks. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

const read=(p:string)=>JSON.parse(readFileSync(p,"utf8")),sha=(p:string)=>createHash("sha256").update(readFileSync(p)).digest("hex");
const pins=read("docs/bologna-viewer-inputs.json"),qa=read("docs/bologna-viewer-qa.json"),root="data/bo-005p-viewer",logs=`${root}/checks/${new Date().toISOString().replace(/[:.]/g,"-")}`;
assert(qa.automatedPassed,"Browser acceptance must pass first");assert.equal(qa.externalRequests.length,0);assert.equal(qa.failedRequests.length,0);
assert(["localhost","127.0.0.1","[::1]"].includes(new URL(qa.url).hostname),"Build checks use loopback assets only");
mkdirSync(logs,{recursive:true});
const qaFiles=["docs/bologna-viewer-browser.ts","docs/bologna-viewer-prepare.ts","docs/bologna-viewer.test.ts","docs/bologna-viewer-check.ts","docs/bologna-viewer-checksums.ts"];
const testFiles=["pipeline/src/bologna.test.ts","pipeline/src/bologna-architecture.test.ts","pipeline/src/bologna-fidelity.test.ts","docs/bologna-coverage-qa.test.ts","docs/bologna-architecture-qa.test.ts","docs/bologna-viewer.test.ts"];
const commands=[
  {name:"pipeline-typescript",exe:resolve("node_modules/.bin/tsc"),args:["--noEmit","-p","pipeline"]},
  {name:"web-typescript",exe:resolve("node_modules/.bin/tsc"),args:["--noEmit","-p","web"]},
  {name:"qa-typescript",exe:resolve("node_modules/.bin/tsc"),args:["--noEmit","--target","es2022","--module","esnext","--moduleResolution","bundler","--allowImportingTsExtensions","--strict","--skipLibCheck","--types","node",...qaFiles]},
  {name:"relevant-tests",exe:process.execPath,args:["--import","tsx","--test","--test-reporter=spec",...testFiles]},
  {name:"web-build-loopback-only",exe:"npm",args:["-w","web","run","build"],env:{LOCAL_MAP_ROOT:"",TILES_ORIGIN:qa.url.replace(/\/bologna$/,"")}},
  {name:"reject-local-override-production-build",exe:"npm",args:["-w","web","run","build"],env:{LOCAL_MAP_ROOT:resolve(root+"/web")},expectedExit:1,expectedMessage:"dev-only"},
  {name:"diff-check",exe:"git",args:["diff","--check"]},
];
const results=[];
for(const command of commands){let exitCode=0,output="";try{output=execFileSync(command.exe,command.args,{encoding:"utf8",maxBuffer:16*1024*1024,env:{...process.env,...command.env}});}catch(error){const e=error as {status?:number;stdout?:string;stderr?:string;message?:string};exitCode=e.status??1;output=(e.stdout??"")+(e.stderr??"")+(e.message??"");}
  const log=logs+"/"+command.name+".log";writeFileSync(log,output);const passed=exitCode===(command.expectedExit??0)&&(!command.expectedMessage||output.includes(command.expectedMessage));const tests=command.name==="relevant-tests"?Number(output.match(/tests\s+(\d+)/)?.[1]):undefined;
  results.push({name:command.name,status:passed?"PASS":"FAIL",command:[command.exe,...command.args],environment:command.env??{},exitCode,expectedExit:command.expectedExit??0,tests,log,logSha256:sha(log)});console.log({name:command.name,exitCode,status:passed?"PASS":"FAIL",tests});
}
for(const [p,v]of Object.entries(pins.files)as[string,{sha256:string}][])assert.equal(sha(p),v.sha256,`Baseline changed: ${p}`);
for(const s of qa.screenshots){assert.equal(sha(s.path),s.sha256);const m=await sharp(s.path).metadata();assert.equal(m.width,s.viewport.width);assert.equal(m.height,s.viewport.height);assert.equal(m.format,"png");}
for(const tile of qa.pyramid){const file=`${root}/web/regions/bologna/tiles/${tile.layer}/${tile.z}/${tile.x}/${tile.y}.avif`;assert.equal(sha(file),tile.sha256);}
for(const t of pins.tiles)for(const [layer,key]of [["render","colorSha256"],["height","heightSha256"]])assert.equal(sha(`${root}/derived/piazza-maggiore/${layer}/${t.x}_${t.y}.png`),t[key]);
const versions=Object.fromEntries(["astro","vite","openseadragon","sharp","typescript"].map(p=>[p,read(`node_modules/${p}/package.json`).version]));
const serverResponse=await fetch(qa.url);assert(serverResponse.ok);assert((await serverResponse.text()).includes('data-local-preview="true"'));
const serverDetails=existsSync(root+"/dev-server.json")?read(root+"/dev-server.json"):{};
const passed=results.every(r=>r.status==="PASS")&&results.find(r=>r.name==="relevant-tests")?.tests===38;
const engineering={status:passed?"PASS":"FAIL",node:process.version,versions,results,preservedFiles:Object.keys(pins.files).length,allBaselineHashesUnchanged:true,exportRegionFiles:readdirSync(root+"/web/regions/bologna",{recursive:true}).filter(f=>statSync(root+"/web/regions/bologna/"+f).isFile()).length,screenshotsVerified:qa.screenshots.length,pyramidFilesVerified:qa.pyramid.length,productionBuildRoutes:["/","/404","/bologna","/tel-aviv-yafo","/stuttgart"],server:{url:qa.url,...serverDetails,httpRechecked:true,keptRunning:true,stop:"kill -TERM <the PID printed by this task's start command>; verify ownership first; never astro dev stop"}};
writeFileSync("docs/bologna-viewer-engineering.json",JSON.stringify(engineering,null,2)+"\n");qa.engineering=engineering;qa.gates.gateC=passed?"PASS":"FAIL";qa.previousAttempts=[{result:"FAIL_HARNESS",reason:"Three net::ERR_ABORTED speculative preloads when closing auxiliary pages early",resolution:"Keep auxiliary pages alive until teardown; active failures still fail; expected shutdown cancellations recorded separately"}];
writeFileSync("docs/bologna-viewer-qa.json",JSON.stringify(qa,null,2)+"\n");if(!passed)process.exitCode=1;
