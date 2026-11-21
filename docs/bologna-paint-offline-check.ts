/** Fixed local engineering checks. Never launches a painter, provider or production writer. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { checkHistorical, digest, jsonNew, REPO, ROOT, writeNew } from "./bologna-paint-offline-qa.ts";
assert(process.versions.node.startsWith("24."));
const dir=ROOT+"/checks/"+new Date().toISOString().replaceAll(":","-");
const excluded=["new manifest and staged references validate; dry-run cannot start Codex","new execution validates without changing or reopening prior evidence"];
const tests=["pipeline/src/bologna.test.ts","pipeline/src/bologna-architecture.test.ts","pipeline/src/bologna-fidelity.test.ts","docs/bologna-coverage-qa.test.ts","docs/bologna-architecture-qa.test.ts","docs/bologna-viewer.test.ts","docs/bologna-paint.test.ts","docs/bologna-paint-api.test.ts","docs/bologna-paint-codex.test.ts","docs/bologna-paint-codex-recovery.test.ts","docs/bologna-paint-offline-qa.test.ts"];
const scripts=["docs/bologna-paint-offline-metrics.ts","docs/bologna-paint-offline-qa.ts","docs/bologna-paint-offline-qa.test.ts","docs/bologna-paint-offline-check.ts"];
const commands:[string,string,string[]][]=[
 ["pipeline-typescript","node_modules/.bin/tsc",["--noEmit","-p","pipeline"]],
 ["web-typescript","node_modules/.bin/tsc",["--noEmit","-p","web"]],
 ["offline-typescript","node_modules/.bin/tsc",["--noEmit","--target","es2022","--module","esnext","--moduleResolution","bundler","--allowImportingTsExtensions","--strict","--skipLibCheck","--types","node",...scripts]],
 ["offline-and-regressions",process.execPath,["--import","tsx","--test","--test-reporter=spec","--test-skip-pattern=^("+excluded.join("|")+")$",...tests]],
 ["read-only-no-subprocess-preflight",process.execPath,["--permission","--allow-fs-read="+REPO,"--allow-addons","docs/bologna-paint-offline-qa.ts","--verify"]],
 ["diff-check","git",["diff","--check"]],
];
const results=[];for(const[name,exe,args]of commands){const r=spawnSync(exe,args,{cwd:REPO,encoding:"utf8",timeout:180000,maxBuffer:2**22});const log=(r.stdout??"")+(r.stderr??"");writeNew(dir+"/"+name+".log",log);const count=name==="offline-and-regressions"?Number(/\btests\s+(\d+)/.exec(log)?.[1]??0):null;const status=r.status===0&&(count===null||count>=139)?"PASS":"FAIL";results.push({name,command:[exe,...args],exitCode:r.status,status,tests:count,log:dir+"/"+name+".log",sha256:digest(log)});console.log(name,status,count??"");}
jsonNew("docs/bologna-paint-offline-checks.json",{node:process.version,results,excludedUnusedRootTests:excluded,exclusionReason:"Both live attempts have been consumed; old tests asserting unused roots are inapplicable. Original guards and test files are unchanged.",protectedFiles:checkHistorical(),providerRequests:0,networkRequests:0});assert(results.every(r=>r.status==="PASS"),"CHECKS_FAILED_SEE_RETAINED_LOGS");
