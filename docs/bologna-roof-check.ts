/** Fixed local checks, no acquisition, provider or live painter. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { abs, digest, read, REPO, ROOT, save, verify, write } from "./bologna-roof-common.ts";
assert(process.versions.node.startsWith("24."));const dir=ROOT+"/checks/"+new Date().toISOString().replaceAll(":","-");
const excluded=["new manifest and staged references validate; dry-run cannot start Codex","new execution validates without changing or reopening prior evidence"];
const sources=readdirSync(abs("docs")).filter(n=>n.startsWith("bologna-roof-")&&n.endsWith(".ts")).map(n=>"docs/"+n);
const tests=["pipeline/src/bologna.test.ts","pipeline/src/bologna-architecture.test.ts","pipeline/src/bologna-fidelity.test.ts","docs/bologna-coverage-qa.test.ts","docs/bologna-architecture-qa.test.ts","docs/bologna-viewer.test.ts","docs/bologna-paint.test.ts","docs/bologna-paint-api.test.ts","docs/bologna-paint-codex.test.ts","docs/bologna-paint-codex-recovery.test.ts","docs/bologna-paint-offline-qa.test.ts","docs/bologna-roof-qa.test.ts"];
const commands:[string,string,string[]][]=[
 ["pipeline-typescript","node_modules/.bin/tsc",["--noEmit","-p","pipeline"]],
 ["web-typescript","node_modules/.bin/tsc",["--noEmit","-p","web"]],
 ["benchmark-typescript","node_modules/.bin/tsc",["--noEmit","--target","es2022","--module","esnext","--moduleResolution","bundler","--allowImportingTsExtensions","--strict","--skipLibCheck","--types","node",...sources]],
 ["regressions-and-roof-fixtures",process.execPath,["--import","tsx","--test","--test-reporter=spec","--test-skip-pattern=^("+excluded.join("|")+")$",...tests]],
 ["read-only-evidence-verification",process.execPath,["--experimental-transform-types","--permission","--allow-fs-read="+REPO,"--allow-addons","docs/bologna-roof-verify.ts"]],
 ["diff-check","git",["diff","--check"]]
];const results=[];for(const[name,exe,args]of commands){const r=spawnSync(exe,args,{cwd:REPO,encoding:"utf8",timeout:180000,maxBuffer:2**22}),log=(r.stdout??"")+(r.stderr??"");write(dir+"/"+name+".log",log);const count=name==="regressions-and-roof-fixtures"?Number(/\btests\s+(\d+)/.exec(log)?.[1]??0):null;const status=r.status===0&&(count===null||count>=162)?"PASS":"FAIL";results.push({name,status,exitCode:r.status,tests:count,command:[exe,...args],log:dir+"/"+name+".log",logSha256:digest(log)});console.log(name,status,count??"");}
save("docs/bologna-roof-checks-final.json",{results,excludedConsumedRootTests:excluded,exclusionReason:"Original and recovery attempts have both been consumed; immutable old positive unused-root tests do not apply, while negative reuse tests remain selected.",protectedPreviousFiles:verify(read(ROOT+"/preservation.json").files),providerRequests:0});assert(results.every(r=>r.status==="PASS"),"READ_RETAINED_CHECK_LOGS");
